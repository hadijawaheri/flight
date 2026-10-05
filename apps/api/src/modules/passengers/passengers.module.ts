import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { PassengersController } from "./passengers.controller.js";
import { PassengersService } from "./passengers.service.js";
import { Passenger, PassengerSchema } from "./schemas/passenger.schema.js";

@Module({
  imports: [MongooseModule.forFeature([{ name: Passenger.name, schema: PassengerSchema }])],
  controllers: [PassengersController],
  providers: [PassengersService],
})
export class PassengersModule {}
