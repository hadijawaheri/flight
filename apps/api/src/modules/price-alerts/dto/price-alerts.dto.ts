import { createPriceAlertSchema, updatePriceAlertSchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class CreatePriceAlertDto extends createZodDto(createPriceAlertSchema) {}
export class UpdatePriceAlertDto extends createZodDto(updatePriceAlertSchema) {}
