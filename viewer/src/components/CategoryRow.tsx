import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { formatCount } from "@/lib/copy";
import type { Category } from "@/lib/types";
import { MarkerIcon } from "./MarkerIcon";

const ICON_BOX = 24;

interface CategoryRowProps {
  category: Category;
  count: number;
  hidden: boolean;
  onToggle: (categoryId: number) => void;
}

export function CategoryRow({ category, count, hidden, onToggle }: CategoryRowProps) {
  return (
    <li>
      <Item
        variant="select"
        size="xs"
        render={<button type="button" aria-pressed={!hidden} onClick={() => onToggle(category.id)} />}
        className="group/row min-h-[34px] flex-nowrap gap-3 py-0.5 pr-[30px] pl-1.5 pointer-coarse:min-h-[42px]"
      >
        <ItemMedia className="transition-[opacity,filter] group-aria-[pressed=false]/row:opacity-45 group-aria-[pressed=false]/row:grayscale">
          <MarkerIcon id={category.icon} box={ICON_BOX} />
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle className="w-full truncate group-aria-[pressed=false]/row:text-bone-500/70">
            {category.title}
          </ItemTitle>
        </ItemContent>
        <ItemActions className="text-[0.88rem] text-bone-500 tabular-nums group-aria-[pressed=false]/row:text-bone-500/70">
          {formatCount(count)}
        </ItemActions>
      </Item>
    </li>
  );
}
