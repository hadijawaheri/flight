import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module.js";
import { FlightsModule } from "../flights/flights.module.js";
import { KnowledgeModule } from "../knowledge/knowledge.module.js";
import { AssistantController } from "./assistant.controller.js";
import { AssistantService } from "./assistant.service.js";
import { AssistantToolbox } from "./assistant-toolbox.js";

@Module({
  imports: [KnowledgeModule, FlightsModule, BookingsModule],
  controllers: [AssistantController],
  providers: [AssistantService, AssistantToolbox],
})
export class AssistantModule {}
