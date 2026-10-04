"use client";

import type { UpdateProfileInput, UserDto } from "@flysmart/contracts";
import { updateProfileSchema } from "@flysmart/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/parse";

import { useUpdateProfile } from "../queries";

export function ProfileForm({ user }: { user: UserDto }) {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    mode: "onTouched",
    defaultValues: { firstName: user.firstName ?? "", lastName: user.lastName ?? "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync(values);
      toast.success("پروفایل ذخیره شد");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    // The form wraps the Card: a form inside Card breaks the Card's flex gap
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>پروفایل</CardTitle>
          <CardDescription>اطلاعات حساب شما</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {(["firstName", "lastName"] as const).map((name) => (
              <Controller
                key={name}
                name={name}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {name === "firstName" ? "نام" : "نام خانوادگی"}
                    </FieldLabel>
                    <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            ))}
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending && (
              <Spinner data-icon="inline-start" aria-label="در حال ذخیره" />
            )}
            ذخیره
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
