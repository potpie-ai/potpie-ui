import React, { useState, useEffect } from "react";
import { X, Plus, Info, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Filter, FolderTree, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import FileTree from "./FileTree";

export interface ParseFilters {
    excluded_directories: string[];
    excluded_files: string[];
    excluded_extensions: string[];
    include_mode: boolean;
}

interface FileSelectorProps {
    filters: ParseFilters;
    setFilters: (filters: ParseFilters) => void;
    repoName?: string;
    branchName?: string;
    isParsing?: boolean;
}

const COMMON_EXTENSIONS = [
    ".min.js",
    ".min.css",
    ".map",
    ".d.ts",
    ".pyc",
    ".pyo",
    ".class",
    ".o",
    ".log",
    ".lock",
];

const TagInput = ({
    label,
    items,
    onAdd,
    onRemove,
    placeholder,
    tooltip,
    suggestions = [],
}: {
    label: string;
    items: string[];
    onAdd: (item: string) => void;
    onRemove: (index: number) => void;
    placeholder: string;
    tooltip?: string;
    suggestions?: string[];
}) => {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && inputValue.trim()) {
            e.preventDefault();
            onAdd(inputValue.trim());
            setInputValue("");
        }
    };

    const handleAdd = () => {
        if (inputValue.trim()) {
            onAdd(inputValue.trim());
            setInputValue("");
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">{label}</Label>
                {tooltip && (
                    <Tooltip>
                        <TooltipTrigger>
                            <span className="inline-flex">
                                <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p className="max-w-xs text-xs">{tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
            <div className="flex gap-2">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-1 h-9 text-sm"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdd}
                    className="h-9 w-9 p-0"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {suggestions.map((s) => (
                        <Badge
                            key={s}
                            variant="outline"
                            className={cn(
                                "cursor-pointer hover:bg-secondary text-[10px] px-1 py-0 h-5 font-normal",
                                items.includes(s) && "bg-secondary text-secondary-foreground"
                            )}
                            onClick={() => {
                                if (!items.includes(s)) onAdd(s);
                            }}
                        >
                            {s}
                        </Badge>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-2 min-h-[24px]">
                {items.map((item, index) => (
                    <Badge key={index} variant="secondary" className="gap-1 pr-1">
                        {item}
                        <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => onRemove(index)}
                        />
                    </Badge>
                ))}
            </div>
        </div>
    );
};

const FileSelector: React.FC<FileSelectorProps> = ({ filters, setFilters, repoName, branchName, isParsing }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Collapse when parsing starts
    useEffect(() => {
        if (isParsing) {
            setIsOpen(false);
        }
    }, [isParsing]);

    const updateFilter = (key: keyof ParseFilters, value: any) => {
        setFilters({ ...filters, [key]: value });
    };

    const addItem = (key: keyof ParseFilters, item: string) => {
        const currentList = filters[key] as string[];
        if (!currentList.includes(item)) {
            updateFilter(key, [...currentList, item]);
        }
    };

    const removeItem = (key: keyof ParseFilters, index: number) => {
        const currentList = filters[key] as string[];
        updateFilter(
            key,
            currentList.filter((_, i) => i !== index)
        );
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className="w-full border rounded-md p-3 bg-white mt-4 shadow-sm">
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 w-6 h-6 hover:bg-gray-100 rounded-full">
                                    {isOpen ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                </Button>
                            </CollapsibleTrigger>
                            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                                <Settings2 className="h-4 w-4 text-gray-400" />
                                <h3 className="font-medium text-sm">Parsing Options</h3>
                            </div>

                            {/* Show active filter count when closed */}
                            {!isOpen && (
                                <div className="flex gap-2 ml-2">
                                    {(filters.excluded_directories.length > 0 ||
                                        filters.excluded_files.length > 0 ||
                                        filters.excluded_extensions.length > 0) && (
                                            <Badge variant="secondary" className="text-xs h-5">
                                                {filters.excluded_directories.length +
                                                    filters.excluded_files.length +
                                                    filters.excluded_extensions.length} filters active
                                            </Badge>
                                        )}
                                </div>
                            )}
                        </div>

                        {isOpen && (
                            <div className="flex items-center gap-2">
                                <Label htmlFor="include-mode" className={cn("text-xs cursor-pointer", filters.include_mode ? "font-bold text-primary" : "text-gray-500")}>
                                    {filters.include_mode ? "Include Only" : "Exclude Mode"}
                                </Label>
                                <Switch
                                    id="include-mode"
                                    checked={filters.include_mode}
                                    onCheckedChange={(checked) =>
                                        updateFilter("include_mode", checked)
                                    }
                                />
                            </div>
                        )}
                    </div>

                    <CollapsibleContent className="space-y-4 mt-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Left Column: File Tree */}
                            <div className="flex flex-col">
                                <h4 className="font-medium text-xs mb-2 flex items-center gap-1.5 text-gray-600 uppercase tracking-wide">
                                    <FolderTree className="h-3.5 w-3.5" />
                                    File Tree
                                </h4>
                                <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[400px] border rounded-lg bg-gray-50/30">
                                    {repoName && branchName ? (
                                        <FileTree
                                            repoName={repoName}
                                            branchName={branchName}
                                            filters={filters}
                                            setFilters={setFilters}
                                        />
                                    ) : (
                                        <div className="text-center p-8 text-gray-500 text-sm">
                                            Select a repository and branch to view files.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Filter Rules */}
                            <div className="lg:col-span-2 space-y-5 border-l pl-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-3">
                                        <TagInput
                                            label="Directories"
                                            items={filters.excluded_directories}
                                            onAdd={(item) => addItem("excluded_directories", item)}
                                            onRemove={(index) => removeItem("excluded_directories", index)}
                                            placeholder="e.g. node_modules, dist"
                                            tooltip="Directories to exclude (or include) from parsing."
                                        />
                                        <TagInput
                                            label="Files (Glob Patterns)"
                                            items={filters.excluded_files}
                                            onAdd={(item) => addItem("excluded_files", item)}
                                            onRemove={(index) => removeItem("excluded_files", index)}
                                            placeholder="e.g. *.test.js, package-lock.json"
                                            tooltip="File or file patterns to exclude (or include). Supports wildcards (*)."
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <TagInput
                                            label="Extensions"
                                            items={filters.excluded_extensions}
                                            onAdd={(item) => addItem("excluded_extensions", item)}
                                            onRemove={(index) => removeItem("excluded_extensions", index)}
                                            placeholder="e.g. .min.js, .map, .py"
                                            tooltip="File extensions to exclude (or include)."
                                            suggestions={COMMON_EXTENSIONS}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={cn("text-xs px-3 py-2.5 rounded-lg border", filters.include_mode ? "bg-blue-50/70 border-blue-100 text-blue-600" : "bg-gray-50/70 border-gray-100 text-gray-500")}>
                            <div className="flex items-center gap-2">
                                <Info className="h-3.5 w-3.5 shrink-0" />
                                <p>
                                    {filters.include_mode
                                        ? "Include Mode Active: Only files matching the criteria above will be parsed. Everything else will be ignored."
                                        : "Exclude Mode Active: Files matching the criteria above will be skipped. Everything else will be parsed."}
                                </p>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </TooltipProvider>
    );
};

export default FileSelector;