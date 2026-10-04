import { updateProfileSchema } from "@flysmart/contracts";

import { createZodDto } from "../../../common/zod/create-zod-dto.js";

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
