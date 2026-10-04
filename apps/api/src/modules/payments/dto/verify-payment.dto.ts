import { verifyPaymentSchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class VerifyPaymentDto extends createZodDto(verifyPaymentSchema) {}
