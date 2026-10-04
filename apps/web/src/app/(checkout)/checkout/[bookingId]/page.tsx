"use client";

import {
  type BookingDto,
  type BookingPassengerInput,
  isValidNationalCode,
  type PassengerDto,
} from "@flysmart/contracts";
import {
  CreditCardIcon,
  Loader2Icon,
  LockIcon,
  PlaneIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useBookingDetail,
  useInitiatePayment,
  useUpdateBooking,
} from "@/features/bookings/queries";
import { TravelersVaultSelector } from "@/features/passengers/components/travelers-vault-selector";
import { paths } from "@/lib/paths";

function CheckoutForm({ booking }: { booking: BookingDto }) {
  const bookingId = booking.id;
  const updateBookingMutation = useUpdateBooking();
  const initiatePaymentMutation = useInitiatePayment();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Passengers form state
  const [passengersData, setPassengersData] = React.useState<BookingPassengerInput[]>(
    booking.passengers,
  );
  const [contactMobile, setContactMobile] = React.useState(booking.contactMobile);
  const [contactEmail, setContactEmail] = React.useState(booking.contactEmail ?? "");
  const [saveToVault, setSaveToVault] = React.useState(true);

  const handleAutofillPassenger = (passengerIndex: number, saved: PassengerDto) => {
    setPassengersData((prev) => {
      const next = [...prev];
      const existing = next[passengerIndex];
      if (existing) {
        next[passengerIndex] = {
          ...existing,
          passengerId: saved.id,
          firstNameFa: saved.firstNameFa,
          lastNameFa: saved.lastNameFa,
          firstNameEn: saved.firstNameEn,
          lastNameEn: saved.lastNameEn,
          nationalId: saved.nationalId,
          birthDate: saved.birthDate,
          gender: saved.gender,
          passengerType: saved.passengerType,
          passportNumber: saved.passportNumber ?? null,
        };
      }
      return next;
    });
    toast.success(`مشخصات ${saved.firstNameFa} ${saved.lastNameFa} با موفقیت جایگذاری شد!`);
  };

  const handleUpdatePassengerField = (
    index: number,
    field: keyof BookingPassengerInput,
    value: unknown,
  ) => {
    setPassengersData((prev) => {
      const next = [...prev];
      const target = next[index];
      if (target) {
        next[index] = { ...target, [field]: value };
      }
      return next;
    });
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = contactMobile.trim();
    if (!cleanMobile || !/^09\d{9}$/.test(cleanMobile)) {
      toast.error("لطفا یک شماره موبایل معتبر ۱۱ رقمی (مثال: ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید");
      return;
    }

    // Validate each passenger
    for (let i = 0; i < passengersData.length; i++) {
      const p = passengersData[i]!;
      if (!p.firstNameFa?.trim() || !p.lastNameFa?.trim()) {
        toast.error(`نام و نام خانوادگی فارسی مسافر ${i + 1} الزامی است`);
        return;
      }
      if (!p.firstNameEn?.trim() || !p.lastNameEn?.trim()) {
        toast.error(`نام و نام خانوادگی لاتین مسافر ${i + 1} الزامی است`);
        return;
      }
      const cleanNationalId = (p.nationalId || "").trim();
      if (!cleanNationalId || !isValidNationalCode(cleanNationalId)) {
        toast.error(`کد ملی مسافر ${i + 1} معتبر نیست (باید ۱۰ رقم باشد)`);
        return;
      }
      if (!p.birthDate) {
        toast.error(`تاریخ تولد مسافر ${i + 1} الزامی است`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Save passenger details & preferences to the booking
      await updateBookingMutation.mutateAsync({
        id: bookingId,
        input: {
          passengers: passengersData,
          contactMobile: cleanMobile,
          contactEmail: contactEmail.trim() || undefined,
          savePassengersToVault: saveToVault,
        },
      });

      // 2. Initiate payment session
      const callbackUrl = `${window.location.origin}${paths.checkoutResult(bookingId)}`;
      const res = await initiatePaymentMutation.mutateAsync({
        bookingId,
        callbackUrl,
      });

      toast.success("اطلاعات ثبت شد. در حال انتقال به درگاه پرداخت امن...");
      window.location.href = res.paymentUrl;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "خطا در برقراری ارتباط با درگاه پرداخت";
      toast.error(message);
      setIsSubmitting(false);
    }
  };

  const selectedNationalIds = passengersData.map((p) => p.nationalId).filter(Boolean);

  return (
    <div className="container mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <LockIcon className="text-primary size-5" />
          <h1 className="font-heading text-foreground text-2xl font-extrabold">
            تکمیل اطلاعات مسافران و پرداخت
          </h1>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>کد رزرو موقت (PNR):</span>
          <Badge variant="outline" className="text-foreground font-mono font-bold">
            {booking.bookingReference}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Forms Area (cols: 8) */}
        <form onSubmit={handleProceedToPayment} className="flex flex-col gap-6 lg:col-span-8">
          {/* Travelers Vault 1-Click Selector */}
          <div className="flex flex-col gap-2">
            <TravelersVaultSelector
              selectedNationalIds={selectedNationalIds}
              onSelectPassenger={(saved) => {
                // Find first passenger that doesn't have nationalId matching or update passenger 0
                const emptyIdx = passengersData.findIndex(
                  (p) => !p.nationalId || p.nationalId === "0499370899",
                );
                const targetIdx = emptyIdx !== -1 ? emptyIdx : 0;
                handleAutofillPassenger(targetIdx, saved);
              }}
            />
          </div>

          {/* Passenger Input Fields */}
          {passengersData.map((p, idx) => (
            <Card key={idx} className="flex flex-col gap-4 border p-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <UsersIcon className="text-primary size-4" />
                  <h3 className="font-heading text-foreground text-sm font-bold">
                    مشخصات مسافر {idx + 1} (
                    {p.passengerType === "ADULT"
                      ? "بزرگسال"
                      : p.passengerType === "CHILD"
                        ? "کودک"
                        : "نوزاد"}
                    )
                  </h3>
                </div>
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <span>صندلی اختصاصی:</span>
                  <Badge variant="secondary" className="font-mono font-bold">
                    {p.selectedSeatNumber || `1${idx + 1}B`}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* First name Persian */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-semibold">نام (فارسی):</label>
                  <Input
                    required
                    value={p.firstNameFa}
                    onChange={(e) => handleUpdatePassengerField(idx, "firstNameFa", e.target.value)}
                    placeholder="مثال: علی"
                  />
                </div>

                {/* Last name Persian */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-semibold">
                    نام خانوادگی (فارسی):
                  </label>
                  <Input
                    required
                    value={p.lastNameFa}
                    onChange={(e) => handleUpdatePassengerField(idx, "lastNameFa", e.target.value)}
                    placeholder="مثال: محمدی"
                  />
                </div>

                {/* First name English */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-semibold">
                    نام انگلیسی (لاتین):
                  </label>
                  <Input
                    required
                    value={p.firstNameEn}
                    onChange={(e) => handleUpdatePassengerField(idx, "firstNameEn", e.target.value)}
                    placeholder="e.g. Ali"
                    className="dir-ltr text-start font-mono"
                  />
                </div>

                {/* Last name English */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-semibold">
                    نام خانوادگی انگلیسی (لاتین):
                  </label>
                  <Input
                    required
                    value={p.lastNameEn}
                    onChange={(e) => handleUpdatePassengerField(idx, "lastNameEn", e.target.value)}
                    placeholder="e.g. Mohammadi"
                    className="dir-ltr text-start font-mono"
                  />
                </div>

                {/* National ID */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-semibold">کد ملی (۱۰ رقم):</label>
                  <Input
                    required
                    value={p.nationalId}
                    onChange={(e) => handleUpdatePassengerField(idx, "nationalId", e.target.value)}
                    placeholder="۰۴۹۹۳۷۰۸۹۹"
                    className="dir-ltr text-start font-mono"
                  />
                </div>

                {/* Birth date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-semibold">
                    تاریخ تولد (میلادی):
                  </label>
                  <Input
                    type="date"
                    required
                    value={p.birthDate}
                    onChange={(e) => handleUpdatePassengerField(idx, "birthDate", e.target.value)}
                  />
                </div>

                {/* Gender */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-semibold">جنسیت:</label>
                  <select
                    value={p.gender}
                    onChange={(e) =>
                      handleUpdatePassengerField(idx, "gender", e.target.value as "MALE" | "FEMALE")
                    }
                    className="bg-background text-foreground h-9 rounded-xl border px-3 text-xs font-semibold"
                  >
                    <option value="MALE">مرد (آقا)</option>
                    <option value="FEMALE">زن (خانم)</option>
                  </select>
                </div>

                {/* Seat Preference */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-semibold">ترجیح صندلی:</label>
                  <select
                    value={p.seatPreference}
                    onChange={(e) =>
                      handleUpdatePassengerField(
                        idx,
                        "seatPreference",
                        e.target.value as "WINDOW" | "AISLE" | "ANY",
                      )
                    }
                    className="bg-background text-foreground h-9 rounded-xl border px-3 text-xs font-semibold"
                  >
                    <option value="WINDOW">کنار پنجره (Window)</option>
                    <option value="AISLE">کنار راهرو (Aisle)</option>
                    <option value="ANY">فرقی نمی‌کند</option>
                  </select>
                </div>
              </div>
            </Card>
          ))}

          {/* Contact Details Card */}
          <Card className="flex flex-col gap-4 border p-5">
            <h3 className="font-heading text-foreground border-b pb-2 text-sm font-bold">
              اطلاعات تماس جهت ارسال بلیط و پیامک پرواز:
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-foreground text-xs font-semibold">
                  شماره موبایل دریافت پیامک:
                </label>
                <Input
                  required
                  type="tel"
                  value={contactMobile}
                  onChange={(e) => setContactMobile(e.target.value)}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  className="dir-ltr text-start font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-foreground text-xs font-semibold">
                  آدرس ایمیل (اختیاری):
                </label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="dir-ltr text-start font-mono"
                />
              </div>
            </div>

            {/* Save to vault checkbox (Innovation) */}
            <label className="text-foreground bg-primary/5 border-primary/20 mt-2 flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-medium">
              <input
                type="checkbox"
                checked={saveToVault}
                onChange={(e) => setSaveToVault(e.target.checked)}
                className="accent-primary size-4 rounded-xs"
              />
              <span className="text-primary font-semibold">
                ذخیره این مسافران در «بانک مسافران من» جهت استفاده آسان و ۱-کلیکه در خریدهای آینده
              </span>
            </label>
          </Card>

          {/* Submit Button */}
          <div className="flex items-center justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={
                isSubmitting || initiatePaymentMutation.isPending || updateBookingMutation.isPending
              }
              className="shadow-primary/25 gap-2 px-8 font-bold shadow-md"
            >
              {isSubmitting ||
              initiatePaymentMutation.isPending ||
              updateBookingMutation.isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  <span>در حال ذخیره و اتصال به درگاه...</span>
                </>
              ) : (
                <>
                  <CreditCardIcon className="size-4" />
                  <span>تأیید و پرداخت آنلاین</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Flight & Price Summary (cols: 4) */}
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <Card className="bg-muted/20 flex flex-col gap-4 border p-5">
            <h3 className="font-heading text-foreground border-b pb-2 text-sm font-bold">
              خلاصه اطلاعات پرواز
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                  <PlaneIcon className="size-4 rtl:rotate-180" />
                </div>
                <div className="flex flex-col">
                  <span className="font-heading text-foreground text-sm font-bold">
                    {booking.flight.airline}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {booking.flight.flightNumber}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {booking.flight.flightType === "CHARTER" ? "چارتری" : "سیستمی"}
              </Badge>
            </div>

            <div className="flex items-center justify-between border-y py-2 text-xs">
              <div className="flex flex-col text-start">
                <span className="text-foreground text-sm font-bold">
                  {new Date(booking.flight.departureTime).toLocaleTimeString("fa-IR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-muted-foreground">{booking.flight.origin}</span>
              </div>
              <span className="text-muted-foreground text-[10px]">پرواز مستقیم</span>
              <div className="flex flex-col text-end">
                <span className="text-foreground text-sm font-bold">
                  {new Date(booking.flight.arrivalTime).toLocaleTimeString("fa-IR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-muted-foreground">{booking.flight.destination}</span>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="flex flex-col gap-2 pt-2 text-xs">
              <div className="text-muted-foreground flex justify-between">
                <span>تعداد مسافران:</span>
                <span className="text-foreground font-bold">{booking.passengers.length} نفر</span>
              </div>
              <div className="text-muted-foreground flex justify-between">
                <span>قیمت کل پایه:</span>
                <span>{booking.totalAmount.toLocaleString("fa-IR")} ریال</span>
              </div>
              <div className="text-primary flex justify-between font-semibold">
                <span>تخفیف ویژه پرواز پلاس:</span>
                <span>رایگان (۰ ریال کارمزد)</span>
              </div>
              <div className="font-heading flex items-baseline justify-between border-t pt-3">
                <span className="text-foreground text-sm font-bold">مبلغ نهایی پرداخت:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-primary text-2xl font-black">
                    {booking.totalAmount.toLocaleString("fa-IR")}
                  </span>
                  <span className="text-muted-foreground text-xs">ریال</span>
                </div>
              </div>
            </div>

            <div className="text-muted-foreground flex items-center gap-1.5 border-t pt-2 text-[11px]">
              <ShieldCheckIcon className="text-primary size-4 shrink-0" />
              <span>پرداخت امن با پروتکل SSL و ضمانت استرداد آنلاین وجه</span>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const { data: booking, isLoading } = useBookingDetail(bookingId);

  if (isLoading) {
    return (
      <div className="container mx-auto flex max-w-5xl items-center justify-center px-4 py-16">
        <div className="flex animate-pulse flex-col items-center gap-3">
          <div className="border-primary size-10 animate-spin rounded-full border-4 border-t-transparent" />
          <span className="text-muted-foreground text-sm font-semibold">
            در حال بارگذاری اطلاعات رزرو...
          </span>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 text-center">
        <h2 className="text-xl font-bold">رزرو مورد نظر یافت نشد</h2>
      </div>
    );
  }

  return <CheckoutForm booking={booking} />;
}
