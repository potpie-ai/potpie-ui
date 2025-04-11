import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";

interface MultiSelectDropdownProps {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}

export function MultiSelectDropdown({
  options,
  value,
  onChange,
}: MultiSelectDropdownProps) {
  const handleSelect = (optionValue: string) => {
    const isSelected = value.includes(optionValue);
    const newValue = isSelected
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleRemove = (
    optionValue: string,
    e: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) => {
    e.stopPropagation();
    const newSelectedOptions = value.filter((v) => v !== optionValue);
    onChange(newSelectedOptions);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="min-h-[2rem] w-1/2 border border-gray-200 dark:border-gray-800 items-center justify-start rounded-md text-sm font-medium p-2">
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {options
                .filter((option) => value.includes(option.value))
                .map((option) => (
                  <Badge
                    key={option.value}
                    variant="outline"
                    className="p-2 bg-slate-100"
                  >
                    <span>{option.label}</span>
                    <X
                      className="peer hover:cursor-pointer ml-2"
                      size={14}
                      onClick={(e) => handleRemove(option.value, e)}
                    />
                  </Badge>
                ))}
            </div>
          ) : (
            <span className="text-gray-400/50 dark:text-white/50">
              Select triggers
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-white dark:bg-gray-900">
        <Command>
          <CommandInput placeholder="Search triggers..." />
          <CommandList>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <div className="flex items-center">
                    <Switch
                      id="trigger-select"
                      checked={value.includes(option.value)}
                      className="mr-2 scale-75"
                      style={{
                        backgroundColor: value.includes(option.value)
                          ? "green"
                          : "#e5e7eb",
                      }}
                    />
                    {option.label}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
