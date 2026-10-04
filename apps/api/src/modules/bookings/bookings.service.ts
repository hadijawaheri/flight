import { randomUUID } from "node:crypto";

import type { BookingDto, TicketDto } from "@flysmart/contracts";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { FlightProvider } from "../../infra/flight/flight.provider.js";
import { SmsProvider } from "../../infra/sms/sms.provider.js";
import { PassengersService } from "../passengers/passengers.service.js";
import { UsersService } from "../users/users.service.js";
import { toBookingDto } from "./bookings.mapper.js";
import type { CreateBookingDto } from "./dto/create-booking.dto.js";
import type { UpdateBookingDto } from "./dto/update-booking.dto.js";
import { Booking, type BookingDocument } from "./schemas/booking.schema.js";

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    private readonly flightProvider: FlightProvider,
    private readonly passengersService: PassengersService,
    private readonly usersService: UsersService,
    private readonly smsProvider: SmsProvider,
  ) {}

  async listByUser(userId: string): Promise<BookingDto[]> {
    const docs = await this.bookingModel
      .find({ userId: new Types.ObjectId(userId), deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();

    return docs.map(toBookingDto);
  }

  async getById(userId: string | undefined, bookingId: string): Promise<BookingDto> {
    const filter: Record<string, unknown> = {
      _id: new Types.ObjectId(bookingId),
      deletedAt: null,
    };
    if (userId) {
      filter.userId = new Types.ObjectId(userId);
    }
    const doc = await this.bookingModel.findOne(filter).exec();

    if (!doc) {
      // If accessed by ID during checkout or confirmation, also try by _id
      const fallbackDoc = await this.bookingModel
        .findOne({
          _id: new Types.ObjectId(bookingId),
          deletedAt: null,
        })
        .exec();

      if (!fallbackDoc) {
        throw new NotFoundException("رزرو مورد نظر یافت نشد");
      }
      return toBookingDto(fallbackDoc);
    }

    return toBookingDto(doc);
  }

  async create(userId: string | undefined, input: CreateBookingDto): Promise<BookingDto> {
    const flight = await this.flightProvider.getFlightById(input.flightId);
    if (!flight) {
      throw new NotFoundException("پرواز انتخاب شده یافت نشد");
    }

    if (flight.availableSeats < input.passengers.length) {
      throw new BadRequestException("ظرفیت صندلی‌های این پرواز تکمیل شده است");
    }

    let effectiveUserId = userId;
    if (!effectiveUserId && input.contactMobile) {
      const user = await this.usersService.findOrCreateByMobile(input.contactMobile);
      effectiveUserId = user.id;
    }

    // Auto-save passengers to vault if requested (User requirement: enter once, saved forever)
    if (input.savePassengersToVault && effectiveUserId) {
      for (const p of input.passengers) {
        try {
          await this.passengersService.create(effectiveUserId, {
            firstNameFa: p.firstNameFa,
            lastNameFa: p.lastNameFa,
            firstNameEn: p.firstNameEn,
            lastNameEn: p.lastNameEn,
            nationalId: p.nationalId,
            birthDate: p.birthDate,
            gender: p.gender,
            passengerType: p.passengerType,
            passportNumber: p.passportNumber ?? null,
            isDefault: false,
          });
        } catch {
          // If already exists or duplicate nationalId, continue smoothly
        }
      }
    }

    // Calculate passenger fares & seats
    let totalAmount = 0;
    const baseFare = flight.finalPrice;

    const assignedPassengers = input.passengers.map((p, idx) => {
      let fare = baseFare;
      if (p.passengerType === "CHILD") {
        fare = Math.round(baseFare * 0.75); // 75% for child
      } else if (p.passengerType === "INFANT") {
        fare = Math.round(baseFare * 0.1); // 10% for infant
      }
      totalAmount += fare;

      const row = 10 + idx;
      const col = p.seatPreference === "WINDOW" ? "A" : p.seatPreference === "AISLE" ? "C" : "B";
      const seatNumber = p.selectedSeatNumber || `${row}${col}`;

      return {
        ...p,
        id: `pax-${randomUUID().slice(0, 8)}`,
        price: fare,
        seatNumber,
      };
    });

    // PNR format: FS-XXXXXX
    const pnr = `FS-${randomUUID().slice(0, 6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes to pay

    const created = await this.bookingModel.create({
      bookingReference: pnr,
      userId: new Types.ObjectId(effectiveUserId),
      flightId: flight.id,
      flightSnapshot: flight,
      passengers: assignedPassengers,
      tickets: [],
      totalAmount,
      status: "PENDING_PAYMENT",
      contactMobile: input.contactMobile,
      contactEmail: input.contactEmail ?? null,
      expiresAt,
    });

    return toBookingDto(created);
  }

  async update(
    userId: string | undefined,
    bookingId: string,
    input: UpdateBookingDto,
  ): Promise<BookingDto> {
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException("رزرو یافت نشد");
    }

    if (booking.status !== "PENDING_PAYMENT") {
      throw new BadRequestException("امکان ویرایش اطلاعات در این وضعیت رزرو وجود ندارد");
    }

    let effectiveUserId = userId || (booking.userId ? booking.userId.toHexString() : undefined);
    if (!effectiveUserId && input.contactMobile) {
      const user = await this.usersService.findOrCreateByMobile(input.contactMobile);
      effectiveUserId = user.id;
    }

    if (effectiveUserId && !booking.userId) {
      booking.userId = new Types.ObjectId(effectiveUserId);
    }

    if (input.contactMobile) {
      booking.contactMobile = input.contactMobile;
    }
    if (input.contactEmail !== undefined) {
      booking.contactEmail = input.contactEmail;
    }

    if (input.passengers && input.passengers.length > 0) {
      // Update passenger details while preserving assigned seats and fares
      booking.passengers = input.passengers.map((p, idx) => {
        const existing = booking.passengers[idx];
        return {
          id: existing?.id || `pax-${randomUUID().slice(0, 8)}`,
          passengerId: p.passengerId,
          firstNameFa: p.firstNameFa,
          lastNameFa: p.lastNameFa,
          firstNameEn: p.firstNameEn,
          lastNameEn: p.lastNameEn,
          nationalId: p.nationalId,
          birthDate: p.birthDate,
          gender: p.gender,
          passengerType: p.passengerType,
          passportNumber: p.passportNumber ?? null,
          seatPreference: p.seatPreference || existing?.seatPreference || "ANY",
          selectedSeatNumber: p.selectedSeatNumber || existing?.selectedSeatNumber,
          seatNumber: existing?.seatNumber || `${10 + idx}A`,
          price: existing?.price || booking.flightSnapshot.finalPrice,
        };
      });

      // Auto-save passengers to vault if requested
      if (input.savePassengersToVault && effectiveUserId) {
        for (const p of input.passengers) {
          try {
            await this.passengersService.create(effectiveUserId, {
              firstNameFa: p.firstNameFa,
              lastNameFa: p.lastNameFa,
              firstNameEn: p.firstNameEn,
              lastNameEn: p.lastNameEn,
              nationalId: p.nationalId,
              birthDate: p.birthDate,
              gender: p.gender,
              passengerType: p.passengerType,
              passportNumber: p.passportNumber ?? null,
              isDefault: false,
            });
          } catch {
            // ignore duplicates
          }
        }
      }
    }

    await booking.save();
    return toBookingDto(booking);
  }

  async confirmBookingPayment(bookingId: string, paymentId: string): Promise<BookingDto> {
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException("رزرو یافت نشد");
    }

    if (booking.status === "CONFIRMED") {
      return toBookingDto(booking);
    }

    // Generate electronic tickets for each passenger
    const tickets: TicketDto[] = booking.passengers.map((p, idx) => {
      const etktNum = `724-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      return {
        ticketNumber: etktNum,
        passengerName: `${p.firstNameFa} ${p.lastNameFa}`,
        passengerNationalId: p.nationalId,
        passengerType: p.passengerType,
        seatNumber: p.seatNumber,
        price: p.price,
        barcode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${booking.bookingReference}-${idx + 1}`,
        status: "ISSUED",
      };
    });

    booking.status = "CONFIRMED";
    booking.paymentId = paymentId;
    booking.tickets = tickets;
    booking.paidAt = new Date();
    await booking.save();

    // Send confirmation SMS
    await this.smsProvider.sendNotification(
      booking.contactMobile,
      `پرواز پلاس: بلیط پرواز ${booking.flightSnapshot.origin} به ${booking.flightSnapshot.destination} با شماره پیگیری ${booking.bookingReference} صادر شد. مشاهده و دریافت بلیط: https://flysmart.ir/checkout/${booking._id}/result`,
    );

    return toBookingDto(booking);
  }

  async cancelBooking(userId: string, bookingId: string): Promise<BookingDto> {
    const booking = await this.bookingModel
      .findOne({
        _id: new Types.ObjectId(bookingId),
        userId: new Types.ObjectId(userId),
        deletedAt: null,
      })
      .exec();

    if (!booking) {
      throw new NotFoundException("رزرو یافت نشد");
    }

    booking.status = "CANCELLED";
    await booking.save();
    return toBookingDto(booking);
  }
}
