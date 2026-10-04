import type { z, ZodType } from "zod";

export interface ZodDtoStatic<S extends ZodType> {
  new (): z.infer<S>;
  readonly schema: S;
}

export function createZodDto<S extends ZodType>(schema: S): ZodDtoStatic<S> {
  class ZodDto {
    static readonly schema = schema;
  }
  return ZodDto as unknown as ZodDtoStatic<S>;
}
