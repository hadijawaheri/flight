import { z } from "zod";

export const ROLES = ["user", "business", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const userDtoSchema = z.object({
  id: z.string(),
  mobile: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  role: z.enum(ROLES),
});
export type UserDto = z.infer<typeof userDtoSchema>;

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(2, "نام باید حداقل ۲ حرف باشد").max(50),
  lastName: z.string().trim().min(2, "نام خانوادگی باید حداقل ۲ حرف باشد").max(50),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
