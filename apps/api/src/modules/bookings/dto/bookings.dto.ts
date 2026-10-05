import {
  assignSeatsSchema,
  createBookingSchema,
  listBookingsQuerySchema,
  payBookingSchema,
} from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class CreateBookingDto extends createZodDto(createBookingSchema) {}
export class AssignSeatsDto extends createZodDto(assignSeatsSchema) {}
export class ListBookingsQueryDto extends createZodDto(listBookingsQuerySchema) {}
export class PayBookingDto extends createZodDto(payBookingSchema) {}
