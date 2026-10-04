import { z } from "zod";

import { mobileSchema, nationalCodeSchema } from "../common/iran";
import type { FlightDto } from "../flights/flights.schema";
import type { PassengerType } from "../passengers/passengers.schema";
import { GENDERS, PASSENGER_TYPES } from "../passengers/passengers.schema";

export const BOOKING_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const bookingPassengerInputSchema = z.object({
  passengerId: z.string().optional(),
  firstNameFa: z.string().trim().min(2, "نام فارسی الزامی است"),
  lastNameFa: z.string().trim().min(2, "نام خانوادگی فارسی الزامی است"),
  firstNameEn: z.string().trim().min(2, "نام انگلیسی الزامی است"),
  lastNameEn: z.string().trim().min(2, "نام خانوادگی انگلیسی الزامی است"),
  nationalId: nationalCodeSchema,
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ تولد نامعتبر است"),
  gender: z.enum(GENDERS),
  passengerType: z.enum(PASSENGER_TYPES).default("ADULT"),
  passportNumber: z.string().trim().optional().nullable(),
  seatPreference: z.enum(["WINDOW", "AISLE", "ANY"]).default("ANY"),
  selectedSeatNumber: z.string().optional(),
});

export type BookingPassengerInput = z.infer<typeof bookingPassengerInputSchema>;

export const createBookingSchema = z.object({
  flightId: z.string().min(1, "شناسه پرواز الزامی است"),
  passengers: z
    .array(bookingPassengerInputSchema)
    .min(1, "حداقل یک مسافر الزامی است")
    .max(9, "حداکثر ۹ مسافر در یک رزرو مجاز است"),
  contactMobile: mobileSchema,
  contactEmail: z.string().email("ایمیل معتبر نیست").optional().nullable(),
  savePassengersToVault: z.boolean().default(true),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingSchema = z.object({
  passengers: z.array(bookingPassengerInputSchema).min(1).max(9).optional(),
  contactMobile: mobileSchema.optional(),
  contactEmail: z.string().email("ایمیل معتبر نیست").optional().nullable(),
  savePassengersToVault: z.boolean().default(false),
});

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

export interface TicketDto {
  ticketNumber: string;
  passengerName: string;
  passengerNationalId: string;
  passengerType: PassengerType;
  seatNumber: string;
  price: number;
  barcode: string;
  status: "ISSUED" | "CANCELLED";
}

export interface BookingPassengerDto extends BookingPassengerInput {
  id: string;
  price: number;
  seatNumber: string;
}

export interface BookingDto {
  id: string;
  bookingReference: string; // PNR
  userId: string;
  flight: FlightDto;
  passengers: BookingPassengerDto[];
  tickets: TicketDto[];
  totalAmount: number;
  status: BookingStatus;
  contactMobile: string;
  contactEmail?: string | null;
  paymentId?: string | null;
  expiresAt: string;
  createdAt: string;
  paidAt?: string | null;
}
