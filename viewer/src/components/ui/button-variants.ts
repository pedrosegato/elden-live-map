import { cva } from "class-variance-authority";

const caps = "font-display text-[0.74rem] font-semibold tracking-[0.12em] uppercase";

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-clip-padding whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: `${caps} bg-primary text-primary-foreground hover:bg-gold-200`,
        outline: `${caps} border-border bg-popover/92 text-secondary-foreground hover:border-gold-400 hover:text-accent-foreground`,
        floating: `${caps} border-border bg-popover/92 text-secondary-foreground shadow-float hover:border-gold-400 hover:text-accent-foreground`,
        ghost: "text-muted-foreground hover:text-accent-foreground aria-expanded:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-2.5 px-4 has-data-[icon=inline-start]:pl-3",
        sm: "h-8 gap-2 px-3",
        icon: "size-9",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-11 [&_svg:not([class*='size-'])]:size-[22px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
