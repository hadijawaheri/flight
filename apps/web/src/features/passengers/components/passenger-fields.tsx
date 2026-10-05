"use client";

import type { PassengerIdentity } from "@flysmart/contracts";
import { Controller } from "react-hook-form";
import type { Control, FieldValues, Path } from "react-hook-form";

import { JalaliDateFields } from "@/components/shared/jalali-date-fields";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface PassengerFieldsProps<T extends FieldValues> {
  control: Control<T>;
  /** Dotted path to the passenger inside the form, e.g. `passengers.0`; empty when the form is one passenger. */
  prefix: string;
  /** Foreign flights make the passport mandatory; domestic ones still accept it. */
  passport: "required" | "optional";
  /** Age window of the birthday picker. */
  birthYearsBack?: number;
  /** Disabled while a saved traveler fills the form: edits belong in the vault. */
  readOnly?: boolean;
}

type Key = keyof PassengerIdentity;

const asText = (value: unknown): string => (typeof value === "string" ? value : "");

export function PassengerFields<T extends FieldValues>({
  control,
  prefix,
  passport,
  birthYearsBack = 110,
  readOnly,
}: PassengerFieldsProps<T>) {
  const name = (key: Key): Path<T> => (prefix ? `${prefix}.${key}` : key) as Path<T>;
  const id = (key: Key): string => `${prefix.replace(/\./g, "-") || "passenger"}-${key}`;

  const text = (
    key: Key,
    label: string,
    options: {
      latin?: boolean;
      ltr?: boolean;
      placeholder?: string;
      inputMode?: "numeric" | "text";
    } = {},
  ) => (
    <Controller
      name={name(key)}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id(key)}>{label}</FieldLabel>
          <Input
            id={id(key)}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            value={asText(field.value)}
            onChange={(event) => field.onChange(event.target.value)}
            readOnly={readOnly}
            dir={options.latin || options.ltr ? "ltr" : undefined}
            className={options.latin || options.ltr ? "text-start" : undefined}
            inputMode={options.inputMode}
            placeholder={options.placeholder}
            autoComplete="off"
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );

  return (
    <FieldGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        {text("firstNameFa", "نام (فارسی)")}
        {text("lastNameFa", "نام خانوادگی (فارسی)")}
        {text("firstNameEn", "نام (لاتین، مطابق گذرنامه)", { latin: true, placeholder: "ALI" })}
        {text("lastNameEn", "نام خانوادگی (لاتین)", { latin: true, placeholder: "REZAEI" })}
        {text("nationalId", "کد ملی", {
          ltr: true,
          inputMode: "numeric",
          placeholder: "0012345678",
        })}
        <Controller
          name={name("birthDate")}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id("birthDate")}-day`}>تاریخ تولد</FieldLabel>
              <JalaliDateFields
                idPrefix={id("birthDate")}
                label="تاریخ تولد"
                value={asText(field.value) || null}
                onChange={field.onChange}
                yearsBack={birthYearsBack}
                yearsAhead={0}
                invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name={name("gender")}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel id={`${id("gender")}-label`}>جنسیت</FieldLabel>
              <ToggleGroup
                type="single"
                value={asText(field.value)}
                onValueChange={(value) => value && field.onChange(value)}
                aria-labelledby={`${id("gender")}-label`}
                disabled={readOnly}
              >
                <ToggleGroupItem value="MALE">مرد</ToggleGroupItem>
                <ToggleGroupItem value="FEMALE">زن</ToggleGroupItem>
              </ToggleGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name={name("passportNumber")}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id("passportNumber")}>
                شماره گذرنامه{" "}
                {passport === "optional" && (
                  <span className="text-muted-foreground font-normal">(اختیاری)</span>
                )}
              </FieldLabel>
              <Input
                id={id("passportNumber")}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={asText(field.value)}
                onChange={(event) =>
                  field.onChange(event.target.value === "" ? null : event.target.value)
                }
                readOnly={readOnly}
                dir="ltr"
                className="text-start"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name={name("passportExpiry")}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id("passportExpiry")}-day`}>
                انقضای گذرنامه{" "}
                {passport === "optional" && (
                  <span className="text-muted-foreground font-normal">(اختیاری)</span>
                )}
              </FieldLabel>
              <JalaliDateFields
                idPrefix={id("passportExpiry")}
                label="انقضای گذرنامه"
                value={asText(field.value) || null}
                onChange={field.onChange}
                yearsBack={0}
                yearsAhead={15}
                invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
    </FieldGroup>
  );
}
