"use client";

import { BellIcon, CheckCircle2Icon, SparklesIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreatePriceAlert } from "@/features/price-alerts/queries";

interface PriceAlertDialogProps {
  originCode: string;
  originName: string;
  destinationCode: string;
  destinationName: string;
  currentLowestPrice: number;
}

export function PriceAlertDialog({
  originCode,
  originName,
  destinationCode,
  destinationName,
  currentLowestPrice,
}: PriceAlertDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [targetPrice, setTargetPrice] = React.useState(
    Math.round(currentLowestPrice * 0.85).toString(),
  );
  const [mobile, setMobile] = React.useState("");

  const createAlertMutation = useCreatePriceAlert();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim()) {
      toast.error("لطفا شماره موبایل خود را وارد کنید");
      return;
    }

    createAlertMutation.mutate(
      {
        origin: originCode,
        originName,
        destination: destinationCode,
        destinationName,
        targetMaxPrice: Number(targetPrice),
        notifyViaSms: true,
        mobile,
      },
      {
        onSuccess: () => {
          toast.success("دیده‌بان قیمت فعال شد! به محض کاهش نرخ پیامک دریافت خواهید کرد.");
          setOpen(false);
        },
        onError: () => {
          toast.error("خطا در ثبت دیده‌بان قیمت. لطفا دوباره تلاش کنید.");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-primary/50 text-primary hover:bg-primary/5 gap-1.5 border-dashed"
        >
          <BellIcon className="size-3.5" />
          <span>دیده‌بان کاهش قیمت</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="text-primary mb-1 flex items-center gap-2">
            <SparklesIcon className="size-5" />
            <DialogTitle>اطلاع از کاهش قیمت این مسیر</DialogTitle>
          </div>
          <DialogDescription>
            مسیر {originName} به {destinationName} را زیر نظر بگیرید. به محض آنکه پروازی کمتر از
            بودجه شما باز شد، فورا از طریق پیامک مطلع می‌شوید.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-semibold">
              سقف قیمت مدنظر شما (ریال):
            </label>
            <Input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="text-start font-bold"
              required
            />
            <span className="text-muted-foreground text-[11px]">
              کمترین نرخ کنونی: {currentLowestPrice.toLocaleString("fa-IR")} ریال
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-semibold">
              شماره موبایل جهت دریافت پیامک:
            </label>
            <Input
              type="tel"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="dir-ltr text-start"
              required
            />
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={createAlertMutation.isPending}
              className="gap-2 font-bold"
            >
              <CheckCircle2Icon className="size-4" />
              <span>{createAlertMutation.isPending ? "در حال ثبت..." : "فعال‌سازی دیده‌بان"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
