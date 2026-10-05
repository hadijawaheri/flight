import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { InventoryService } from "./inventory.service.js";
import { SeatHold, SeatHoldSchema } from "./schemas/seat-hold.schema.js";

@Module({
  imports: [MongooseModule.forFeature([{ name: SeatHold.name, schema: SeatHoldSchema }])],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
