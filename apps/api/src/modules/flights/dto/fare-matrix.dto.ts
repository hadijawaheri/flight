import { fareMatrixQuerySchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class FareMatrixQueryDto extends createZodDto(fareMatrixQuerySchema) {}
