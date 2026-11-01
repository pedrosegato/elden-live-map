import { Suspense, useRef, useState } from "react";
import { AllCategoriesToggle } from "@/components/AllCategoriesToggle";
import { CategoryRow } from "@/components/CategoryRow";
import { FullscreenNotice } from "@/components/FullscreenNotice";
import { GroupHeader } from "@/components/GroupHeader";
import { Lightbox } from "@/components/Lightbox";
import { LocationCard } from "@/components/LocationCard";
import { LocationSheet } from "@/components/LocationSheet";
import { MarkerIcon } from "@/components/MarkerIcon";
import { Sidebar } from "@/components/Sidebar";
import { SidebarToggle } from "@/components/SidebarToggle";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { t } from "@/lib/copy";
import { dataUrl } from "@/lib/dataset";
import { normalize } from "@/lib/filters";
import type { Dataset, IndexedLocation, Profile } from "@/lib/types";
import { FollowButton } from "@/map/FollowButton";
import { PlayerNeedle } from "@/map/PlayerNeedle";
import { Frame } from "./Frame";
import { IconAudit } from "./IconAudit";

const PROFILE: Profile = { id: "gallery", characterName: "Tarnished", slot: 0 };
const WITH_PHOTOS = 165336;
const PLAIN = 163937;
const SEARCH = "moonveil";
const noop = () => {};

interface GallerySheetProps {
  dataset: Dataset;
}

