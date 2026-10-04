import { createBookingSchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class CreateBookingDto extends createZodDto(createBookingSchema) {}
