import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col", className)} {...props} />;
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex w-full items-stretch border-b border-border", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative flex min-h-12 min-w-0 flex-1 cursor-pointer items-center justify-center truncate px-2 pt-1 font-display text-[0.74rem] max-md:px-1.5 max-md:text-[0.7rem] font-semibold tracking-[0.1em] text-bone-500 uppercase transition-colors outline-none hover:text-bone-100 focus-visible:text-bone-100 data-active:text-accent-foreground",
        "not-first:before:absolute not-first:before:inset-y-3.5 not-first:before:left-0 not-first:before:w-px not-first:before:bg-hairline",
        "after:absolute after:inset-x-[14%] after:-bottom-px after:h-0.5 after:bg-[linear-gradient(90deg,transparent,var(--color-gold-300),transparent)] after:opacity-0 after:transition-opacity data-active:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
