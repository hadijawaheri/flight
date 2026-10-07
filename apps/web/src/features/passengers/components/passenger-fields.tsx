"use client";

import type { PassengerIdentity } from "@flysmart/contracts";
import {
  DEFAULT_NATIONALITY,
  FOREIGN_NATIONALITY_CODES,
  nationalityNameFa,
} from "@flysmart/contracts";
import type { Control, FieldValues, Path } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";

import { JalaliDateFields } from "@/components/shared/jalali-date-fields";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface PassengerFieldsProps<T extends FieldValues> {
  control: Control<T>;
  /** Dotted path to the passenger inside the form, e.g. `passengers.0`; empty when the form is one passenger. */
  prefix: string;
  /**
   * Foreign flights make the passport mandatory; domestic ones still accept it. A foreign
   * passenger always needs one, whatever this says: it is their only identity document.
   */
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

  // An unpicked foreign country is "", so only an absent value or IR counts as Iranian
  const nationality: unknown = useWatch({ control, name: name("nationality") });
  const foreign = typeof nationality === "string" && nationality !== DEFAULT_NATIONALITY;
  const passportRequired = passport === "required" || foreign;
  const optionalHint = <span className="text-muted-foreground font-normal">(اختیاری)</span>;

  const text = (
    key: Key,
    label: string,
    options: {
      latin?: boolean;
      ltr?: boolean;
      optional?: boolean;
      placeholder?: string;
      inputMode?: "numeric" | "text";
    } = {},
  ) => (
    <Controller
      name={name(key)}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id(key)}>
            {label}
            {options.optional && <> {optionalHint}</>}
          </FieldLabel>
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
      <Controller
        name={name("nationality")}
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel id={`${id("nationality")}-label`}>تابعیت</FieldLabel>
            <div className="flex flex-wrap items-center gap-3">
              <ToggleGroup
                type="single"
                value={foreign ? "FOREIGN" : "IR"}
                onValueChange={(value) => {
                  if (value === "IR") field.onChange(DEFAULT_NATIONALITY);
                  // The country is picked next; "" keeps the toggle on foreign until then
                  else if (value === "FOREIGN" && !foreign) field.onChange("");
                }}
                aria-labelledby={`${id("nationality")}-label`}
                disabled={readOnly}
              >
                <ToggleGroupItem value="IR">ایرانی</ToggleGroupItem>
                <ToggleGroupItem value="FOREIGN">غیرایرانی</ToggleGroupItem>
              </ToggleGroup>
              {foreign && (
                <Select
                  value={asText(field.value)}
                  onValueChange={field.onChange}
                  disabled={readOnly}
                >
                  <SelectTrigger
                    id={id("nationality")}
                    className="w-48"
                    aria-label="کشور صادرکننده‌ی گذرنامه"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="انتخاب کشور" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOREIGN_NATIONALITY_CODES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {nationalityNameFa(code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {text("firstNameFa", "نام (فارسی)", { optional: foreign })}
        {text("lastNameFa", "نام خانوادگی (فارسی)", { optional: foreign })}
        {text("firstNameEn", "نام (لاتین، مطابق گذرنامه)", { latin: true, placeholder: "ALI" })}
        {text("lastNameEn", "نام خانوادگی (لاتین)", { latin: true, placeholder: "REZAEI" })}
        {!foreign &&
          text("nationalId", "کد ملی", {
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
                شماره گذرنامه
                {!passportRequired && <> {optionalHint}</>}
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
                انقضای گذرنامه
                {!passportRequired && <> {optionalHint}</>}
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
