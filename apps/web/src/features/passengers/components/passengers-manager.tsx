"use client";

import type { PassengerDto } from "@flysmart/contracts";
import {
  createPassengerSchema,
  maskNationalCode,
  maskPassportNumber,
  nationalityNameFa,
  passengerDisplayName,
} from "@flysmart/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon, PlusIcon, StarIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { ErrorState } from "@/components/shared/error-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/api/parse";
import { formatJalaliShort } from "@/lib/format";

import {
  useCreatePassenger,
  useDeletePassenger,
  usePassengers,
  useUpdatePassenger,
} from "../queries";
import { PassengerFields } from "./passenger-fields";

type FormInput = z.input<typeof createPassengerSchema>;
type FormOutput = z.output<typeof createPassengerSchema>;

const EMPTY: Partial<FormInput> = {
  firstNameFa: "",
  lastNameFa: "",
  firstNameEn: "",
  lastNameEn: "",
  nationality: "IR",
  nationalId: "",
  birthDate: "",
  passportNumber: null,
  passportExpiry: null,
  isDefault: false,
};

export function PassengersManager() {
  const { data, isPending, isError, error, refetch } = usePassengers();
  const [editing, setEditing] = useState<PassengerDto | "new" | null>(null);
  const [removing, setRemoving] = useState<PassengerDto | null>(null);
  const remove = useDeletePassenger();

  async function confirmRemove() {
    if (!removing) return;
    try {
      await remove.mutateAsync(removing.id);
      toast.success("مسافر حذف شد.");
      setRemoving(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setEditing("new")}>
          <PlusIcon data-icon="inline-start" />
          افزودن مسافر
        </Button>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3" role="status" aria-label="در حال بارگذاری مسافران">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="دریافت مسافران انجام نشد" />
      ) : data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>هنوز مسافری ذخیره نکرده‌اید</EmptyTitle>
            <EmptyDescription>
              مشخصات خود و همسفران را یک‌بار ذخیره کنید تا در خریدهای بعدی با یک کلیک پر شود.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={() => setEditing("new")}>
              افزودن اولین مسافر
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" role="list">
          {data.map((passenger) => (
            <li key={passenger.id}>
              <Card className="flex-row items-start justify-between gap-3 p-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{passengerDisplayName(passenger)}</span>
                    {passenger.isDefault && (
                      <Badge variant="secondary">
                        <StarIcon aria-hidden="true" />
                        پیش‌فرض
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground tnum text-xs" dir="ltr">
                    {passenger.firstNameEn} {passenger.lastNameEn}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {passenger.nationalId ? (
                      <>
                        کد ملی{" "}
                        <bdi dir="ltr" className="tnum">
                          {maskNationalCode(passenger.nationalId)}
                        </bdi>
                      </>
                    ) : (
                      <>
                        {nationalityNameFa(passenger.nationality)} · گذرنامه{" "}
                        <bdi dir="ltr" className="tnum">
                          {maskPassportNumber(passenger.passportNumber) ?? "—"}
                        </bdi>
                      </>
                    )}{" "}
                    · تولد {formatJalaliShort(passenger.birthDate)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditing(passenger)}
                    aria-label={`ویرایش ${passengerDisplayName(passenger)}`}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setRemoving(passenger)}
                    aria-label={`حذف ${passengerDisplayName(passenger)}`}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <PassengerDialog
          // Remounts the form for every passenger so no field carries over from the previous one.
          key={editing === "new" ? "new" : editing.id}
          passenger={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف این مسافر؟</AlertDialogTitle>
            <AlertDialogDescription>
              {removing && passengerDisplayName(removing)} از فهرست شما حذف می‌شود. رزروهای قبلی
              تغییری نمی‌کنند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmRemove();
              }}
              disabled={remove.isPending}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PassengerDialog({
  passenger,
  onClose,
}: {
  passenger: PassengerDto | null;
  onClose: () => void;
}) {
  const create = useCreatePassenger();
  const update = useUpdatePassenger();
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createPassengerSchema),
    mode: "onTouched",
    defaultValues: passenger ? { ...passenger } : EMPTY,
  });
  const pending = create.isPending || update.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (passenger) await update.mutateAsync({ id: passenger.id, input: values });
      else await create.mutateAsync(values);
      toast.success(passenger ? "تغییرات ذخیره شد." : "مسافر ذخیره شد.");
      onClose();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{passenger ? "ویرایش مسافر" : "افزودن مسافر"}</DialogTitle>
          <DialogDescription>نام لاتین را دقیقاً مطابق گذرنامه بنویسید.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <PassengerFields control={form.control} prefix="" passport="optional" />
          <Controller
            name="isDefault"
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Switch
                  id="passenger-default"
                  checked={field.value === true}
                  onCheckedChange={field.onChange}
                />
                <FieldLabel htmlFor="passenger-default" className="font-normal">
                  مسافر پیش‌فرض (در خرید بعدی خودکار پر شود)
                </FieldLabel>
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              انصراف
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" aria-label="در حال ذخیره" />}
              ذخیره
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
