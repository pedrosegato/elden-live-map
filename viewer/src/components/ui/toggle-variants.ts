import { cva } from "class-variance-authority";

const pressedPill =
  "data-pressed:border-primary data-pressed:bg-[linear-gradient(rgb(220_189_120/0.3),rgb(220_189_120/0.16))] data-pressed:text-accent-foreground";

export const toggleVariants = cva(
  "group/toggle inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent font-display text-[0.74rem] font-semibold tracking-[0.12em] whitespace-nowrap uppercase transition-[color,background-color,border-color,box-shadow] duration-150 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "text-muted-foreground hover:text-foreground data-pressed:text-accent-foreground",
        outline: `border-border bg-popover/92 text-secondary-foreground hover:border-gold-400 hover:text-accent-foreground ${pressedPill} data-pressed:shadow-[inset_0_1px_0_rgb(237_213_155/0.25)]`,
        floating: `border-border bg-popover/92 text-secondary-foreground shadow-float hover:border-gold-400 hover:text-accent-foreground ${pressedPill} data-pressed:shadow-[inset_0_1px_0_rgb(237_213_155/0.25),0_6px_18px_rgb(0_0_0/0.45)]`,
      },
      size: {
        default: "h-10 min-w-10 px-4",
        sm: "h-8 min-w-9 px-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
