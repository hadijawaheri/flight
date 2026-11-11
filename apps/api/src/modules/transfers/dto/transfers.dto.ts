import { transferQuoteQuerySchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class TransferQuoteQueryDto extends createZodDto(transferQuoteQuerySchema) {}
