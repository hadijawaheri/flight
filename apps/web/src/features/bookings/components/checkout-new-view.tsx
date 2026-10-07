"use client";

import type { CreateBookingInput, FlightOfferDto, PassengerDto } from "@flysmart/contracts";
import { passengerDisplayName, passengerIdentityKey, PASSPORT_MESSAGES } from "@flysmart/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, type Path, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { ErrorState } from "@/components/shared/error-state";
import { Toman } from "@/components/shared/toman";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FareBreakdownTable, PASSENGER_TYPE_LABELS, useFlightOffer } from "@/features/flights";
import { PassengerFields, passengersApi, usePassengers } from "@/features/passengers";
import { ApiError, getErrorMessage } from "@/lib/api/parse";
import { dateOfLocalTime, formatNumber } from "@/lib/format";
import { paths } from "@/lib/paths";

import {
  buildCheckoutSchema,
  type CheckoutFormInput,
  type CheckoutFormOutput,
  shortPassportSlots,
  slotTypesFor,
} from "../checkout-schema";
import { useCreateBooking } from "../queries";
import { FlightSummaryLine } from "./flight-summary-line";

interface CheckoutNewViewProps {
  outboundId: string;
  returnId: string | null;
  mix: { adults: number; children: number; infants: number };
  /** The signed-in mobile number: the natural default contact. */
  mobile: string;
}

type PassengerInput = CheckoutFormInput["passengers"][number];

function emptyPassenger(): Partial<PassengerInput> {
  return {
    firstNameFa: "",
    lastNameFa: "",
    firstNameEn: "",
    lastNameEn: "",
    nationality: "IR",
    nationalId: "",
    birthDate: "",
    gender: undefined,
    passportNumber: null,
    passportExpiry: null,
  };
}

function fromVault(saved: PassengerDto): PassengerInput {
  return {
    savedPassengerId: saved.id,
    firstNameFa: saved.firstNameFa,
    lastNameFa: saved.lastNameFa,
    firstNameEn: saved.firstNameEn,
    lastNameEn: saved.lastNameEn,
    nationality: saved.nationality,
    nationalId: saved.nationalId,
    birthDate: saved.birthDate,
    gender: saved.gender,
    passportNumber: saved.passportNumber,
    passportExpiry: saved.passportExpiry,
  };
}

interface FieldIssue {
  path: string;
  message: string;
}

function issuesOf(error: ApiError): FieldIssue[] {
  if (!Array.isArray(error.details)) return [];
  return error.details.filter(
    (item): item is FieldIssue =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as FieldIssue).path === "string" &&
      typeof (item as FieldIssue).message === "string",
  );
}

