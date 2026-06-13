import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-input";
import { cn } from "@/lib/utils";

type FilterOption = {
  label: string;
  value: string;
};

type FilterSelect = {
  label: string;
  options: FilterOption[];
};

type FilterBarProps = {
  searchPlaceholder?: string;
  filters?: FilterSelect[];
  quickFilters?: string[];
  className?: string;
};

export function FilterBar({
  searchPlaceholder = "Buscar",
  filters = [],
  quickFilters = [],
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "mb-4 rounded-lg border bg-card p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="min-w-0 flex-1">
          <SearchInput
            placeholder={searchPlaceholder}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:shrink-0">
          {filters.map((filter) => (
            <label key={filter.label} className="min-w-36">
              <span className="sr-only">{filter.label}</span>
              <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20">
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
      {quickFilters.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {quickFilters.map((filter, index) => (
            <Button
              key={filter}
              type="button"
              variant={index === 0 ? "subtle" : "outline"}
              size="sm"
            >
              {filter}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
