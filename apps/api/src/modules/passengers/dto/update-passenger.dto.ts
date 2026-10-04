import { updatePassengerSchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class UpdatePassengerDto extends createZodDto(updatePassengerSchema) {}
