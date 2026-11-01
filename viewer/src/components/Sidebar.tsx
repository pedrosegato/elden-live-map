import { visibilityOf } from "@/lib/filters";
import type { Location, MapData, Profile } from "@/lib/types";
import { AllCategoriesToggle } from "./AllCategoriesToggle";
import { CategoryGroup } from "./CategoryGroup";
import { MapSwitcher } from "./MapSwitcher";
import { ProgressSummary } from "./ProgressSummary";
import { SearchField } from "./SearchField";
import { SearchResults } from "./SearchResults";
import { SidebarToggle } from "./SidebarToggle";

interface SidebarProps {
  open: boolean;
  maps: MapData[];
  mapData: MapData;
  profile: Profile | null;
  foundHere: number;
  query: string;
  searchResults: Location[];
  hiddenCategories: ReadonlySet<number>;
  hideFound: boolean;
  expandedGroups: ReadonlySet<number> | null;
  onToggle: () => void;
  onMapChange: (mapId: string) => void;
  onQueryChange: (query: string) => void;
  onSelectLocation: (locationId: number) => void;
  onCategoriesHidden: (categoryIds: number[], hidden: boolean) => void;
  onHideFoundChange: (hideFound: boolean) => void;
  onExpandedGroupsChange: (expandedGroups: ReadonlySet<number>) => void;
}

export function Sidebar({
  open,
  maps,
  mapData,
  profile,
  foundHere,
  query,
  searchResults,
  hiddenCategories,
  hideFound,
  expandedGroups,
  onToggle,
  onMapChange,
  onQueryChange,
  onSelectLocation,
  onCategoriesHidden,
  onHideFoundChange,
  onExpandedGroupsChange,
}: SidebarProps) {
  const allCategoryIds = [...mapData.countsByCategory.keys()];
  const expanded = expandedGroups ?? new Set(maps.flatMap((map) => map.groups.slice(0, 1).map((group) => group.id)));
  const toggleCategory = (categoryId: number) => onCategoriesHidden([categoryId], !hiddenCategories.has(categoryId));
  const toggleExpanded = (groupId: number) => {
    const next = new Set(expanded);
    if (!next.delete(groupId)) next.add(groupId);
    onExpandedGroupsChange(next);
  };

  return (
    <aside
      id="map-legend"
      data-open={open}
      inert={!open}
      className="absolute inset-y-0 left-0 z-5 flex w-(--sidebar-width) flex-col border-r bg-background shadow-[12px_0_32px_rgb(0_0_0/0.45)] transition-[translate,visibility] duration-[280ms,0s] ease-out-expo data-[open=false]:invisible data-[open=false]:-translate-x-full data-[open=false]:delay-[0s,240ms] max-md:fixed max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:h-[min(82dvh,680px)] max-md:w-full max-md:border-t max-md:border-r-0 max-md:shadow-[0_-16px_40px_rgb(0_0_0/0.55)] max-md:data-[open=false]:translate-x-0 max-md:data-[open=false]:translate-y-full"
    >
      <header className="flex flex-col gap-3.5 border-b bg-(image:--deck-glow) pb-4">
        <div className="flex items-stretch">
          <MapSwitcher maps={maps} activeMapId={mapData.entry.id} onChange={onMapChange} />
          <SidebarToggle placement="drawer" open onToggle={onToggle} />
        </div>
        <ProgressSummary
          profile={profile}
          found={foundHere}
          total={mapData.locations.length}
          hideFound={hideFound}
          onHideFoundChange={onHideFoundChange}
        />
        <SearchField value={query} onChange={onQueryChange} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {query ? (
          <SearchResults query={query} results={searchResults} mapData={mapData} onSelect={onSelectLocation} />
        ) : (
          <>
            <AllCategoriesToggle
              total={mapData.locations.length}
              visibility={visibilityOf(allCategoryIds, hiddenCategories)}
              onVisibilityChange={(visible) => onCategoriesHidden(allCategoryIds, !visible)}
            />
            {mapData.groups.map((group) => (
              <CategoryGroup
                key={group.id}
                group={group}
                counts={mapData.countsByCategory}
                hiddenCategories={hiddenCategories}
                expanded={expanded.has(group.id)}
                onExpandedChange={toggleExpanded}
                onToggleCategory={toggleCategory}
                onCategoriesHidden={onCategoriesHidden}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
