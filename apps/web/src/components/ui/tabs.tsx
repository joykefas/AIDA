"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "cn";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />;
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <TabsPrimitive.List
        data-slot="tabs-list"
        className={cn(
          "relative inline-flex w-max items-center gap-1 rounded-xl bg-muted p-1 text-muted-foreground",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "relative z-10 inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground data-active:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "absolute top-1 left-0 z-0 h-8 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-lg bg-background shadow-sm transition-[translate,width] duration-200 ease-out",
        className,
      )}
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTab, TabsIndicator, TabsPanel };
