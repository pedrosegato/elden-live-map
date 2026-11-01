import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { visibilityOf } from "@/lib/filters";
import type { Group } from "@/lib/types";
import { CategoryRow } from "./CategoryRow";
import { GroupHeader } from "./GroupHeader";

interface CategoryGroupProps {
  group: Group;
  counts: Map<number, number>;
  hiddenCategories: ReadonlySet<number>;
  expanded: boolean;
  onExpandedChange: (groupId: number) => void;
  onToggleCategory: (categoryId: number) => void;
  onCategoriesHidden: (categoryIds: number[], hidden: boolean) => void;
}

export function CategoryGroup({
  group,
  counts,
  hiddenCategories,
  expanded,
  onExpandedChange,
  onToggleCategory,
  onCategoriesHidden,
}: CategoryGroupProps) {
  const ids = group.categories.map((category) => category.id);
  const total = ids.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);

  return (
    <Collapsible render={<section />} open={expanded} onOpenChange={() => onExpandedChange(group.id)}>
      <GroupHeader
        title={group.title}
        total={total}
        visibility={visibilityOf(ids, hiddenCategories)}
        onVisibilityChange={(visible) => onCategoriesHidden(ids, !visible)}
      />
      <CollapsibleContent render={<ul />} className="m-0 grid list-none px-1.5 pt-1 pb-2.5">
        {group.categories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            count={counts.get(category.id) ?? 0}
            hidden={hiddenCategories.has(category.id)}
            onToggle={onToggleCategory}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
