import { Module } from "@nestjs/common";

import { KnowledgeService } from "./knowledge.service.js";
import { RulesController } from "./rules.controller.js";

@Module({
  controllers: [RulesController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
