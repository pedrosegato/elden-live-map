import type { CSSProperties, Ref } from "react";
import { PLAYER_ICONS } from "@/lib/icons";

interface PlayerNeedleProps {
  headingRef: Ref<HTMLDivElement>;
}

export function PlayerNeedle({ headingRef }: PlayerNeedleProps) {
  const pivot = {
    "--pivot-x": PLAYER_ICONS.pivot[0],
    "--pivot-y": PLAYER_ICONS.pivot[1],
    "--bust-ratio": PLAYER_ICONS.bustToNeedle,
    "--bust-x": PLAYER_ICONS.bustCentre[0],
    "--bust-y": PLAYER_ICONS.bustCentre[1],
  } as CSSProperties;
  return (
    <div className="pointer-events-none relative size-0" style={pivot}>
      <div
        ref={headingRef}
        className="absolute top-0 left-0 h-[calc(88px*var(--player-scale,1))] origin-[calc(var(--pivot-x)*100%)_calc(var(--pivot-y)*100%)] translate-x-[calc(var(--pivot-x)*-100%)] translate-y-[calc(var(--pivot-y)*-100%)] drop-shadow-[0_2px_4px_rgb(0_0_0/0.75)]"
      >
        <img className="block h-full max-w-none" src={PLAYER_ICONS.direction} alt="" draggable={false} />
      </div>
      <img
        className="absolute top-0 left-0 h-[calc(88px*var(--bust-ratio)*var(--player-scale,1))] max-w-none translate-x-[calc(var(--bust-x)*-100%)] translate-y-[calc(var(--bust-y)*-100%)] drop-shadow-[0_1px_3px_rgb(0_0_0/0.85)]"
        src={PLAYER_ICONS.base}
        alt=""
        draggable={false}
      />
    </div>
  );
}
