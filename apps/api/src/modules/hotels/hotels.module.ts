import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { HotelsController } from "./hotels.controller.js";
import { HotelsService } from "./hotels.service.js";
import { RoomHold, RoomHoldSchema } from "./schemas/room-hold.schema.js";
import { RoomNightLock, RoomNightLockSchema } from "./schemas/room-night-lock.schema.js";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoomHold.name, schema: RoomHoldSchema },
      { name: RoomNightLock.name, schema: RoomNightLockSchema },
    ]),
  ],
  controllers: [HotelsController],
  providers: [HotelsService],
  exports: [HotelsService],
})
export class HotelsModule {}