export function CheckoutNewView({ outboundId, returnId, mix, mobile }: CheckoutNewViewProps) {
  const router = useRouter();
  const outbound = useFlightOffer(outboundId, mix);
  const inbound = useFlightOffer(returnId ?? "", mix, returnId !== null);
  const vault = usePassengers();
  const createBooking = useCreateBooking();
  const [saveToVault, setSaveToVault] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  const offers: FlightOfferDto[] = [outbound.data, inbound.data].filter(
    (offer): offer is FlightOfferDto => offer !== undefined,
  );
  const loading = outbound.isPending || (returnId !== null && inbound.isPending);
  const failed = outbound.isError ? outbound : inbound.isError ? inbound : null;

  const slotTypes = slotTypesFor(mix);
  const international = offers.some((offer) => offer.international);
  const flightDates = offers.map((offer) => dateOfLocalTime(offer.origin.localTime));
  const schema = buildCheckoutSchema({ slotTypes, flightDates, international });

  const form = useForm<CheckoutFormInput, unknown, CheckoutFormOutput>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      passengers: slotTypes.map(() => emptyPassenger()),
      contact: { mobile, email: "" },
      seatPreference: "ANY",
      passportValidityAcknowledged: false,
    },
  });

  // The traveler's default passport-holder fills the first slot once, so repeat bookings start filled in.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !vault.data) return;
    prefilled.current = true;
    const preferred = vault.data.find((item) => item.isDefault);
    if (preferred && !form.formState.isDirty) form.setValue("passengers.0", fromVault(preferred));
  }, [vault.data, form]);

  const watched = useWatch({ control: form.control, name: "passengers" });
  const shortPassports = shortPassportSlots(watched, { flightDates, international });
  const quotedTotal = offers.reduce((sum, offer) => sum + offer.fare.total, 0);

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null);
    const payload: CreateBookingInput = {
      outboundFlightId: outboundId,
      ...(returnId ? { returnFlightId: returnId } : {}),
      passengers: values.passengers,
      contact: values.contact,
      quotedTotal,
      seatPreference: values.seatPreference,
      passportValidityAcknowledged: values.passportValidityAcknowledged,
    };
    try {
      const booking = await createBooking.mutateAsync(payload);
      if (saveToVault) void rememberTravelers(values.passengers, vault.data ?? []);
      router.replace(paths.checkout(booking.id));
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        if (error.code === "FARE_CHANGED") {
          void outbound.refetch();
          void inbound.refetch();
          setBanner(
            "قیمت این پرواز در همین لحظه تغییر کرد. مبلغ جدید را بررسی کنید و دوباره ادامه دهید.",
          );
          return;
        }
        const fieldIssues = issuesOf(error);
        for (const issue of fieldIssues) {
          form.setError(issue.path as Path<CheckoutFormInput>, { message: issue.message });
        }
        setBanner(error.message);
        return;
      }
      toast.error(getErrorMessage(error));
    }
  });

  if (loading) {
    return (
      <div
        className="grid gap-6 lg:grid-cols-[1fr_22rem]"
        role="status"
        aria-label="در حال بارگذاری"
      >
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (failed) {
    return (
      <ErrorState
        error={failed.error}
        onRetry={() => void failed.refetch()}
        title="اطلاعات پرواز دریافت نشد"
      />
    );
  }

  const taken = new Set(watched.map((passenger) => passenger?.savedPassengerId).filter(Boolean));

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {banner && (
          <Alert variant="destructive" role="alert">
            <AlertTriangleIcon />
            <AlertTitle>رزرو انجام نشد</AlertTitle>
            <AlertDescription>{banner}</AlertDescription>
          </Alert>
        )}

        {international && (
          <Alert>
            <AlertTitle>پرواز خارجی</AlertTitle>
            <AlertDescription>
              گذرنامه‌ی هر مسافر الزامی است و بهتر است حداقل ۶ ماه پس از آخرین پرواز اعتبار داشته
              باشد. نام لاتین را دقیقاً مطابق گذرنامه بنویسید.
            </AlertDescription>
          </Alert>
        )}

        {slotTypes.some((type) => type !== "ADULT") && (
          <Alert>
            <AlertTitle>همراه کودک و نوزاد</AlertTitle>
            <AlertDescription>
              در هر رزرو، همراه کودک یا نوزاد باید حداقل ۱۸ سال داشته باشد و به ازای هر نوزاد یک
              همراه ۱۸ سال به بالا لازم است؛ مسافر ۱۲ تا ۱۷ ساله به‌تنهایی نمی‌تواند مسئول آن‌ها
              باشد.
            </AlertDescription>
          </Alert>
        )}

        {slotTypes.map((type, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">
                مسافر {formatNumber(index + 1)}{" "}
                <span className="text-muted-foreground text-sm font-normal">
                  ({PASSENGER_TYPE_LABELS[type]})
                </span>
              </CardTitle>
              {vault.data && vault.data.length > 0 && (
                <div className="max-w-xs">
                  <Select
                    onValueChange={(id) => {
                      const saved = vault.data?.find((item) => item.id === id);
                      if (saved)
                        form.setValue(`passengers.${index}`, fromVault(saved), {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                    }}
                  >
                    <SelectTrigger
                      aria-label={`انتخاب مسافر ${formatNumber(index + 1)} از مسافران ذخیره‌شده`}
                    >
                      <SelectValue placeholder="انتخاب از مسافران ذخیره‌شده" />
                    </SelectTrigger>
                    <SelectContent>
                      {vault.data.map((saved) => (
                        <SelectItem
                          key={saved.id}
                          value={saved.id}
                          disabled={
                            taken.has(saved.id) &&
                            form.getValues(`passengers.${index}.savedPassengerId`) !== saved.id
                          }
                        >
                          {passengerDisplayName(saved)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <PassengerFields
                control={form.control}
                prefix={`passengers.${index}`}
                passport={international ? "required" : "optional"}
                birthYearsBack={type === "ADULT" ? 110 : 12}
              />
            </CardContent>
          </Card>
        ))}

        {shortPassports.length > 0 && (
          <div className="flex flex-col gap-3">
            <Alert className="bg-warning-soft text-warning-ink">
              <AlertTriangleIcon />
              <AlertTitle>اعتبار گذرنامه کمتر از ۶ ماه است</AlertTitle>
              <AlertDescription className="text-warning-ink">
                <p>{PASSPORT_MESSAGES.shortValidity}</p>
                <p>
                  مسافران مشمول:{" "}
                  {shortPassports.map((slot) => `مسافر ${formatNumber(slot + 1)}`).join("، ")}
                </p>
              </AlertDescription>
            </Alert>
            <Controller
              name="passportValidityAcknowledged"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                  <Checkbox
                    id="passport-validity-ack"
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="passport-validity-ack" className="font-normal">
                      {PASSPORT_MESSAGES.acknowledgementLabel}
                    </FieldLabel>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </FieldContent>
                </Field>
              )}
            />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">اطلاعات تماس</CardTitle>
            <CardDescription>
              شماره‌ی تماس برای شناسایی رزرو و هماهنگی‌های پرواز است. در این نسخه‌ی نمایشی پیامکی
              ارسال نمی‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  name="contact.mobile"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="contact-mobile">شماره موبایل</FieldLabel>
                      <Input
                        {...field}
                        id="contact-mobile"
                        type="tel"
                        inputMode="numeric"
                        dir="ltr"
                        className="text-start"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="contact.email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="contact-email">
                        ایمیل <span className="text-muted-foreground font-normal">(اختیاری)</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        id="contact-email"
                        type="email"
                        dir="ltr"
                        className="text-start"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
              <Controller
                name="seatPreference"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel id="seat-pref-label">ترجیح صندلی</FieldLabel>
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={(value) => value && field.onChange(value)}
                      aria-labelledby="seat-pref-label"
                    >
                      <ToggleGroupItem value="ANY">فرقی ندارد</ToggleGroupItem>
                      <ToggleGroupItem value="WINDOW">کنار پنجره</ToggleGroupItem>
                      <ToggleGroupItem value="AISLE">کنار راهرو</ToggleGroupItem>
                    </ToggleGroup>
                    <FieldDescription>
                      صندلی‌ها خودکار کنار هم رزرو می‌شوند؛ بعد از رزرو می‌توانید تک‌تک جابه‌جا
                      کنید.
                    </FieldDescription>
                  </Field>
                )}
              />
              <Field orientation="horizontal">
                <Checkbox
                  id="save-to-vault"
                  checked={saveToVault}
                  onCheckedChange={(checked) => setSaveToVault(checked === true)}
                />
                <FieldLabel htmlFor="save-to-vault" className="font-normal">
                  مشخصات مسافران برای خرید بعدی ذخیره شود
                </FieldLabel>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="خلاصه‌ی سفر">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">خلاصه‌ی سفر</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {offers.map((offer, index) => (
              <div
                key={offer.id}
                className="flex flex-col gap-3 border-b pb-4 last:border-b-0 last:pb-0"
              >
                <FlightSummaryLine
                  flight={offer}
                  direction={returnId ? (index === 0 ? "OUTBOUND" : "RETURN") : undefined}
                />
                <Collapsible>
                  <CollapsibleTrigger className="text-primary text-xs underline underline-offset-4">
                    جزئیات قیمت
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <FareBreakdownTable fare={offer.fare} />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t pt-4">
              <span className="font-semibold">جمع کل</span>
              <Toman rial={quotedTotal} className="text-xl" />
            </div>
            <Button type="submit" size="lg" disabled={createBooking.isPending}>
              {createBooking.isPending && (
                <Spinner data-icon="inline-start" aria-label="در حال ثبت" />
              )}
              ثبت رزرو و رفتن به پرداخت
            </Button>
            <p className="text-muted-foreground text-xs">
              پس از ثبت، صندلی‌ها ۱۵ دقیقه برای شما نگه داشته می‌شود تا پرداخت را کامل کنید.
            </p>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

/** Best effort: failing to remember a traveler must never undo a booking that already succeeded. */
async function rememberTravelers(
  passengers: CheckoutFormOutput["passengers"],
  vault: readonly PassengerDto[],
): Promise<void> {
  const known = new Set(vault.map((item) => passengerIdentityKey(item)));
  for (const passenger of passengers) {
    const key = passengerIdentityKey(passenger);
    if (passenger.savedPassengerId || key === null || known.has(key)) continue;
    try {
      await passengersApi.create({ ...passenger, isDefault: false });
    } catch {
      // Intentionally ignored: the vault is a convenience.
    }
  }
}
