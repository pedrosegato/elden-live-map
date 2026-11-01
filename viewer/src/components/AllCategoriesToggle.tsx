import { Checkbox } from "@/components/ui/checkbox";
import { formatCount, t } from "@/lib/copy";
import type { Visibility } from "@/lib/filters";

interface AllCategoriesToggleProps {
  total: number;
  visibility: Visibility;
  onVisibilityChange: (visible: boolean) => void;
}

export function AllCategoriesToggle({ total, visibility, onVisibilityChange }: AllCategoriesToggleProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-b border-hairline py-0.5 pr-9 pl-3">
      <label className="flex min-h-9 cursor-pointer items-center gap-3 font-display text-[0.78rem] font-semibold tracking-[0.14em] text-bone-300 uppercase">
        <span className="grid size-6 place-items-center">
          <Checkbox
            checked={visibility === "all"}
            indeterminate={visibility === "some"}
            onCheckedChange={onVisibilityChange}
          />
        </span>
        <span className="truncate">{t("allCategories")}</span>
      </label>
      <span className="text-[0.88rem] text-bone-500 tabular-nums">{formatCount(total)}</span>
    </div>
  );
}
