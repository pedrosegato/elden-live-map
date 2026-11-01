import { Toggle } from "@/components/ui/toggle";
import { t } from "@/lib/copy";
import { PLAYER_ICONS } from "@/lib/icons";

interface FollowButtonProps {
  following: boolean;
  onToggle: () => void;
}

export function FollowButton({ following, onToggle }: FollowButtonProps) {
  return (
    <Toggle
      variant="floating"
      pressed={following}
      onPressedChange={onToggle}
      className="group/follow absolute right-2.5 bottom-24 z-2 pr-4 pl-3"
    >
      <span
        aria-hidden="true"
        className="relative h-[26px] w-3 opacity-75 grayscale brightness-115 transition-[filter,opacity] group-hover/follow:opacity-100 group-hover/follow:grayscale-0 group-hover/follow:brightness-100 group-data-pressed/follow:opacity-100 group-data-pressed/follow:grayscale-0 group-data-pressed/follow:brightness-100"
      >
        <img
          className="absolute top-1/2 left-1/2 h-[26px] max-w-none -translate-1/2"
          src={PLAYER_ICONS.direction}
          alt=""
        />
        <img
          className="absolute max-w-none"
          style={{
            left: `${PLAYER_ICONS.pivot[0] * 100}%`,
            top: `${PLAYER_ICONS.pivot[1] * 100}%`,
            height: 26 * PLAYER_ICONS.bustToNeedle,
            translate: `${-PLAYER_ICONS.bustCentre[0] * 100}% ${-PLAYER_ICONS.bustCentre[1] * 100}%`,
          }}
          src={PLAYER_ICONS.base}
          alt=""
        />
      </span>
      {t("follow")}
    </Toggle>
  );
}
