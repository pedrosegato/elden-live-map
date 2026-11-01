import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { t } from "@/lib/copy";
import type { Category, Location } from "@/lib/types";
import { MarkdownText } from "./MarkdownText";
import { MarkerIcon } from "./MarkerIcon";
import { MediaGallery } from "./MediaGallery";

const ICON_BOX = 34;

interface LocationCardProps {
  location: Location;
  category: Category | undefined;
  found: boolean;
  canTrack: boolean;
  onToggleFound: (locationId: number) => void;
  onClose: () => void;
}

export function LocationCard({ location, category, found, canTrack, onToggleFound, onClose }: LocationCardProps) {
  const showCategory = category && category.title.toLowerCase() !== location.title.toLowerCase();
  return (
    <article className="grid max-h-[min(64vh,600px)] grid-rows-[auto_minmax(0,1fr)]">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b bg-(image:--deck-glow) py-3.5 pr-2.5 pl-4">
        <MarkerIcon id={location.icon ?? category?.icon ?? ""} box={ICON_BOX} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="font-display text-[1.12rem] leading-tight font-semibold tracking-[0.05em] text-balance text-bone-100">
            {location.title}
          </h2>
          {showCategory && <p className="text-[0.92rem] text-muted-foreground">{category.title}</p>}
        </div>
        <Button variant="ghost" size="icon" aria-label={t("closeDetails")} title={t("closeDetails")} onClick={onClose}>
          <XIcon />
        </Button>
      </header>
      <div className="flex flex-col gap-3.5 overflow-y-auto overscroll-contain px-[18px] pt-3.5 pb-[18px] empty:hidden">
        {location.description && <MarkdownText text={location.description} />}
        {location.media && <MediaGallery media={location.media} title={location.title} />}
        {canTrack && (
          <Toggle
            variant="outline"
            className="w-full"
            pressed={found}
            onPressedChange={() => onToggleFound(location.id)}
          >
            {found && <CheckIcon data-icon="inline-start" />}
            {found ? t("found") : t("markFound")}
          </Toggle>
        )}
      </div>
    </article>
  );
}
