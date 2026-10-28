import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { PriceHistoryService } from "./price-history.service.js";
import { PriceObservation, PriceObservationSchema } from "./schemas/price-observation.schema.js";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PriceObservation.name, schema: PriceObservationSchema }]),
  ],
  providers: [PriceHistoryService],
  exports: [PriceHistoryService],
})
export class PriceHistoryModule {}
