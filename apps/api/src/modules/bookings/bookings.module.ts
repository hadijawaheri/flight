import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { FlightInfraModule } from "../../infra/flight/flight.module.js";
import { SmsModule } from "../../infra/sms/sms.module.js";
import { PassengersModule } from "../passengers/passengers.module.js";
import { UsersModule } from "../users/users.module.js";
import { BookingsController } from "./bookings.controller.js";
import { BookingsService } from "./bookings.service.js";
import { Booking, BookingSchema } from "./schemas/booking.schema.js";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    FlightInfraModule,
    PassengersModule,
    UsersModule,
    SmsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
