import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { FlightsModule } from "../flights/flights.module.js";
import { InventoryModule } from "../inventory/inventory.module.js";
import { PaymentsModule } from "../payments/payments.module.js";
import { BookingsController } from "./bookings.controller.js";
import { BookingsExpirer } from "./bookings.expirer.js";
import { BookingsService } from "./bookings.service.js";
import { Booking, BookingSchemaDef } from "./schemas/booking.schema.js";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchemaDef }]),
    FlightsModule,
    InventoryModule,
    PaymentsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsExpirer],
  exports: [BookingsService, BookingsExpirer],
})
export class BookingsModule {}
