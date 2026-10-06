import type { UserDto } from "@flysmart/contracts";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import type { UpdateProfileDto } from "./dto/update-profile.dto.js";
import type { UserDocument } from "./schemas/user.schema.js";
import { User } from "./schemas/user.schema.js";
import { toUserDto } from "./users.mapper.js";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async getById(id: string): Promise<UserDto> {
    const user = await this.userModel.findById(id).lean();
    if (!user) throw new NotFoundException("کاربر یافت نشد");
    return toUserDto(user);
  }

  async findOrCreateByMobile(mobile: string): Promise<UserDto> {
    const user = await this.userModel
      .findOneAndUpdate(
        { mobile },
        { $setOnInsert: { mobile, role: "user" } },
        { upsert: true, returnDocument: "after" },
      )
      .lean();
    return toUserDto(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserDto> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: "after" })
      .lean();
    if (!user) throw new NotFoundException("کاربر یافت نشد");
    return toUserDto(user);
  }

  async softDelete(id: string): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { $set: { deletedAt: new Date() } });
  }
}
