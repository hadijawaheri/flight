import { createPassengerSchema, updatePassengerSchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class CreatePassengerDto extends createZodDto(createPassengerSchema) {}
export class UpdatePassengerDto extends createZodDto(updatePassengerSchema) {}
