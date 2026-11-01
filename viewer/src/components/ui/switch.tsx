import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-4 w-[30px] shrink-0 cursor-pointer items-center rounded-full border border-gold-500 bg-black/40 transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-gold-300 focus-visible:ring-2 focus-visible:ring-ring/40 data-checked:border-primary data-checked:bg-primary/28 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none ml-[2px] block size-2.5 rounded-full bg-bone-400 transition-[translate,background-color] duration-200 ease-out-expo data-checked:translate-x-[14px] data-checked:bg-gold-200"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
