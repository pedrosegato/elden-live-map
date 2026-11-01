import { CaretDownIcon } from "@phosphor-icons/react";
import { Checkbox } from "@/components/ui/checkbox";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCount, t } from "@/lib/copy";
import type { Visibility } from "@/lib/filters";

interface GroupHeaderProps {
  title: string;
  total: number;
  visibility: Visibility;
  onVisibilityChange: (visible: boolean) => void;
}

export function GroupHeader({ title, total, visibility, onVisibilityChange }: GroupHeaderProps) {
  return (
    <h2 className="sticky top-0 z-1 m-0 grid grid-cols-[auto_minmax(0,1fr)] items-center border-b border-hairline bg-background pr-2.5 pl-3">
      <span className="grid size-6 place-items-center">
        <Checkbox
          aria-label={t("showGroup", { group: title })}
          checked={visibility === "all"}
          indeterminate={visibility === "some"}
          onCheckedChange={onVisibilityChange}
        />
      </span>
      <CollapsibleTrigger className="group/trigger grid min-h-[42px] cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 pl-2.5 text-left outline-none">
        <span className="truncate font-display text-[0.78rem] font-semibold tracking-[0.14em] text-gold-300 uppercase transition-colors group-hover/trigger:text-gold-200 group-focus-visible/trigger:text-gold-200">
          {title}
        </span>
        <span className="text-[0.88rem] text-bone-500 tabular-nums">{formatCount(total)}</span>
        <CaretDownIcon className="size-4 text-bone-500 transition-transform duration-200 ease-out-expo group-hover/trigger:text-gold-200 -rotate-90 group-data-[panel-open]/trigger:rotate-0" />
      </CollapsibleTrigger>
    </h2>
  );
}
