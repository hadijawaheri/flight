"use client";

import type { CreatePassengerInput } from "@flysmart/contracts";
import { PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  useCreatePassenger,
  useDeletePassenger,
  usePassengers,
} from "@/features/passengers/queries";

export default function PassengersPage() {
  const { data: passengers, isLoading } = usePassengers();
  const createMutation = useCreatePassenger();
  const deleteMutation = useDeletePassenger();

  const [openAddModal, setOpenAddModal] = React.useState(false);
  const [form, setForm] = React.useState<CreatePassengerInput>({
    firstNameFa: "",
    lastNameFa: "",
    firstNameEn: "",
    lastNameEn: "",
    nationalId: "",
    birthDate: "1995-01-01",
    gender: "MALE",
    passengerType: "ADULT",
    passportNumber: null,
    isDefault: false,
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form, {
      onSuccess: () => {
        toast.success("مسافر جدید با موفقیت به بانک مسافران شما اضافه شد!");
        setOpenAddModal(false);
        setForm({
          firstNameFa: "",
          lastNameFa: "",
          firstNameEn: "",
          lastNameEn: "",
          nationalId: "",
          birthDate: "1995-01-01",
          gender: "MALE",
          passengerType: "ADULT",
          passportNumber: null,
          isDefault: false,
        });
      },
      onError: () => {
        toast.error("خطا در ثبت مشخصات مسافر. لطفا کد ملی و فیلدهای لاتین را بررسی کنید.");
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`آیا از حذف مسافر «${name}» اطمینان دارید؟`)) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("مسافر با موفقیت حذف شد.");
        },
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1 text-start">
          <div className="flex items-center gap-2">
            <UsersIcon className="text-primary size-6" />
            <h1 className="font-heading text-foreground text-2xl font-bold">
              بانک مسافران من (Travelers Vault)
            </h1>
          </div>
          <p className="text-muted-foreground text-xs">
            مشخصات خود و همراهان را اینجا ذخیره کنید تا در تمام خریدهای آینده، تنها با ۱ کلیک در فرم
            قرار گیرند.
          </p>
        </div>

        <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 font-bold shadow-sm">
              <PlusIcon className="size-4" />
              <span>افزودن مسافر جدید</span>
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>افزودن همراه به بانک مسافران</DialogTitle>
              <DialogDescription>
                اطلاعات هویتی زیر برای همیشه در حساب شما ذخیره می‌شود و دیگر نیازی به تایپ آن
                نخواهید داشت.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddSubmit} className="mt-2 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">نام (فارسی):</label>
                  <Input
                    required
                    value={form.firstNameFa}
                    onChange={(e) => setForm({ ...form, firstNameFa: e.target.value })}
                    placeholder="علی"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">نام خانوادگی (فارسی):</label>
                  <Input
                    required
                    value={form.lastNameFa}
                    onChange={(e) => setForm({ ...form, lastNameFa: e.target.value })}
                    placeholder="محمدی"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">نام انگلیسی (لاتین):</label>
                  <Input
                    required
                    value={form.firstNameEn}
                    onChange={(e) => setForm({ ...form, firstNameEn: e.target.value })}
                    placeholder="Ali"
                    className="dir-ltr text-start font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">نام خانوادگی انگلیسی (لاتین):</label>
                  <Input
                    required
                    value={form.lastNameEn}
                    onChange={(e) => setForm({ ...form, lastNameEn: e.target.value })}
                    placeholder="Mohammadi"
                    className="dir-ltr text-start font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">کد ملی (۱۰ رقم):</label>
                  <Input
                    required
                    value={form.nationalId}
                    onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                    placeholder="۰۴۹۹۳۷۰۸۹۹"
                    className="dir-ltr text-start font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">تاریخ تولد (میلادی):</label>
                  <Input
                    type="date"
                    required
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">جنسیت:</label>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value as "MALE" | "FEMALE" })
                    }
                    className="bg-background h-9 rounded-xl border px-3 text-xs font-semibold"
                  >
                    <option value="MALE">مرد (آقا)</option>
                    <option value="FEMALE">زن (خانم)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">شماره گذرنامه (اختیاری):</label>
                  <Input
                    value={form.passportNumber || ""}
                    onChange={(e) => setForm({ ...form, passportNumber: e.target.value || null })}
                    placeholder="A12345678"
                    className="dir-ltr text-start font-mono"
                  />
                </div>
              </div>

              <label className="mt-1 flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="accent-primary size-4"
                />
                <span>این مسافر، خود من هستم (مسافر اصلی حساب)</span>
              </label>

              <DialogFooter className="mt-2">
                <Button type="button" variant="ghost" onClick={() => setOpenAddModal(false)}>
                  انصراف
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="font-bold">
                  {createMutation.isPending ? "در حال ذخیره..." : "ذخیره در بانک مسافران"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Passengers List */}
      {isLoading ? (
        <div className="flex animate-pulse flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-muted h-20 rounded-2xl" />
          ))}
        </div>
      ) : passengers && passengers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {passengers.map((p) => (
            <Card key={p.id} className="bg-card flex flex-col justify-between gap-3 border p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl text-sm font-bold">
                    {p.gender === "MALE" ? "آقا" : "خانم"}
                  </div>
                  <div className="flex flex-col text-start">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-foreground text-base font-bold">
                        {p.firstNameFa} {p.lastNameFa}
                      </span>
                      {p.isDefault && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary text-[10px]"
                        >
                          مسافر اصلی
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground font-mono text-xs">
                      {p.firstNameEn} {p.lastNameEn}
                    </span>
                  </div>
                </div>

                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleDelete(p.id, `${p.firstNameFa} ${p.lastNameFa}`)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>

              <div className="text-muted-foreground flex flex-wrap items-center justify-between border-t pt-2.5 text-xs">
                <span>
                  کد ملی: <strong className="text-foreground font-mono">{p.nationalId}</strong>
                </span>
                <span>
                  تولد: <strong className="text-foreground font-mono">{p.birthDate}</strong>
                </span>
                {p.passportNumber && (
                  <span>
                    گذرنامه:{" "}
                    <strong className="text-foreground font-mono">{p.passportNumber}</strong>
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-12 text-center">
          <UsersIcon className="text-muted-foreground/40 size-12" />
          <h3 className="font-heading text-foreground text-lg font-bold">
            بانک مسافران شما خالی است
          </h3>
          <p className="text-muted-foreground max-w-sm text-xs">
            مشخصات خود و همراهانتان را یک‌بار ثبت کنید تا در تمام خریدهای آینده، تنها با یک کلیک
            بدون تایپ مجدد صادر شوند.
          </p>
          <Button size="sm" onClick={() => setOpenAddModal(true)} className="mt-2 gap-1">
            <PlusIcon className="size-4" />
            <span>افزودن اولین مسافر</span>
          </Button>
        </Card>
      )}
    </div>
  );
}
