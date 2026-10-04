import type { PriceAlertDto } from "@flysmart/contracts";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { FlightProvider } from "../../infra/flight/flight.provider.js";
import { SmsProvider } from "../../infra/sms/sms.provider.js";
import { UsersService } from "../users/users.service.js";
import type { CreatePriceAlertDto } from "./dto/create-price-alert.dto.js";
import { toPriceAlertDto } from "./price-alerts.mapper.js";
import { PriceAlert, type PriceAlertDocument } from "./schemas/price-alert.schema.js";

@Injectable()
export class PriceAlertsService {
  constructor(
    @InjectModel(PriceAlert.name)
    private readonly alertModel: Model<PriceAlertDocument>,
    private readonly flightProvider: FlightProvider,
    private readonly usersService: UsersService,
    private readonly smsProvider: SmsProvider,
  ) {}

  async listByUser(userId: string): Promise<PriceAlertDto[]> {
    const docs = await this.alertModel
      .find({ userId: new Types.ObjectId(userId), deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();

    return docs.map(toPriceAlertDto);
  }

  async create(userId: string | undefined, input: CreatePriceAlertDto): Promise<PriceAlertDto> {
    let effectiveUserId = userId;
    if (!effectiveUserId && input.mobile) {
      const user = await this.usersService.findOrCreateByMobile(input.mobile);
      effectiveUserId = user.id;
    }
    const userObjId = new Types.ObjectId(effectiveUserId);

    // Check current lowest price for this route
    const nowStr = new Date().toISOString().split("T")[0]!;
    const matrix = await this.flightProvider.getFareMatrix(
      input.origin,
      input.destination,
      input.targetDate || nowStr,
      7,
    );
    const currentLowest =
      matrix.length > 0 ? Math.min(...matrix.map((m) => m.lowestPrice)) : 18500000;

    const doc = await this.alertModel.create({
      userId: userObjId,
      origin: input.origin,
      originName: input.originName,
      destination: input.destination,
      destinationName: input.destinationName,
      targetMaxPrice: input.targetMaxPrice,
      targetDate: input.targetDate ?? null,
      currentLowestPrice: currentLowest,
      notifyViaSms: input.notifyViaSms,
      mobile: input.mobile ?? null,
      isActive: true,
    });

    // If current price is already below target, trigger immediate notification
    if (currentLowest <= input.targetMaxPrice && input.notifyViaSms && input.mobile) {
      await this.smsProvider.sendNotification(
        input.mobile,
        `پرواز پلاس: قیمت پرواز ${input.originName} به ${input.destinationName} به ${currentLowest.toLocaleString("fa-IR")} ریال رسید (کمتر از سقف درخواستی شما)! هم‌اکنون رزرو کنید: https://flysmart.ir`,
      );
      doc.lastTriggeredAt = new Date();
      await doc.save();
    }

    return toPriceAlertDto(doc);
  }

  async toggleActive(userId: string, alertId: string): Promise<PriceAlertDto> {
    const doc = await this.alertModel
      .findOne({
        _id: new Types.ObjectId(alertId),
        userId: new Types.ObjectId(userId),
        deletedAt: null,
      })
      .exec();

    if (!doc) {
      throw new NotFoundException("دیده‌بان قیمت یافت نشد");
    }

    doc.isActive = !doc.isActive;
    await doc.save();
    return toPriceAlertDto(doc);
  }

  async delete(userId: string, alertId: string): Promise<void> {
    const doc = await this.alertModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(alertId),
          userId: new Types.ObjectId(userId),
          deletedAt: null,
        },
        { $set: { deletedAt: new Date(), isActive: false } },
      )
      .exec();

    if (!doc) {
      throw new NotFoundException("دیده‌بان قیمت یافت نشد");
    }
  }
}
