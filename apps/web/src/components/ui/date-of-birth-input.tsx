"use client";

import { useRef, useState } from "react";
import { cn } from "cn";

/**
 * Custom replacement for <input type="date"> — the native date picker is
 * unstyleable (its calendar popup ignores dark mode entirely, see the
 * screenshot that prompted this) and is a poor fit for birthdate entry
 * specifically: nobody wants to click a calendar back through 20+ years.
 * Three auto-advancing numeric segments are faster to type and fully
 * themeable.
 */
export function DateOfBirthInput({
  onChange,
  id,
}: {
  onChange: (isoDate: string) => void;
  id?: string;
}) {
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  function commit(nextMonth: string, nextDay: string, nextYear: string) {
    if (nextMonth.length === 2 && nextDay.length === 2 && nextYear.length === 4) {
      onChange(`${nextYear}-${nextMonth}-${nextDay}`);
    } else {
      onChange("");
    }
  }

  function handleMonth(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setMonth(digits);
    commit(digits, day, year);
    if (digits.length === 2) yearRef.current?.focus();
  }

  function handleDay(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setDay(digits);
    commit(month, digits, year);
    if (digits.length === 2) monthRef.current?.focus();
  }

  function handleYear(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    setYear(digits);
    commit(month, day, digits);
  }

  const segmentClass =
    "h-10 rounded-lg border border-input bg-background text-center text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div id={id} className="flex items-center gap-1.5 sm:gap-2" role="group" aria-label="Date of birth">
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        placeholder="DD"
        maxLength={2}
        value={day}
        onChange={(e) => handleDay(e.target.value)}
        className={cn(segmentClass, "w-11 sm:w-14")}
        aria-label="Day"
      />
      <span className="text-muted-foreground">/</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        placeholder="MM"
        maxLength={2}
        value={month}
        onChange={(e) => handleMonth(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && month === "") dayRef.current?.focus();
        }}
        className={cn(segmentClass, "w-11 sm:w-14")}
        aria-label="Month"
      />
      <span className="text-muted-foreground">/</span>
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        placeholder="YYYY"
        maxLength={4}
        value={year}
        onChange={(e) => handleYear(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && year === "") monthRef.current?.focus();
        }}
        className={cn(segmentClass, "w-16 sm:w-20")}
        aria-label="Year"
      />
    </div>
  );
}
