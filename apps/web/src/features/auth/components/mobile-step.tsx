"use client";

import type { RequestOtpInput } from "@flysmart/contracts";
import { requestOtpSchema } from "@flysmart/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/parse";

import { useRequestOtp } from "../queries";

interface MobileStepProps {
  onSent: (mobile: string) => void;
}

export function MobileStep({ onSent }: MobileStepProps) {
  const form = useForm<RequestOtpInput>({
    resolver: zodResolver(requestOtpSchema),
    mode: "onTouched",
    defaultValues: { mobile: "" },
  });
  const requestOtp = useRequestOtp();

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await requestOtp.mutateAsync(values);
      onSent(values.mobile);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          name="mobile"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>شماره موبایل</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                dir="ltr"
                className="text-start"
                placeholder="09123456789"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" size="lg" disabled={requestOtp.isPending}>
          {requestOtp.isPending && <Spinner data-icon="inline-start" aria-label="در حال ارسال" />}
          دریافت کد تأیید
        </Button>
      </FieldGroup>
    </form>
  );
}
