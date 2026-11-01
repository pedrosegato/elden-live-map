import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/lib/copy";
import type { MapData } from "@/lib/types";

interface MapSwitcherProps {
  maps: MapData[];
  activeMapId: string;
  onChange: (mapId: string) => void;
}

export function MapSwitcher({ maps, activeMapId, onChange }: MapSwitcherProps) {
  return (
    <Tabs className="min-w-0 flex-1" value={activeMapId} onValueChange={(value) => onChange(String(value))}>
      <TabsList aria-label={t("mapLabel")}>
        {maps.map(({ entry }) => (
          <TabsTrigger key={entry.id} value={entry.id}>
            {entry.title}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
