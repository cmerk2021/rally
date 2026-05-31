import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { servicesApi, assetsApi, projectsApi } from "@/api";
import { cn } from "@/lib/utils";

type EntityType = "service" | "asset" | "project";

interface EntityPickerProps {
  type: EntityType;
  value: string[] | string;
  onChange: (value: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function EntityPicker({
  type,
  value,
  onChange,
  multiple = true,
  placeholder = "Select…",
  disabled = false,
}: EntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedIds = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );

  const { data } = useQuery({
    queryKey: [type, "picker-list"],
    queryFn: async () => {
      if (type === "service") return (await servicesApi.list({ perPage: 200 })).items;
      if (type === "asset") return (await assetsApi.list({ perPage: 200 })).items;
      return (await projectsApi.list({ perPage: 200 })).items;
    },
  });

  const items = data ?? [];
  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((i) => (i.name as string).toLowerCase().includes(q));
  }, [items, query]);

  const labelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of items) m.set(i.id, i.name as string);
    return m;
  }, [items]);

  const toggle = (id: string) => {
    if (!multiple) {
      onChange([id]);
      setOpen(false);
      return;
    }
    if (selectedIds.includes(id)) onChange(selectedIds.filter((s) => s !== id));
    else onChange([...selectedIds, id]);
  };

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate text-left">
              {selectedIds.length > 0
                ? `${selectedIds.length} selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <Input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2 h-8"
            autoFocus
          />
          <div className="max-h-60 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 && (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                No matches
              </div>
            )}
            {filtered.map((i) => {
              const checked = selectedIds.includes(i.id);
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => toggle(i.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left",
                    checked && "bg-accent",
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5", checked ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{i.name}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs"
            >
              {labelById.get(id) ?? id}
              <button
                type="button"
                onClick={() => toggle(id)}
                className="opacity-70 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
