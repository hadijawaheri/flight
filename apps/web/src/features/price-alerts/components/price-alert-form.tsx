"use client";

import type { Cabin } from "@flysmart/contracts";
import { createPriceAlertSchema, tomanToRial } from "@flysmart/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { BellPlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, getErrorMessage } from "@/lib/api/parse";
import { formatTomanNumber } from "@/lib/format";
import { paths } from "@/lib/paths";

import { useCreatePriceAlert } from "../queries";
import { type TargetFormInput, type TargetFormOutput, targetFormSchema } from "../target-schema";

interface PriceAlertFormProps {
  origin: string;
  destination: string;
  date: string;
  cabin: Cabin;
  /** Today's price, rial; the target must undercut it to be useful. */
  currentPrice: number;
  /** Rial; prefilled when the analysis suggests a realistic target. */
  suggested: number | null;
}

export function PriceAlertForm({
  origin,
  destination,
  date,
  cabin,
  currentPrice,
  suggested,
}: PriceAlertFormProps) {
  const create = useCreatePriceAlert();
  const router = useRouter();
  const start = suggested ?? Math.round((currentPrice * 0.9) / 100_000) * 100_000;
  const form = useForm<TargetFormInput, unknown, TargetFormOutput>({
    resolver: zodResolver(targetFormSchema),
    mode: "onTouched",
    defaultValues: { targetToman: String(Math.round(start / 10)) },
  });

  const onSubmit = form.handleSubmit(async ({ targetToman }) => {
    const targetPrice = tomanToRial(targetToman);
    if (targetPrice >= currentPrice) {
      form.setError("targetToman", { message: "مبلغ هدف باید کمتر از قیمت فعلی باشد" });
      return;
    }
    const parsed = createPriceAlertSchema.safeParse({
      origin,
      destination,
      date,
      cabin,
      targetPrice,
    });
    if (!parsed.success) {
      form.setError("targetToman", {
        message: parsed.error.issues[0]?.message ?? "هشدار معتبر نیست",
      });
      return;
    }
    try {
      await create.mutateAsync(parsed.data);
      toast.success("هشدار قیمت ثبت شد؛ با رسیدن به این مبلغ خبرتان می‌کنیم.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        toast.error("برای ثبت هشدار ابتدا وارد شوید.", {
          action: {
            label: "ورود",
            onClick: () =>
              router.push(
                `${paths.signIn}?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
              ),
          },
        });
        return;
      }
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="ثبت هشدار قیمت">
      <FieldGroup>
        <Controller
          name="targetToman"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="alert-target">
                وقتی قیمت به این مبلغ رسید خبرم کن (تومان)
              </FieldLabel>
              <Input
                {...field}
                id="alert-target"
                inputMode="numeric"
                dir="ltr"
                className="text-start"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                قیمت فعلی: <bdi>{formatTomanNumber(currentPrice)}</bdi> تومان برای هر بزرگسال
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? (
              <Spinner data-icon="inline-start" aria-label="در حال ثبت" />
            ) : (
              <BellPlusIcon data-icon="inline-start" />
            )}
            ثبت هشدار
          </Button>
          <Button asChild variant="link" className="h-auto p-0">
            <Link href={paths.priceAlerts}>هشدارهای من</Link>
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
