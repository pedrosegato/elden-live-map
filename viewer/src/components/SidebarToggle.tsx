import { CaretLeftIcon, ListIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/copy";

interface SidebarToggleProps {
  placement: "map" | "drawer";
  open: boolean;
  compact?: boolean;
  onToggle: () => void;
}

export function SidebarToggle({ placement, open, compact = false, onToggle }: SidebarToggleProps) {
  const label = open ? t("closePanel") : t("openPanel");
  const shared = { "aria-expanded": open, "aria-controls": "map-legend", title: label, onClick: onToggle };

  if (placement === "drawer") {
    return (
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={label}
        className="h-auto w-10 border-b-border md:hidden"
        {...shared}
      >
        <XIcon />
      </Button>
    );
  }
  if (open && compact) return null;
  if (open) {
    return (
      <Button
        variant="ghost"
        aria-label={label}
        className="absolute top-3.5 left-(--sidebar-width) z-3 h-13 w-6 rounded-l-none border border-l-0 border-border bg-background px-0 shadow-[6px_6px_16px_rgb(0_0_0/0.4)] hover:bg-ink-800 [&_svg:not([class*='size-'])]:size-4"
        {...shared}
      >
        <CaretLeftIcon />
      </Button>
    );
  }
  return (
    <Button variant="floating" className="absolute top-3 left-3 z-3 pl-3" {...shared}>
      <ListIcon data-icon="inline-start" />
      {t("legend")}
    </Button>
  );
}
