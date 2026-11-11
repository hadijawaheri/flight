import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { HotelsController } from "./hotels.controller.js";
import { HotelsService } from "./hotels.service.js";
import { RoomHold, RoomHoldSchema } from "./schemas/room-hold.schema.js";

@Module({
  imports: [MongooseModule.forFeature([{ name: RoomHold.name, schema: RoomHoldSchema }])],
  controllers: [HotelsController],
  providers: [HotelsService],
  exports: [HotelsService],
})
export class HotelsModule {}
