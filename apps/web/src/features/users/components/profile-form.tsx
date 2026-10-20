"use client";

import type { UpdateProfileInput, UserDto } from "@flysmart/contracts";
import { updateProfileSchema } from "@flysmart/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/parse";
import { paths } from "@/lib/paths";

import { usersApi } from "../api";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function ProfileForm({ user }: { user: UserDto }) {
  const router = useRouter();
  const save = useMutation({ mutationFn: usersApi.updateProfile });
  const logoutEverywhere = useMutation({ mutationFn: usersApi.logoutEverywhere });
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    mode: "onTouched",
    defaultValues: { firstName: user.firstName ?? "", lastName: user.lastName ?? "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      toast.success("مشخصات ذخیره شد.");
      router.refresh();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  });

  async function signOutEverywhere() {
    try {
      await logoutEverywhere.mutateAsync();
      window.location.replace(paths.home);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <form onSubmit={onSubmit} noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">مشخصات من</CardTitle>
            <CardDescription>
              شماره‌ی ورود: <bdi dir="ltr">{user.mobile}</bdi>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  name="firstName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="profile-first">نام</FieldLabel>
                      <Input
                        {...field}
                        id="profile-first"
                        autoComplete="given-name"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="lastName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="profile-last">نام خانوادگی</FieldLabel>
                      <Input
                        {...field}
                        id="profile-last"
                        autoComplete="family-name"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
              <Button type="submit" className="w-fit" disabled={save.isPending}>
                {save.isPending && <Spinner data-icon="inline-start" aria-label="در حال ذخیره" />}
                ذخیره
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">دستگاه‌های واردشده</CardTitle>
          <CardDescription>
            اگر روی دستگاه دیگری وارد شده‌اید و به آن دسترسی ندارید، از همه‌ی دستگاه‌ها خارج شوید.
            نشست‌ها پس از یک هفته استفاده‌نکردن و حداکثر ۳۰ روز پس از ورود خودکار بسته می‌شوند.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => void signOutEverywhere()}
            disabled={logoutEverywhere.isPending}
          >
            {logoutEverywhere.isPending && (
              <Spinner data-icon="inline-start" aria-label="در حال خروج" />
            )}
            خروج از همه‌ی دستگاه‌ها
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">حذف حساب</CardTitle>
          <CardDescription>
            با حذف حساب، دسترسی شما به رزروها و مسافران ذخیره‌شده بسته می‌شود. این کار قابل بازگشت
            نیست. برای خروج از حساب از منوی بالای صفحه استفاده کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog mobile={user.mobile} />
        </CardContent>
      </Card>
    </div>
  );
}
