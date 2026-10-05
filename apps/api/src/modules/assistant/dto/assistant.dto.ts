import { askAssistantSchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class AskAssistantDto extends createZodDto(askAssistantSchema) {}
