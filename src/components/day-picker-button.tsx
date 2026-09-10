"use client";

import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { mondayOf } from "@/domain/sydney";
import { weekHref, type WeekQuery } from "@/lib/week-url";
import { CalendarIcon } from "lucide-react";
import { enAU } from "react-day-picker/locale";
import { useState } from "react";

function ymdToPickerDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function pickerDateToYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DayPickerButton({
  selectedYmd,
  today,
  query,
  onNavigate,
}: {
  selectedYmd: string;
  today: string;
  query: WeekQuery;
  onNavigate: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = ymdToPickerDate(selectedYmd);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Hint content="Jump to a specific day.">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Pick a day"
          >
            <CalendarIcon />
          </Button>
        </PopoverTrigger>
      </Hint>
      <PopoverContent
        align="start"
        className="w-auto p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          key={selectedYmd}
          mode="single"
          locale={enAU}
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected}
          today={ymdToPickerDate(today)}
          onSelect={(date) => {
            if (!date) return;
            const ymd = pickerDateToYmd(date);
            onNavigate(
              weekHref(mondayOf(ymd), { ...query, view: "day", day: ymd }),
            );
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
