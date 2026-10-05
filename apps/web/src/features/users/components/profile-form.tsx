"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema } from "@flysmart/contracts";
import type { UpdateProfileInput, UserDto } from "@flysmart/contracts";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/parse";
import { paths } from "@/lib/paths";

import { usersApi } from "../api";

export function ProfileForm({ user }: { user: UserDto }) {
  const router = useRouter();
  const save = useMutation({ mutationFn: usersApi.updateProfile });
  const deleteAccount = useMutation({ mutationFn: usersApi.deleteAccount });
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

  async function removeAccount() {
    try {
      await deleteAccount.mutateAsync();
      router.replace(paths.home);
      router.refresh();
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
          <CardTitle className="text-lg">حذف حساب</CardTitle>
          <CardDescription>
            با حذف حساب، دسترسی شما به رزروها و مسافران ذخیره‌شده بسته می‌شود. این کار قابل بازگشت
            نیست. برای خروج از حساب از منوی بالای صفحه استفاده کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                حذف حساب کاربری
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>حساب حذف شود؟</AlertDialogTitle>
                <AlertDialogDescription>
                  اگر رزرو فعالی دارید، پیش از حذف آن را لغو یا استفاده کنید. حذف حساب قابل بازگشت
                  نیست.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>انصراف</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault();
                    void removeAccount();
                  }}
                  disabled={deleteAccount.isPending}
                >
                  حذف حساب
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
