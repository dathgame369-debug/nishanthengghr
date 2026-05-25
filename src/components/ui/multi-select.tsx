import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  width?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select…",
  className,
  searchable = true,
  width = "w-56",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const allSelected = selected.length === options.length && options.length > 0;

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };

  const summary = selected.length === 0
    ? placeholder
    : selected.length === options.length
      ? "All"
      : selected.length === 1
        ? options.find(o => o.value === selected[0])?.label || "1 selected"
        : `${selected.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(width, "justify-between font-normal", className)}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(width, "p-0")} align="start">
        <div className="p-2 border-b flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => onChange(allSelected ? [] : options.map(o => o.value))}
          />
          <span className="text-xs font-medium">Select all</span>
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        {searchable && (
          <div className="p-2 border-b">
            <Input
              placeholder="Search…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">No options</div>
          ) : filtered.map(opt => {
            const checked = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                  checked ? "bg-primary border-primary" : "border-input"
                )}>
                  {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}