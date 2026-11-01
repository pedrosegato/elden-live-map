import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { LocationCard } from "./components/LocationCard";
import { LocationSheet } from "./components/LocationSheet";
import { SessionNotice } from "./components/SessionNotice";
import { SessionTitle } from "./components/SessionTitle";
import { Sidebar } from "./components/Sidebar";
import { SidebarToggle } from "./components/SidebarToggle";
import { useGameSession } from "./hooks/useGameSession";
import { replaceLocationHash, useHashLocation } from "./hooks/useHashLocation";
import { useMediaQuery } from "./hooks/useMediaQuery";
import type { Preferences } from "./hooks/usePreferences";
import { toFeatures } from "./lib/features";
import { isLocationVisible, normalize } from "./lib/filters";
import { MarkerIconsContext } from "./lib/MarkerIconsContext";
import type { Dataset, LngLat, Selection } from "./lib/types";
import { FollowButton } from "./map/FollowButton";
import { LocationLayer } from "./map/LocationLayer";
import { MapFocus } from "./map/MapFocus";
import { MapPadding } from "./map/MapPadding";
import { MapPopup } from "./map/MapPopup";
import { MapView } from "./map/MapView";
import { PlayerMarker } from "./map/PlayerMarker";
import { RegionLabels } from "./map/RegionLabels";

const COMPACT_QUERY = "(max-width: 767px)";
const MAX_SEARCH_RESULTS = 60;
const REGION_LABEL_ZOOM_OFFSET = 3;

interface MapScreenProps {
  dataset: Dataset;
  preferences: Preferences;
  onPreferencesChange: (changes: Partial<Preferences>) => void;
  onCategoriesHidden: (categoryIds: number[], hidden: boolean) => void;
}

export function MapScreen({ dataset, preferences, onPreferencesChange, onCategoriesHidden }: MapScreenProps) {
  const session = useGameSession();
  const compact = useMediaQuery(COMPACT_QUERY);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [following, setFollowing] = useState(true);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const searchText = useDeferredValue(normalize(query));

  const mapData = dataset.maps.find((candidate) => candidate.entry.id === preferences.mapId) ?? dataset.maps[0];
  const panelOpen = compact ? drawerOpen : preferences.sidebarOpen;

  const openLocation = useCallback(
    (locationId: number, lngLat?: LngLat) => {
      const target = dataset.locationIndex.get(locationId);
      const position = lngLat ?? target?.location.positions[0];
      if (!target || !position) return;
      setFollowing(false);
      if (target.mapData.entry.id !== mapData?.entry.id) {
        onPreferencesChange({ mapId: target.mapData.entry.id });
      }
      setSelection({ locationId, lngLat: position });
      replaceLocationHash(locationId);
      setDrawerOpen(false);
    },
    [dataset, mapData, onPreferencesChange],
  );

  useHashLocation(openLocation);

  const features = useMemo(() => {
    if (!mapData) return [];
    const filter = {
      hiddenCategories: preferences.hiddenCategories,
      found: session.found,
      hideFound: preferences.hideFound,
      query: searchText,
    };
    return mapData.locations
      .filter((location) => isLocationVisible(location, filter))
      .flatMap((location) => toFeatures(location, mapData, session.found));
  }, [mapData, preferences.hiddenCategories, preferences.hideFound, session.found, searchText]);

  const searchResults = useMemo(
    () =>
      searchText && mapData
        ? mapData.locations.filter((location) => location.searchText.includes(searchText)).slice(0, MAX_SEARCH_RESULTS)
        : [],
    [mapData, searchText],
  );

  const foundHere = useMemo(
    () => mapData?.locations.filter((location) => session.found.has(location.id)).length ?? 0,
    [mapData, session.found],
  );

  if (!mapData) return null;

  const selected = selection ? dataset.locationIndex.get(selection.locationId) : undefined;
  const closeSelection = () => {
    setSelection(null);
    replaceLocationHash(null);
  };
  const togglePanel = () => {
    if (compact) setDrawerOpen((open) => !open);
    else onPreferencesChange({ sidebarOpen: !preferences.sidebarOpen });
  };
  const card = selected && (
    <LocationCard
      location={selected.location}
      category={selected.mapData.categoriesById.get(selected.location.categoryId)}
      found={session.found.has(selected.location.id)}
      canTrack={session.profile !== null}
      onToggleFound={session.toggleFound}
      onClose={closeSelection}
    />
  );

  return (
    <MarkerIconsContext value={dataset.icons}>
      <div className="relative h-dvh overflow-hidden">
        <SessionTitle profile={session.profile} />
        <Sidebar
          open={panelOpen}
          maps={dataset.maps}
          mapData={mapData}
          profile={session.profile}
          foundHere={foundHere}
          query={query}
          searchResults={searchResults}
          hiddenCategories={preferences.hiddenCategories}
          hideFound={preferences.hideFound}
          expandedGroups={preferences.expandedGroups}
          onToggle={togglePanel}
          onMapChange={(mapId) => {
            setFollowing(false);
            closeSelection();
            onPreferencesChange({ mapId });
          }}
          onQueryChange={setQuery}
          onSelectLocation={openLocation}
          onCategoriesHidden={onCategoriesHidden}
          onHideFoundChange={(hideFound) => onPreferencesChange({ hideFound })}
          onExpandedGroupsChange={(expandedGroups) => onPreferencesChange({ expandedGroups })}
        />
        <main className="absolute inset-0">
          <MapView mapData={mapData} icons={dataset.icons}>
            <MapPadding left={panelOpen && !compact} />
            <LocationLayer features={features} onSelect={openLocation} />
            <RegionLabels
              regions={mapData.regions}
              referenceZoom={mapData.entry.tiles.minzoom + REGION_LABEL_ZOOM_OFFSET}
            />
            <PlayerMarker
              calibration={dataset.calibration}
              activeMapId={mapData.entry.id}
              following={following}
              subscribePosition={session.subscribePosition}
              onFollowingChange={setFollowing}
              onPlayerMapChange={(mapId) => onPreferencesChange({ mapId })}
            />
            <FollowButton following={following} onToggle={() => setFollowing((value) => !value)} />
            {selection && <MapFocus lngLat={selection.lngLat} mapId={mapData.entry.id} />}
            {selection && !compact && card && (
              <MapPopup lngLat={selection.lngLat} onClose={closeSelection}>
                {card}
              </MapPopup>
            )}
          </MapView>
          <SidebarToggle placement="map" open={panelOpen} compact={compact} onToggle={togglePanel} />
        </main>
        {compact && card && <LocationSheet>{card}</LocationSheet>}
        {!session.profile && <SessionNotice connection={session.connection} />}
      </div>
    </MarkerIconsContext>
  );
}
