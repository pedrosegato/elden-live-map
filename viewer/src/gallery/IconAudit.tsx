import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { use, useDeferredValue, useState } from "react";
import { MarkerIcon } from "@/components/MarkerIcon";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { formatCount } from "@/lib/copy";
import { dataUrl } from "@/lib/dataset";
import { normalize } from "@/lib/filters";

interface AuditRow {
  title: string;
  category: string;
  icon: string;
  method: string;
  source: string;
  count: number;
}

const METHOD_ORDER = [
  "official name, icon id",
  "armor set piece",
  "rewritten title",
  "game menu tab icon",
  "HUD icon",
  "drawn stamp",
  "game map icon",
  "generic stamp",
];
const OPEN_BY_DEFAULT = new Set(METHOD_ORDER.slice(0, 4));

const auditRequest: Promise<AuditRow[]> = fetch(dataUrl("icon-audit.json"))
  .then((response) => (response.ok ? response.json() : []))
  .catch(() => []);

export function IconAudit() {
  const rows = use(auditRequest);
  const [query, setQuery] = useState("");
  const search = useDeferredValue(normalize(query));
  if (rows.length === 0) return <p className="text-bone-400">Run the dataset build to produce icon-audit.json.</p>;

  const groups = METHOD_ORDER.map((method) => {
    const members = rows.filter(
      (row) => row.method === method && (!search || normalize(`${row.title} ${row.category}`).includes(search)),
    );
    return { method, members, markers: members.reduce((sum, row) => sum + row.count, 0) };
  }).filter((group) => group.members.length > 0);

  return (
    <div className="flex flex-col gap-2">
      <InputGroup className="max-w-md">
        <InputGroupInput
          type="search"
          aria-label="Filter the audit"
          placeholder="Filter by item or category"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <InputGroupAddon>
          <MagnifyingGlassIcon />
        </InputGroupAddon>
      </InputGroup>
      {groups.map(({ method, members, markers }) => (
        <Collapsible key={method} defaultOpen={OPEN_BY_DEFAULT.has(method)} className="border border-hairline">
          <CollapsibleTrigger className="group/trigger flex w-full cursor-pointer items-center gap-3 bg-background px-4 py-3 text-left">
            <span className="font-display text-[0.78rem] font-semibold tracking-[0.14em] text-gold-300 uppercase">
              {method}
            </span>
            <span className="text-[0.92rem] text-bone-500 tabular-nums">
              {formatCount(markers)} markers, {formatCount(members.length)} distinct
            </span>
            <CaretDownIcon className="ml-auto size-4 -rotate-90 text-bone-500 transition-transform group-data-[panel-open]/trigger:rotate-0" />
          </CollapsibleTrigger>
          <CollapsibleContent className="grid grid-cols-[auto_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_auto] items-center gap-x-4 gap-y-1 border-t border-hairline px-4 py-3 text-[0.95rem]">
            {members.map((row) => (
              <div key={`${row.title}|${row.category}|${row.icon}`} className="contents">
                <MarkerIcon id={row.icon} box={32} />
                <span className="truncate text-bone-100">{row.title}</span>
                <span className="truncate text-bone-400">{row.category}</span>
                <span className="truncate text-[0.85rem] text-bone-500">{row.source}</span>
                <span className="text-bone-500 tabular-nums">×{row.count}</span>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
