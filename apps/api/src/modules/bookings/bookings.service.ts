import type {
  BookingDto,
  BookingListItemDto,
  FareBreakdown,
  PaginatedResponse,
  PassengerType,
  PayBookingResultDto,
  RefundQuoteDto,
  SeatKind,
  SliceDirection,
} from "@flysmart/contracts";
import {
  addDaysIso,
  ageOnDate,
  autoAssignSeats,
  BOOKING_HOLD_MINUTES,
  buildPageMeta,
  buildSeatMap,
  calculateRefund,
  countPassengers,
  findSeat,
  hoursBetween,
  passengerTypeForAge,
  requireAircraft,
  seatExists,
  validatePassengerMix,
} from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Connection, Model, QueryFilter } from "mongoose";
import { Types } from "mongoose";

import { AppException } from "../../common/app-exception.js";
import { Clock } from "../../common/clock/clock.js";
import { parseObjectId } from "../../common/database/object-id.js";
import type { FlightRecord } from "../../infra/flight/flight.provider.js";
import {
  departureDateOf,
  fareFor,
  refundPolicyOf,
  toFlightSummary,
} from "../flights/flight-view.js";
import { FlightsService } from "../flights/flights.service.js";
import { InventoryService } from "../inventory/inventory.service.js";
import { PaymentsService } from "../payments/payments.service.js";
import { effectiveStatus, toBookingDto, toBookingListItem } from "./bookings.mapper.js";
import type {
  AssignSeatsDto,
  CreateBookingDto,
  ListBookingsQueryDto,
  PayBookingDto,
} from "./dto/bookings.dto.js";
import { generatePnr, generateTicketNumber } from "./pnr.js";
import type { BookingDocument, BookingPassenger, BookingSlice } from "./schemas/booking.schema.js";
import { Booking } from "./schemas/booking.schema.js";

const DUPLICATE_KEY = 11000;
const MAX_CREATE_ATTEMPTS = 3;
const EXIT_ROW_MIN_AGE = 15;
const RETURN_MIN_GAP_MINUTES = 60;
/** Exit rows carry age rules, so they are only ever given when a traveller picks one on purpose. */
const NEVER_AUTO_ASSIGN: ReadonlySet<SeatKind> = new Set<SeatKind>(["EXIT"]);

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === DUPLICATE_KEY
  );
}

function sameCity(a: FlightRecord["origin"], b: FlightRecord["origin"]): boolean {
  return a.countryCode === b.countryCode && a.cityEn === b.cityEn;
}

