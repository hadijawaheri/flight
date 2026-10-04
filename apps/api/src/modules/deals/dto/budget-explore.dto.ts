import { budgetExploreQuerySchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class BudgetExploreQueryDto extends createZodDto(budgetExploreQuerySchema) {}
