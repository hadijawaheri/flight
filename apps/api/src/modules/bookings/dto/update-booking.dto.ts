import { updateBookingSchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class UpdateBookingDto extends createZodDto(updateBookingSchema) {}
