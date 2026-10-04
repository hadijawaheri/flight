import { initiatePaymentSchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class InitiatePaymentDto extends createZodDto(initiatePaymentSchema) {}
