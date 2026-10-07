import {
  exploreQuerySchema,
  flashDealsQuerySchema,
  tripIdeasQuerySchema,
} from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class FlashDealsQueryDto extends createZodDto(flashDealsQuerySchema) {}
export class ExploreQueryDto extends createZodDto(exploreQuerySchema) {}
export class TripIdeasQueryDto extends createZodDto(tripIdeasQuerySchema) {}
