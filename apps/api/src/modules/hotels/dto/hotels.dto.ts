import {
  createRoomHoldSchema,
  hotelSearchQuerySchema,
  hotelStayQuerySchema,
} from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class HotelSearchQueryDto extends createZodDto(hotelSearchQuerySchema) {}
export class HotelStayQueryDto extends createZodDto(hotelStayQuerySchema) {}
export class CreateRoomHoldDto extends createZodDto(createRoomHoldSchema) {}