interface SlicePlan {
  direction: SliceDirection;
  record: FlightRecord;
  date: string;
  types: PassengerType[];
  fare: FareBreakdown;
  /** Seat per passenger index; infants have none. */
  seatByPassenger: Map<number, string>;
  seatFees: number;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly flights: FlightsService,
    private readonly inventory: InventoryService,
    private readonly payments: PaymentsService,
    private readonly clock: Clock,
  ) {}

  /* ---------------------------------- queries ---------------------------------- */

  async list(
    userId: string,
    query: ListBookingsQueryDto,
  ): Promise<PaginatedResponse<BookingListItemDto>> {
    const now = this.clock.now();
    const filter: QueryFilter<BookingDocument> = { userId: new Types.ObjectId(userId) };
    const and: QueryFilter<BookingDocument>[] = [];

    if (query.status === "EXPIRED") {
      and.push({
        $or: [{ status: "EXPIRED" }, { status: "PENDING_PAYMENT", holdExpiresAt: { $lte: now } }],
      });
    } else if (query.status === "PENDING_PAYMENT") {
      and.push({ status: "PENDING_PAYMENT", holdExpiresAt: { $gt: now } });
    } else if (query.status) {
      and.push({ status: query.status });
    }

    const live: QueryFilter<BookingDocument> = {
      $or: [{ status: "CONFIRMED" }, { status: "PENDING_PAYMENT", holdExpiresAt: { $gt: now } }],
    };
    if (query.when === "upcoming") and.push(live, { lastDepartureUtc: { $gte: now } });
    if (query.when === "past")
      and.push({ $or: [{ $nor: [live] }, { lastDepartureUtc: { $lt: now } }] });
    if (and.length > 0) filter.$and = and;

    const [items, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      this.bookingModel.countDocuments(filter),
    ]);
    return {
      data: items.map((booking) => toBookingListItem(booking as unknown as Booking, now)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  }

  async get(userId: string, id: string): Promise<BookingDto> {
    return toBookingDto(await this.loadOwned(userId, id), this.clock.now());
  }

  /* ---------------------------------- create ---------------------------------- */

  async create(userId: string, dto: CreateBookingDto): Promise<BookingDto> {
    const outbound = await this.flights.resolveBookable(dto.outboundFlightId);
    const inbound = dto.returnFlightId
      ? await this.flights.resolveBookable(dto.returnFlightId)
      : null;
    if (inbound) this.assertReturnMakesSense(outbound, inbound);

    const plans = [
      this.plan("OUTBOUND", outbound, dto),
      ...(inbound ? [this.plan("RETURN", inbound, dto)] : []),
    ];
    this.assertInternationalDocuments(plans, dto);

    const total = plans.reduce((sum, plan) => sum + plan.fare.total, 0);
    if (total !== dto.quotedTotal) {
      throw new AppException(409, "FARE_CHANGED", "قیمت این پرواز تغییر کرده است", {
        newTotal: total,
      });
    }
    await this.assertNoDuplicateTravellers(plans, dto);

    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.createOnce(userId, dto, plans);
      } catch (error: unknown) {
        // A lost seat race or a PNR collision is worth one more try with fresh availability
        const retryable =
          isDuplicateKey(error) ||
          (error instanceof AppException && error.code === "SEAT_UNAVAILABLE");
        if (!retryable || attempt >= MAX_CREATE_ATTEMPTS) throw error;
      }
    }
  }

  private async createOnce(
    userId: string,
    dto: CreateBookingDto,
    plans: SlicePlan[],
  ): Promise<BookingDto> {
    const holdExpiresAt = new Date(this.clock.now().getTime() + BOOKING_HOLD_MINUTES * 60_000);

    const reservedByFlight = await this.inventory.reservedSeats(
      plans.map((plan) => plan.record.id),
    );
    for (const plan of plans) {
      const map = buildSeatMap({
        aircraftId: plan.record.aircraft.id,
        flightKey: plan.record.id,
        loadFactor: plan.record.loadFactor,
        reservedSeats: reservedByFlight.get(plan.record.id) ?? new Set<string>(),
      });
      const seatedIndexes = plan.types.flatMap((type, index) => (type === "INFANT" ? [] : [index]));
      const seats = autoAssignSeats(
        map,
        plan.record.cabin,
        seatedIndexes.length,
        dto.seatPreference,
        new Set(),
        NEVER_AUTO_ASSIGN,
      );
      if (seats.length < seatedIndexes.length) {
        throw new AppException(
          409,
          "FLIGHT_SOLD_OUT",
          "ظرفیت کافی برای این تعداد مسافر باقی نمانده است",
        );
      }
      plan.seatByPassenger = new Map(
        seatedIndexes.map((passengerIndex, position) => [
          passengerIndex,
          seats[position] as string,
        ]),
      );
      plan.seatFees = seats.reduce((sum, seat) => sum + (findSeat(map, seat)?.feeRial ?? 0), 0);
    }

    const bookingId = new Types.ObjectId();
    const document = this.buildDocument(bookingId, userId, dto, plans, holdExpiresAt);

    await this.inTransaction(async (session) => {
      await this.inventory.holdSeats(
        session,
        bookingId,
        plans.flatMap((plan) =>
          [...plan.seatByPassenger.values()].map((seat) => ({ flightId: plan.record.id, seat })),
        ),
        holdExpiresAt,
      );
      await this.bookingModel.create([document], { session });
    });

    return this.get(userId, bookingId.toString());
  }

  private plan(direction: SliceDirection, record: FlightRecord, dto: CreateBookingDto): SlicePlan {
    const date = departureDateOf(record);
    const types = dto.passengers.map((passenger) => passengerTypeForAge(passenger.birthDate, date));
    const problem = validatePassengerMix(countPassengers(types));
    if (problem) {
      throw new AppException(400, "VALIDATION_FAILED", problem, [
        { path: "passengers", message: problem },
      ]);
    }
    return {
      direction,
      record,
      date,
      types,
      fare: fareFor(record, record.adultBaseFare, types),
      seatByPassenger: new Map(),
      seatFees: 0,
    };
  }

  private assertReturnMakesSense(outbound: FlightRecord, inbound: FlightRecord): void {
    const reversed =
      inbound.origin.code === outbound.destination.code &&
      sameCity(inbound.destination, outbound.origin);
    if (!reversed) {
      throw new AppException(
        400,
        "VALIDATION_FAILED",
        "پرواز برگشت باید مسیر معکوس پرواز رفت باشد",
      );
    }
    if (hoursBetween(inbound.departureUtc, outbound.arrivalUtc) * 60 < RETURN_MIN_GAP_MINUTES) {
      throw new AppException(
        400,
        "VALIDATION_FAILED",
        "پرواز برگشت باید بعد از رسیدن پرواز رفت باشد",
      );
    }
  }

  /** Foreign travel needs a passport valid for six months after the last flight. */
  private assertInternationalDocuments(plans: SlicePlan[], dto: CreateBookingDto): void {
    if (!plans.some((plan) => plan.record.international)) return;
    const lastDate = plans.reduce(
      (latest, plan) => (plan.date > latest ? plan.date : latest),
      plans[0]?.date ?? "",
    );
    const validUntil = addDaysIso(lastDate, 183);

    dto.passengers.forEach((passenger, index) => {
      let message: string | null = null;
      if (!passenger.passportNumber || !passenger.passportExpiry) {
        message = "برای پرواز خارجی شماره و تاریخ انقضای گذرنامه الزامی است";
      } else if (passenger.passportExpiry < validUntil) {
        message = "گذرنامه باید حداقل ۶ ماه پس از پرواز اعتبار داشته باشد";
      }
      if (message) {
        throw new AppException(400, "VALIDATION_FAILED", message, [
          { path: `passengers.${index}.passportNumber`, message },
        ]);
      }
    });
  }

  private async assertNoDuplicateTravellers(
    plans: SlicePlan[],
    dto: CreateBookingDto,
  ): Promise<void> {
    const clash = await this.bookingModel
      .findOne({
        "slices.flightId": { $in: plans.map((plan) => plan.record.id) },
        "passengers.nationalId": { $in: dto.passengers.map((passenger) => passenger.nationalId) },
        $or: [
          { status: "CONFIRMED" },
          { status: "PENDING_PAYMENT", holdExpiresAt: { $gt: this.clock.now() } },
        ],
      })
      .select({ _id: 1 })
      .lean();
    if (clash) {
      throw new AppException(
        409,
        "CONFLICT",
        "برای یکی از مسافران روی همین پرواز رزرو فعال وجود دارد",
      );
    }
  }

  private buildDocument(
    bookingId: Types.ObjectId,
    userId: string,
    dto: CreateBookingDto,
    plans: SlicePlan[],
    holdExpiresAt: Date,
  ): Partial<Booking> {
    const slices: BookingSlice[] = plans.map((plan) => ({
      direction: plan.direction,
      flightId: plan.record.id,
      cabin: plan.record.cabin,
      flight: toFlightSummary(plan.record),
      fare: plan.fare,
      refundPolicy: refundPolicyOf(plan.record),
      seatFees: plan.seatFees,
      departureUtc: plan.record.departureUtc,
    }));

    const passengers: BookingPassenger[] = dto.passengers.map((passenger, index) => {
      const types: BookingPassenger["types"] = {};
      const seats: BookingPassenger["seats"] = {};
      for (const plan of plans) {
        types[plan.direction] = plan.types[index] as PassengerType;
        const seat = plan.seatByPassenger.get(index);
        if (seat) seats[plan.direction] = seat;
      }
      return {
        index,
        savedPassengerId: passenger.savedPassengerId ?? null,
        firstNameFa: passenger.firstNameFa,
        lastNameFa: passenger.lastNameFa,
        firstNameEn: passenger.firstNameEn,
        lastNameEn: passenger.lastNameEn,
        nationalId: passenger.nationalId,
        birthDate: passenger.birthDate,
        gender: passenger.gender,
        passportNumber: passenger.passportNumber ?? null,
        passportExpiry: passenger.passportExpiry ?? null,
        types,
        seats,
        tickets: {},
      };
    });

    const fareTotal = plans.reduce((sum, plan) => sum + plan.fare.total, 0);
    const seatFeesTotal = plans.reduce((sum, plan) => sum + plan.seatFees, 0);
    const first = plans[0] as SlicePlan;
    const last = plans[plans.length - 1] as SlicePlan;
    return {
      _id: bookingId,
      userId: new Types.ObjectId(userId),
      pnr: generatePnr(),
      status: "PENDING_PAYMENT",
      contact: { mobile: dto.contact.mobile, email: dto.contact.email ?? null },
      slices,
      passengers,
      totals: { fareTotal, seatFeesTotal, total: fareTotal + seatFeesTotal },
      holdExpiresAt,
      paidAt: null,
      cancelledAt: null,
      refund: null,
      firstDepartureUtc: first.record.departureUtc,
      lastDepartureUtc: last.record.departureUtc,
    };
  }

  /* ----------------------------------- seats ----------------------------------- */

  async assignSeats(userId: string, id: string, dto: AssignSeatsDto): Promise<BookingDto> {
    const booking = await this.loadOwned(userId, id);
    const now = this.clock.now();
    this.assertOpenForPayment(booking, now);

    // Start from the seats already held, apply the picks, then validate the resulting state
    const chosen = new Map<SliceDirection, Map<number, string>>(
      booking.slices.map((slice) => [
        slice.direction,
        new Map(
          booking.passengers.flatMap((passenger) => {
            const seat = passenger.seats[slice.direction];
            return seat ? [[passenger.index, seat] as [number, string]] : [];
          }),
        ),
      ]),
    );

    for (const selection of dto.seats) {
      const slice = booking.slices.find((candidate) => candidate.direction === selection.slice);
      const passenger = booking.passengers[selection.passengerIndex];
      if (!slice || !passenger) {
        throw new AppException(
          400,
          "VALIDATION_FAILED",
          "مسافر یا پرواز انتخاب‌شده در این رزرو وجود ندارد",
        );
      }
      if (passenger.types[slice.direction] === "INFANT") {
        throw new AppException(400, "VALIDATION_FAILED", "نوزاد صندلی جداگانه ندارد");
      }
      chosen.get(slice.direction)?.set(selection.passengerIndex, selection.seat);
    }

    const fees = new Map<SliceDirection, number>();
    const seatUpdates: Record<string, string> = {};
    for (const slice of booking.slices) {
      const picks = chosen.get(slice.direction) as Map<number, string>;
      fees.set(slice.direction, await this.validatePicks(booking, slice, picks, seatUpdates));
    }

    const seatFeesTotal = [...fees.values()].reduce((sum, fee) => sum + fee, 0);
    const update: Record<string, unknown> = {
      ...seatUpdates,
      totals: {
        fareTotal: booking.totals.fareTotal,
        seatFeesTotal,
        total: booking.totals.fareTotal + seatFeesTotal,
      },
    };
    booking.slices.forEach((slice, index) => {
      update[`slices.${index}.seatFees`] = fees.get(slice.direction) ?? 0;
    });

    await this.inTransaction(async (session) => {
      for (const slice of booking.slices) {
        const picks = chosen.get(slice.direction) as Map<number, string>;
        await this.inventory.releaseFlightSeats(session, booking._id, slice.flightId);
        await this.inventory.holdSeats(
          session,
          booking._id,
          [...picks.values()].map((seat) => ({ flightId: slice.flightId, seat })),
          booking.holdExpiresAt,
        );
      }
      const result = await this.bookingModel.updateOne(
        { _id: booking._id, status: "PENDING_PAYMENT", holdExpiresAt: { $gt: now } },
        { $set: update },
        { session },
      );
      if (result.matchedCount === 0) {
        throw new AppException(409, "BOOKING_EXPIRED", "زمان پرداخت این رزرو تمام شده است");
      }
    });

    return this.get(userId, id);
  }

  /** Checks every pick of one slice and returns the seat fees; also records the per-passenger $set paths. */
  private async validatePicks(
    booking: Booking,
    slice: BookingSlice,
    picks: Map<number, string>,
    seatUpdates: Record<string, string>,
  ): Promise<number> {
    const record = await this.flights.resolve(slice.flightId);
    const aircraft = requireAircraft(slice.flight.aircraft.id);
    const flightDate = departureDateOf(record);

    const reserved = (await this.inventory.reservedSeats([slice.flightId])).get(
      slice.flightId,
    ) as Set<string>;
    const own = new Set(
      booking.passengers.flatMap((passenger) => {
        const seat = passenger.seats[slice.direction];
        return seat ? [seat] : [];
      }),
    );
    for (const seat of own) reserved.delete(seat);
    const map = buildSeatMap({
      aircraftId: aircraft.id,
      flightKey: slice.flightId,
      loadFactor: record.loadFactor,
      reservedSeats: reserved,
    });

    const seen = new Set<string>();
    let fees = 0;
    for (const [passengerIndex, seatNumber] of picks) {
      const seat = seatExists(aircraft, seatNumber) ? findSeat(map, seatNumber) : undefined;
      if (!seat) {
        throw new AppException(
          400,
          "VALIDATION_FAILED",
          `صندلی ${seatNumber} در این هواپیما وجود ندارد`,
        );
      }
      if (seat.cabin !== slice.cabin) {
        throw new AppException(
          400,
          "VALIDATION_FAILED",
          `صندلی ${seatNumber} در کابین انتخابی شما نیست`,
        );
      }
      // A seat this booking already holds stays valid even if the occupancy model now marks it sold
      if (seat.taken && !own.has(seatNumber)) {
        throw new AppException(409, "SEAT_UNAVAILABLE", `صندلی ${seatNumber} دیگر آزاد نیست`);
      }
      if (seen.has(seatNumber)) {
        throw new AppException(
          409,
          "SEAT_UNAVAILABLE",
          `صندلی ${seatNumber} برای دو مسافر انتخاب شده است`,
        );
      }
      seen.add(seatNumber);

      const passenger = booking.passengers[passengerIndex] as BookingPassenger;
      if (seat.kind === "EXIT" && ageOnDate(passenger.birthDate, flightDate) < EXIT_ROW_MIN_AGE) {
        throw new AppException(
          400,
          "VALIDATION_FAILED",
          "صندلی خروج اضطراری فقط برای مسافران ۱۵ سال به بالا مجاز است",
        );
      }
      fees += seat.feeRial;
      seatUpdates[`passengers.${passengerIndex}.seats.${slice.direction}`] = seatNumber;
    }
    return fees;
  }

  /* ------------------------------------ pay ------------------------------------ */

  async pay(userId: string, id: string, dto: PayBookingDto): Promise<PayBookingResultDto> {
    const booking = await this.loadOwned(userId, id);
    const now = this.clock.now();

    if (booking.status === "CONFIRMED") {
      // Paying twice is a double click, not a second purchase
      const existing = await this.payments.latestForBooking(booking._id);
      if (existing) return { payment: existing, booking: toBookingDto(booking, now) };
    }
    this.assertOpenForPayment(booking, now);

    const payment = await this.payments.charge({
      bookingId: booking._id,
      userId: booking.userId,
      amount: booking.totals.total,
      description: `رزرو ${booking.pnr}`,
      outcome: dto.outcome,
    });
    if (payment.status !== "SUCCEEDED") return { payment, booking: toBookingDto(booking, now) };

    try {
      await this.confirm(booking);
    } catch (error: unknown) {
      // The money moved but the seats are gone (hold lapsed mid-payment): give it back
      await this.payments.refundForBooking(booking._id, booking.totals.total);
      throw error;
    }
    return { payment, booking: await this.get(userId, id) };
  }

  private async confirm(booking: Booking): Promise<void> {
    const now = this.clock.now();
    const tickets: Record<string, string> = {};
    for (const passenger of booking.passengers) {
      for (const slice of booking.slices) {
        tickets[`passengers.${passenger.index}.tickets.${slice.direction}`] = generateTicketNumber(
          slice.flight.airline.code,
        );
      }
    }
    const expectedHolds = booking.slices.reduce(
      (sum, slice) =>
        sum + booking.passengers.filter((p) => p.types[slice.direction] !== "INFANT").length,
      0,
    );

    await this.inTransaction(async (session) => {
      // Every seated passenger must still hold a seat; a lapsed hold that was re-sold cannot be honoured
      if ((await this.inventory.countBookingHolds(booking._id, session)) < expectedHolds) {
        throw new AppException(
          409,
          "BOOKING_EXPIRED",
          "مهلت پرداخت تمام شده و صندلی‌ها آزاد شده‌اند؛ مبلغ برگشت داده شد",
        );
      }
      const result = await this.bookingModel.updateOne(
        { _id: booking._id, status: "PENDING_PAYMENT" },
        { $set: { status: "CONFIRMED", paidAt: now, holdExpiresAt: null, ...tickets } },
        { session },
      );
      if (result.matchedCount === 0) {
        throw new AppException(409, "BOOKING_NOT_PAYABLE", "این رزرو دیگر قابل پرداخت نیست");
      }
      await this.inventory.confirmBooking(booking._id, session);
    });
  }

  /* ----------------------------------- cancel ----------------------------------- */

  async refundQuote(userId: string, id: string): Promise<RefundQuoteDto> {
    return this.quoteFor(await this.loadOwned(userId, id), this.clock.now());
  }

  async cancel(userId: string, id: string): Promise<BookingDto> {
    const booking = await this.loadOwned(userId, id);
    const now = this.clock.now();
    const status = effectiveStatus(booking, now);

    if (status === "PENDING_PAYMENT") {
      const result = await this.bookingModel.updateOne(
        { _id: booking._id, status: "PENDING_PAYMENT" },
        { $set: { status: "CANCELLED", cancelledAt: now, holdExpiresAt: null } },
      );
      if (result.matchedCount === 1) await this.inventory.releaseBooking(booking._id);
      return this.get(userId, id);
    }

    const quote = this.quoteFor(booking, now);
    if (status !== "CONFIRMED" || !quote.cancellable) {
      throw new AppException(
        409,
        "BOOKING_NOT_CANCELLABLE",
        quote.blockedReason ?? "این رزرو قابل لغو نیست",
      );
    }

    const result = await this.bookingModel.updateOne(
      { _id: booking._id, status: "CONFIRMED" },
      {
        $set: {
          status: "CANCELLED",
          cancelledAt: now,
          refund: {
            refundAmount: quote.totalRefund,
            penaltyAmount: quote.totalPenalty,
            nonRefundableFees: quote.totalNonRefundableFees,
            processedAt: now,
          },
        },
      },
    );
    if (result.matchedCount === 0) {
      throw new AppException(409, "BOOKING_NOT_CANCELLABLE", "این رزرو قابل لغو نیست");
    }
    await this.inventory.releaseBooking(booking._id);
    await this.payments.refundForBooking(booking._id, quote.totalRefund);
    return this.get(userId, id);
  }

  private quoteFor(booking: Booking, now: Date): RefundQuoteDto {
    const status = effectiveStatus(booking, now);
    const empty = {
      bookingId: booking._id.toString(),
      slices: [],
      totalRefund: 0,
      totalPenalty: 0,
      totalNonRefundableFees: 0,
    };
    const blocked = (blockedReason: string): RefundQuoteDto => ({
      ...empty,
      cancellable: false,
      blockedReason,
    });

    if (status === "CANCELLED") return blocked("این رزرو قبلاً لغو شده است");
    if (status === "EXPIRED") return blocked("مهلت پرداخت این رزرو تمام شده است");
    if (status === "PENDING_PAYMENT") return { ...empty, cancellable: true, blockedReason: null };

    const first = booking.slices[0] as BookingSlice;
    if (first.departureUtc <= now) {
      return blocked("پس از پرواز رفت، لغو آنلاین ممکن نیست؛ با پشتیبانی ایرلاین تماس بگیرید");
    }

    const slices = booking.slices.map((slice) => {
      const hoursBeforeDeparture = hoursBetween(slice.departureUtc, now);
      const result = calculateRefund({
        baseFare: slice.fare.baseTotal,
        taxes: slice.fare.taxTotal,
        // Seat fees are an add-on service; like service fees they are not returned
        serviceFee: slice.fare.serviceFeeTotal + slice.seatFees,
        policy: slice.refundPolicy,
        hoursBeforeDeparture,
      });
      return {
        direction: slice.direction,
        hoursBeforeDeparture: Math.round(hoursBeforeDeparture * 10) / 10,
        result,
      };
    });
    return {
      bookingId: booking._id.toString(),
      cancellable: true,
      blockedReason: null,
      slices,
      totalRefund: slices.reduce((sum, slice) => sum + slice.result.refundAmount, 0),
      totalPenalty: slices.reduce((sum, slice) => sum + slice.result.penaltyAmount, 0),
      totalNonRefundableFees: slices.reduce(
        (sum, slice) => sum + slice.result.nonRefundableFees,
        0,
      ),
    };
  }

  /* ---------------------------------- internals ---------------------------------- */

  private async loadOwned(userId: string, id: string): Promise<Booking> {
    const bookingId = parseObjectId(id, "BOOKING_NOT_FOUND", "رزرو یافت نشد");
    const booking = await this.bookingModel
      .findOne({ _id: bookingId, userId: new Types.ObjectId(userId) })
      .lean();
    if (!booking) throw new AppException(404, "BOOKING_NOT_FOUND", "رزرو یافت نشد");
    return booking as unknown as Booking;
  }

  private assertOpenForPayment(booking: Booking, now: Date): void {
    const status = effectiveStatus(booking, now);
    if (status === "EXPIRED") {
      throw new AppException(
        409,
        "BOOKING_EXPIRED",
        "زمان پرداخت این رزرو تمام شده است؛ دوباره جست‌وجو کنید",
      );
    }
    if (status !== "PENDING_PAYMENT") {
      throw new AppException(
        409,
        "BOOKING_NOT_PAYABLE",
        "این رزرو در وضعیتی نیست که بتوان آن را پرداخت یا ویرایش کرد",
      );
    }
  }

  private async inTransaction(work: (session: ClientSession) => Promise<void>): Promise<void> {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(work);
    } finally {
      await session.endSession();
    }
  }
}
