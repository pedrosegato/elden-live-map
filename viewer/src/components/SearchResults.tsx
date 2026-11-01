import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { t } from "@/lib/copy";
import type { Location, MapData } from "@/lib/types";
import { MarkerIcon } from "./MarkerIcon";

const ICON_BOX = 24;

interface SearchResultsProps {
  query: string;
  results: Location[];
  mapData: MapData;
  onSelect: (locationId: number) => void;
}

export function SearchResults({ query, results, mapData, onSelect }: SearchResultsProps) {
  if (results.length === 0) {
    return <p className="mx-[18px] my-4 text-base text-bone-400 italic">{t("noResults", { query })}</p>;
  }
  return (
    <ul className="m-0 grid list-none px-1.5 pt-2 pb-3">
      {results.map((location) => {
        const category = mapData.categoriesById.get(location.categoryId);
        return (
          <li key={location.id}>
            <Item
              variant="select"
              size="xs"
              render={<button type="button" onClick={() => onSelect(location.id)} />}
              className="min-h-11 flex-nowrap gap-3 px-1.5 py-1"
            >
              <ItemMedia>
                <MarkerIcon id={location.icon ?? category?.icon ?? ""} box={ICON_BOX} />
              </ItemMedia>
              <ItemContent className="min-w-0 gap-0">
                <ItemTitle className="w-full truncate">{location.title}</ItemTitle>
                {category && <ItemDescription>{category.title}</ItemDescription>}
              </ItemContent>
            </Item>
          </li>
        );
      })}
    </ul>
  );
}
