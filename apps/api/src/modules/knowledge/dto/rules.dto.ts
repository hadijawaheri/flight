import { listRulesQuerySchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class ListRulesQueryDto extends createZodDto(listRulesQuerySchema) {}
