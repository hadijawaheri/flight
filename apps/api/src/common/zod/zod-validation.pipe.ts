import type { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { ZodError, ZodType } from "zod";

export class ZodValidationException extends BadRequestException {
  constructor(readonly error: ZodError) {
    super("اطلاعات وارد شده معتبر نیست");
  }
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const schema = (metadata.metatype as { schema?: ZodType } | undefined)?.schema;
    if (!schema || metadata.type === "custom") return value;

    const result = schema.safeParse(value);
    if (!result.success) throw new ZodValidationException(result.error);
    return result.data;
  }
}
