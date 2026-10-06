import type { ApiResponse, UserDto } from "@flysmart/contracts";
import { Body, Controller, Delete, HttpCode, Patch } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import { UpdateProfileDto } from "./dto/update-profile.dto.js";
import { UsersService } from "./users.service.js";

@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch("me")
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse<UserDto>> {
    return { data: await this.usersService.updateProfile(user.id, dto) };
  }

  @Delete("me")
  @HttpCode(204)
  async deleteMe(@CurrentUser() user: AuthUser): Promise<void> {
    await this.usersService.softDelete(user.id);
  }
}
