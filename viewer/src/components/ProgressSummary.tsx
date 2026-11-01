import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { formatCount, t } from "@/lib/copy";
import type { Profile } from "@/lib/types";

interface ProgressSummaryProps {
  profile: Profile | null;
  found: number;
  total: number;
  hideFound: boolean;
  onHideFoundChange: (hideFound: boolean) => void;
}

export function ProgressSummary({ profile, found, total, hideFound, onHideFoundChange }: ProgressSummaryProps) {
  const count = t("foundCount", { found: formatCount(found), total: formatCount(total) });
  return (
    <div className="flex flex-col gap-0.5 px-[18px] pt-4">
      {profile && (
        <p className="truncate font-display text-[1.12rem] leading-tight font-semibold tracking-[0.05em] text-bone-100">
          {profile.characterName}
        </p>
      )}
      <Progress value={total ? (found / total) * 100 : 0} className="gap-1.5" aria-label={count}>
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <p className="text-[0.92rem] text-muted-foreground tabular-nums">{count}</p>
          <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-[0.92rem] text-bone-300 hover:text-bone-100">
            {t("hideFound")}
            <Switch checked={hideFound} onCheckedChange={onHideFoundChange} />
          </label>
        </div>
      </Progress>
    </div>
  );
}
