import { Module } from "@nestjs/common";

import { FlightInfraModule } from "../../infra/flight/flight.module.js";
import { AssistantController } from "./assistant.controller.js";
import { AssistantService } from "./assistant.service.js";

@Module({
  imports: [FlightInfraModule],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
