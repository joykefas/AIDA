"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "cn";

function Select<Value = string>({
  ...props
}: SelectPrimitive.Root.Props<Value>) {
  return <SelectPrimitive.Root<Value> {...props} />;
}

function SelectGroup(props: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group {...props} />;
}

function SelectValue(props: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value {...props} />;
}

interface SelectTriggerProps extends SelectPrimitive.Trigger.Props {
  size?: "sm" | "default" | "lg";
  hideIcon?: boolean;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, size = "default", hideIcon = false, ...props }, ref) => {
    return (
      <SelectPrimitive.Trigger
        ref={ref}
        data-slot="select-trigger"
        className={cn(
          "group flex items-center justify-between gap-2 rounded-xl border border-border bg-card/80 text-foreground shadow-2xs outline-none transition-all duration-150 select-none",
          "hover:border-border hover:bg-accent/40 active:bg-accent/60",
          "focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20",
          "data-disabled:pointer-events-none data-disabled:opacity-50",
          size === "sm" && "h-8 px-2.5 text-xs",
          size === "default" && "h-9 px-3 text-xs",
          size === "lg" && "h-10 px-3.5 text-sm",
          className,
        )}
        {...props}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
          {children}
        </span>
        {!hideIcon && (
          <SelectPrimitive.Icon className="transition-transform duration-200 text-muted-foreground group-data-[popup-open]:rotate-180">
            <ChevronDown className="size-3.5 shrink-0" />
          </SelectPrimitive.Icon>
        )}
      </SelectPrimitive.Trigger>
    );
  },
);
SelectTrigger.displayName = "SelectTrigger";

interface SelectContentProps extends SelectPrimitive.Popup.Props {
  sideOffset?: number;
  align?: "start" | "center" | "end";
  alignItemWithTrigger?: boolean;
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  (
    {
      className,
      children,
      sideOffset = 6,
      align = "end",
      alignItemWithTrigger = false,
      ...props
    },
    ref,
  ) => {
    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={sideOffset}
          align={align}
          alignItemWithTrigger={alignItemWithTrigger}
          className="z-50 outline-none"
        >
          <SelectPrimitive.Popup
            ref={ref}
            data-slot="select-content"
            className={cn(
              "z-50 min-w-[var(--anchor-width,10rem)] max-h-72 overflow-y-auto rounded-xl border border-border/90 bg-card/95 p-1 shadow-xl shadow-black/30 backdrop-blur-xl outline-none text-foreground text-xs transition-all duration-150",
              "data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
              className,
            )}
            {...props}
          >
            <SelectPrimitive.List className="flex flex-col gap-0.5">
              {children}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    );
  },
);
SelectContent.displayName = "SelectContent";

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn("px-2.5 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase", className)}
      {...props}
    />
  );
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectPrimitive.Item.Props>(
  ({ className, children, ...props }, ref) => {
    return (
      <SelectPrimitive.Item
        ref={ref}
        data-slot="select-item"
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-2.5 pr-7 text-xs font-medium text-muted-foreground outline-none transition-colors",
          "hover:bg-accent hover:text-foreground",
          "data-highlighted:bg-accent data-highlighted:text-foreground",
          "data-selected:bg-brand-500/10 data-selected:text-brand-500 data-selected:font-semibold dark:data-selected:text-brand-400",
          "data-disabled:pointer-events-none data-disabled:opacity-40",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ItemText className="flex min-w-0 items-center gap-2 truncate">
          {children}
        </SelectPrimitive.ItemText>
        <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-3.5 items-center justify-center text-brand-500">
          <Check className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </SelectPrimitive.Item>
    );
  },
);
SelectItem.displayName = "SelectItem";

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* High-Level Convenient Component: DropdownSelect                    */
/* ------------------------------------------------------------------ */

export interface DropdownSelectOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  disabled?: boolean;
}

export interface DropdownSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownSelectOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  size?: "sm" | "default" | "lg";
  align?: "start" | "center" | "end";
  disabled?: boolean;
  ariaLabel?: string;
}

export function DropdownSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder,
  className,
  triggerClassName,
  contentClassName,
  size = "default",
  align = "end",
  disabled = false,
  ariaLabel,
}: DropdownSelectProps<T>) {
  return (
    <Select<string>
      value={value}
      onValueChange={(nextVal) => {
        if (nextVal !== null && nextVal !== undefined) {
          onChange(nextVal as T);
        }
      }}
      items={options.map((opt) => ({
        value: opt.value,
        label: opt.label,
      }))}
      disabled={disabled}
    >
      <SelectTrigger
        size={size}
        aria-label={ariaLabel}
        className={cn(className, triggerClassName)}
      >
        <SelectValue placeholder={placeholder}>
          {(val: string | null) => {
            const current = options.find((opt) => opt.value === val);
            if (!current) return placeholder ?? null;
            const Icon = current.icon;
            return (
              <span className="flex items-center gap-1.5 truncate">
                {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
                <span className="truncate">{current.label}</span>
              </span>
            );
          }}
        </SelectValue>
      </SelectTrigger>

      <SelectContent align={align} className={contentClassName}>
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <SelectItem
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
              <span className="truncate">{opt.label}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
