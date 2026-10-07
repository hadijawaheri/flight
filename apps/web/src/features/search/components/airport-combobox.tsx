"use client";

import { getAirport, locationLabel, searchAirports } from "@flysmart/contracts";
import { MapPinIcon, SearchIcon } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AirportComboboxProps {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  placeholder: string;
  invalid?: boolean;
  /** Hide one airport, e.g. the one chosen at the other end. */
  exclude?: string;
  /** Only these airports (and groups containing one) are offered; defaults to every airport. */
  allowed?: readonly string[];
  /** Shown when nothing matches the typed text, e.g. to point at the other kind of flight. */
  renderEmpty?: (query: string, close: () => void) => ReactNode;
}

export function AirportCombobox({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  exclude,
  allowed,
  renderEmpty,
}: AirportComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();

  const hits = searchAirports(query, 12, allowed).filter((hit) => hit.code !== exclude);
  const airport = value ? getAirport(value) : undefined;

  function pick(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid}
          className="h-10 w-full justify-start font-normal"
        >
          <MapPinIcon data-icon="inline-start" />
          {value ? (
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="truncate font-medium">{locationLabel(value)}</span>
              <span className="text-muted-foreground text-xs" dir="ltr">
                {airport?.code ?? value}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-2">
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute start-2.5 top-2.5 size-4" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && hits[0]) {
                event.preventDefault();
                pick(hits[0].code);
              }
            }}
            placeholder="نام شهر یا کد فرودگاه"
            aria-label="جست‌وجوی شهر یا فرودگاه"
            className="ps-8"
          />
        </div>
        <ul
          id={listId}
          role="listbox"
          aria-label="فرودگاه‌ها"
          className="mt-2 flex max-h-64 flex-col overflow-y-auto"
        >
          {hits.length === 0 && (
            <li className="text-muted-foreground px-2 py-3 text-sm">
              فرودگاهی پیدا نشد.
              {renderEmpty?.(query, () => {
                setOpen(false);
                setQuery("");
              })}
            </li>
          )}
          {hits.map((hit) => (
            <li key={hit.code} role="option" aria-selected={hit.code === value}>
              <button
                type="button"
                onClick={() => pick(hit.code)}
                className={cn(
                  "hover:bg-muted focus-visible:bg-muted flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-start text-sm outline-none",
                  hit.code === value && "bg-muted",
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{hit.label}</span>
                  <span className="text-muted-foreground truncate text-xs">{hit.sublabel}</span>
                </span>
                <span className="text-muted-foreground text-xs" dir="ltr">
                  {hit.code}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
