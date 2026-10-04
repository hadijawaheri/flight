import type { UserDto } from "@flysmart/contracts";

import type { User } from "./schemas/user.schema.js";

export function toUserDto(user: User): UserDto {
  return {
    id: user._id.toString(),
    mobile: user.mobile,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}
