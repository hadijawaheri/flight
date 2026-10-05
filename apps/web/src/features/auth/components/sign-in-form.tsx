"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { RequestOtpInput } from "@flysmart/contracts";
import { normalizeDigits, requestOtpSchema } from "@flysmart/contracts";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/parse";
import { safeRedirect } from "@/lib/safe-redirect";

import { useRequestOtp, useVerifyOtp } from "../queries";

interface SignInFormProps {
  next: string | undefined;
}

export function SignInForm({ next }: SignInFormProps) {
  const [mobile, setMobile] = useState<string | null>(null);

  return mobile === null ? (
    <MobileStep onSent={setMobile} />
  ) : (
    <CodeStep mobile={mobile} next={next} onBack={() => setMobile(null)} />
  );
}

function MobileStep({ onSent }: { onSent: (mobile: string) => void }) {
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
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">ورود یا ثبت‌نام</CardTitle>
          <CardDescription>
            برای رزرو و دیدن سفرهایتان، شماره موبایل خود را وارد کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {requestOtp.isPending && (
                <Spinner data-icon="inline-start" aria-label="در حال ارسال" />
              )}
              دریافت کد تأیید
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}

function CodeStep({
  mobile,
  next,
  onBack,
}: {
  mobile: string;
  next: string | undefined;
  onBack: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const verify = useVerifyOtp();

  async function submit(value: string) {
    try {
      await verify.mutateAsync({ mobile, code: value });
      router.replace(safeRedirect(next));
      router.refresh();
    } catch (error) {
      setCode("");
      toast.error(getErrorMessage(error));
    }
  }

  function handleChange(raw: string) {
    // Persian keyboards type ۱۲۳; normalise before the slots see it, then submit on the sixth digit
    const digits = normalizeDigits(raw).replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !verify.isPending) void submit(digits);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">کد تأیید را وارد کنید</CardTitle>
        <CardDescription>
          کد ۶ رقمی به شماره <bdi dir="ltr">{mobile}</bdi> پیامک شد.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="otp-code">کد تأیید</FieldLabel>
            <div dir="ltr" className="flex justify-center">
              <InputOTP
                id="otp-code"
                maxLength={6}
                value={code}
                onChange={handleChange}
                autoComplete="one-time-code"
                inputMode="numeric"
                disabled={verify.isPending}
                autoFocus
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <FieldDescription>با وارد کردن رقم ششم، ورود خودکار انجام می‌شود.</FieldDescription>
          </Field>
          {verify.isPending && (
            <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
              <Spinner aria-label="در حال بررسی کد" /> در حال بررسی کد…
            </div>
          )}
          <Button type="button" variant="ghost" onClick={onBack} disabled={verify.isPending}>
            <ArrowLeftIcon data-icon="inline-start" className="rtl:rotate-180" />
            تغییر شماره
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
