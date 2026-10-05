import {
  fareCalendarQuerySchema,
  flightQuoteQuerySchema,
  searchFlightsQuerySchema,
} from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class SearchFlightsQueryDto extends createZodDto(searchFlightsQuerySchema) {}
export class FlightQuoteQueryDto extends createZodDto(flightQuoteQuerySchema) {}
export class FareCalendarQueryDto extends createZodDto(fareCalendarQuerySchema) {}
