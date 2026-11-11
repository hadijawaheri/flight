import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module.js";
import { TransfersController } from "./transfers.controller.js";
import { TransfersService } from "./transfers.service.js";

@Module({
  imports: [BookingsModule],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
