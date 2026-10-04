"use client";

import { normalizeDigits } from "@flysmart/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, getErrorMessage } from "@/lib/api/parse";
import { safeRedirect } from "@/lib/safe-redirect";

import { useVerifyOtp } from "../queries";

interface CodeStepProps {
  mobile: string;
  next: string | null;
  onBack: () => void;
}

const CODE_LENGTH = 6;

export function CodeStep({ mobile, next, onBack }: CodeStepProps) {
  const router = useRouter();
  const verifyOtp = useVerifyOtp();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(value: string) {
    setError(null);
    try {
      await verifyOtp.mutateAsync({ mobile, code: value });
      router.replace(safeRedirect(next));
      router.refresh();
    } catch (err) {
      setCode("");
      if (err instanceof ApiError && (err.code === "OTP_INVALID" || err.code === "OTP_EXPIRED")) {
        setError(err.message);
      } else {
        toast.error(getErrorMessage(err));
      }
    }
  }

  // Persian/Arabic digits from the user's keyboard are normalized before the pattern check
  function handleChange(raw: string) {
    const value = normalizeDigits(raw).replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(value);
    setError(null);
    if (value.length === CODE_LENGTH) void submit(value);
  }

  return (
    <FieldGroup>
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor="otp">کد تأیید</FieldLabel>
        <FieldDescription>
          کد ۶ رقمی ارسال‌شده به <bdi dir="ltr">{mobile}</bdi> را وارد کنید.
        </FieldDescription>
        <div dir="ltr" className="flex justify-center">
          <InputOTP
            id="otp"
            maxLength={CODE_LENGTH}
            value={code}
            onChange={handleChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            disabled={verifyOtp.isPending}
            aria-invalid={Boolean(error)}
          >
            <InputOTPGroup>
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        {error && <FieldError>{error}</FieldError>}
      </Field>
      {verifyOtp.isPending && (
        <div className="flex justify-center">
          <Spinner aria-label="در حال بررسی" />
        </div>
      )}
      <Button type="button" variant="ghost" onClick={onBack}>
        ویرایش شماره موبایل
      </Button>
    </FieldGroup>
  );
}
