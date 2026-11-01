import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { t } from "@/lib/copy";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchField({ value, onChange }: SearchFieldProps) {
  return (
    <InputGroup className="mx-[18px] w-auto">
      <InputGroupInput
        type="search"
        aria-label={t("searchLabel")}
        placeholder={t("searchPlaceholder")}
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      <InputGroupAddon>
        <MagnifyingGlassIcon />
      </InputGroupAddon>
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            aria-label={t("clearSearch")}
            title={t("clearSearch")}
            onClick={() => onChange("")}
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
