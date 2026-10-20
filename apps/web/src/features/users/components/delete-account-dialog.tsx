"use client";

import { normalizeDigits } from "@flysmart/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/parse";
import { paths } from "@/lib/paths";

import { usersApi } from "../api";

export function DeleteAccountDialog({ mobile }: { mobile: string }) {
  const [open, setOpen] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const sendCode = useMutation({ mutationFn: usersApi.requestDeleteCode });
  const remove = useMutation({ mutationFn: usersApi.deleteAccount });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setCodeSent(false);
      setCode("");
    }
  }

  async function requestCode() {
    try {
      await sendCode.mutateAsync();
      setCodeSent(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  }

  async function confirm() {
    try {
      await remove.mutateAsync({ code });
      // Hard navigation drops every cached query of the deleted account
      window.location.replace(paths.home);
    } catch (error: unknown) {
      setCode("");
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          حذف حساب کاربری
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حساب حذف شود؟</AlertDialogTitle>
          <AlertDialogDescription>
            اگر رزرو فعالی دارید، پیش از حذف آن را لغو یا استفاده کنید. حذف حساب قابل بازگشت نیست و
            برای تأیید، یک کد به شماره‌ی <bdi dir="ltr">{mobile}</bdi> پیامک می‌شود.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {codeSent && (
          <Field>
            <FieldLabel htmlFor="delete-account-code">کد تأیید</FieldLabel>
            <div dir="ltr" className="flex justify-center">
              <InputOTP
                id="delete-account-code"
                maxLength={6}
                value={code}
                onChange={(raw) => setCode(normalizeDigits(raw).replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
                inputMode="numeric"
                disabled={remove.isPending}
                autoFocus
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <FieldDescription>کد ۶ رقمی پیامک‌شده را وارد کنید.</FieldDescription>
          </Field>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>انصراف</AlertDialogCancel>
          {codeSent ? (
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirm();
              }}
              disabled={remove.isPending || code.length !== 6}
            >
              {remove.isPending && <Spinner data-icon="inline-start" aria-label="در حال حذف" />}
              حذف حساب
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void requestCode();
              }}
              disabled={sendCode.isPending}
            >
              {sendCode.isPending && (
                <Spinner data-icon="inline-start" aria-label="در حال ارسال کد" />
              )}
              ارسال کد تأیید
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
