import { flightSearchQuerySchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class FlightSearchQueryDto extends createZodDto(flightSearchQuerySchema) {}