export function GallerySheet({ dataset }: GallerySheetProps) {
  const headingRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const mapData = dataset.maps[0];
  const withPhotos = dataset.locationIndex.get(WITH_PHOTOS);
  const plain = dataset.locationIndex.get(PLAIN);
  if (!mapData || !withPhotos || !plain) return <p className="p-10 text-bone-400">Sample locations missing.</p>;

  const firstGroup = mapData.groups[0];
  const lastGroup = mapData.groups.at(-1);
  const hidden = new Set([
    ...(firstGroup?.categories.slice(1, 3).map((category) => category.id) ?? []),
    ...(lastGroup?.categories.map((category) => category.id) ?? []),
  ]);
  const expanded = new Set(firstGroup ? [firstGroup.id] : []);
  const results = mapData.locations.filter((location) => location.searchText.includes(normalize(SEARCH)));
  const category = (entry: IndexedLocation) => entry.mapData.categoriesById.get(entry.location.categoryId);
  const card = (entry: IndexedLocation, found: boolean, canTrack = true) => (
    <LocationCard
      location={entry.location}
      category={category(entry)}
      found={found}
      canTrack={canTrack}
      onToggleFound={noop}
      onClose={noop}
    />
  );
  const popup = (entry: IndexedLocation, found: boolean, canTrack = true) => (
    <div className="location-popup">
      <div className="maplibregl-popup-content">{card(entry, found, canTrack)}</div>
    </div>
  );
  const sidebar = (query: string, searchResults = results) => (
    <Sidebar
      open
      maps={dataset.maps}
      mapData={mapData}
      profile={PROFILE}
      foundHere={412}
      query={query}
      searchResults={searchResults}
      hiddenCategories={hidden}
      hideFound={false}
      expandedGroups={expanded}
      onToggle={noop}
      onMapChange={noop}
      onQueryChange={noop}
      onSelectLocation={noop}
      onCategoriesHidden={noop}
      onHideFoundChange={noop}
      onExpandedGroupsChange={noop}
    />
  );
  const photos = (withPhotos.location.media ?? []).flatMap((item) =>
    item.type === "image" ? [{ src: dataUrl(item.src), alt: withPhotos.location.title }] : [],
  );

  return (
    <main className="flex min-h-dvh flex-col gap-12 bg-ink-950 px-10 pt-8 pb-16">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="font-display text-[1.4rem] font-semibold tracking-[0.08em] text-bone-100">Component gallery</h1>
      </header>

      <section id="audit" className="flex flex-col gap-4.5">
        <h2 className="font-display text-[0.86rem] font-semibold tracking-[0.14em] text-gold-300 uppercase">
          Icon audit
        </h2>
        <Suspense fallback={<p className="text-bone-400">Loading the audit…</p>}>
          <IconAudit />
        </Suspense>
      </section>

      <section className="flex flex-col gap-4.5">
        <h2 className="font-display text-[0.86rem] font-semibold tracking-[0.14em] text-gold-300 uppercase">
          Session screens
        </h2>
        <div className="flex flex-wrap items-start gap-7">
          <Frame label="Loading the dataset" width={420} height={260}>
            <FullscreenNotice title={t("loadingTitle")} />
          </Frame>
          <Frame label="Dataset missing" width={420} height={260}>
            <FullscreenNotice title={t("errorTitle")} detail={t("errorDetail")} />
          </Frame>
          <Frame label="Connecting to the game" width={420} height={260} backdrop="map">
            <FullscreenNotice translucent title={t("connectingTitle")} />
          </Frame>
          <Frame label="Game closed" width={420} height={260} backdrop="map">
            <FullscreenNotice translucent title={t("offlineTitle")} />
          </Frame>
          <Frame label="Title screen, no save loaded" width={420} height={260} backdrop="map">
            <FullscreenNotice translucent title={t("menuTitle")} />
          </Frame>
        </div>
      </section>

      <section className="flex flex-col gap-4.5">
        <h2 className="font-display text-[0.86rem] font-semibold tracking-[0.14em] text-gold-300 uppercase">Legend</h2>
        <div className="flex flex-wrap items-start gap-7">
          <Frame label="Categories, some hidden" width={360} height={760}>
            {sidebar("")}
          </Frame>
          <Frame label={`Search: "${SEARCH}"`} width={360} height={760}>
            {sidebar(SEARCH)}
          </Frame>
          <Frame label="Search without results" width={360} height={760}>
            {sidebar("xyzzy", [])}
          </Frame>
        </div>
      </section>

      <section className="flex flex-col gap-4.5">
        <h2 className="font-display text-[0.86rem] font-semibold tracking-[0.14em] text-gold-300 uppercase">
          Location details
        </h2>
        <div className="flex flex-wrap items-start gap-7">
          <Frame label="Popup with photos" width={402}>
            {popup(withPhotos, false)}
          </Frame>
          <Frame label="Popup, marked found" width={402}>
            {popup(plain, true)}
          </Frame>
          <Frame label="Popup without a save loaded" width={402}>
            {popup(plain, false, false)}
          </Frame>
          <Frame label="Phone sheet" width={390} height={700} backdrop="map">
            <LocationSheet>{card(withPhotos, false)}</LocationSheet>
          </Frame>
        </div>
        <Button variant="outline" className="self-start" onClick={() => setLightboxOpen(true)}>
          Open the photo viewer
        </Button>
        {lightboxOpen && <Lightbox images={photos} startIndex={0} onClose={() => setLightboxOpen(false)} />}
      </section>

      <section className="flex flex-col gap-4.5">
        <h2 className="font-display text-[0.86rem] font-semibold tracking-[0.14em] text-gold-300 uppercase">
          Map controls
        </h2>
        <div className="flex flex-wrap items-start gap-7">
          <Frame label="Legend closed" width={240} height={80} backdrop="map">
            <SidebarToggle placement="map" open={false} onToggle={noop} />
          </Frame>
          <Frame label="Legend open, edge tab" width={420} height={80} backdrop="map">
            <SidebarToggle placement="map" open onToggle={noop} />
          </Frame>
          <Frame label="Follow player, off and on" width={260} height={200} backdrop="map">
            <div className="[&>button]:bottom-[146px]">
              <FollowButton following={false} onToggle={noop} />
            </div>
            <FollowButton following onToggle={noop} />
          </Frame>
          <Frame label="Player needle" width={200} height={200} backdrop="map">
            <div className="absolute top-1/2 left-1/2">
              <PlayerNeedle headingRef={headingRef} />
            </div>
          </Frame>
        </div>
      </section>

      <section className="flex flex-col gap-4.5">
        <h2 className="font-display text-[0.86rem] font-semibold tracking-[0.14em] text-gold-300 uppercase">
          Building blocks
        </h2>
        <div className="flex flex-wrap items-start gap-7">
          <Frame label="Checkbox: shown, partly, hidden" width={300}>
            <div className="flex flex-col gap-1 px-4 py-3">
              {(["all", "some", "none"] as const).map((state) => (
                <label key={state} className="flex min-h-9 items-center gap-3 text-bone-300">
                  <Checkbox checked={state === "all"} indeterminate={state === "some"} />
                  {state === "all"
                    ? "Every marker shown"
                    : state === "some"
                      ? "Some markers hidden"
                      : "Every marker hidden"}
                </label>
              ))}
            </div>
          </Frame>
          <Frame label="Switch" width={240}>
            <div className="flex flex-col gap-1 px-4 py-3">
              {[false, true].map((checked) => (
                <label key={String(checked)} className="flex min-h-8 items-center gap-2.5 text-bone-300">
                  {t("hideFound")}
                  <Switch checked={checked} />
                </label>
              ))}
            </div>
          </Frame>
          <Frame label="Group header, open and closed" width={360}>
            <AllCategoriesToggle total={mapData.locations.length} visibility="some" onVisibilityChange={noop} />
            {firstGroup && (
              <Collapsible open>
                <GroupHeader title={firstGroup.title} total={968} visibility="all" onVisibilityChange={noop} />
              </Collapsible>
            )}
            {lastGroup && (
              <Collapsible open={false}>
                <GroupHeader title={lastGroup.title} total={240} visibility="none" onVisibilityChange={noop} />
              </Collapsible>
            )}
          </Frame>
          <Frame label="Category rows, shown and hidden" width={360}>
            <ul className="m-0 list-none p-1.5">
              {firstGroup?.categories.slice(0, 4).map((entry, index) => (
                <CategoryRow
                  key={entry.id}
                  category={entry}
                  count={mapData.countsByCategory.get(entry.id) ?? 0}
                  hidden={index > 1}
                  onToggle={noop}
                />
              ))}
            </ul>
          </Frame>
          <Frame label="Marker icons" width={360}>
            <div className="flex flex-wrap gap-2 p-3.5">
              {[...mapData.categoriesById.values()].map((entry) => (
                <MarkerIcon key={entry.id} id={entry.icon} box={36} />
              ))}
            </div>
          </Frame>
        </div>
      </section>
    </main>
  );
}
