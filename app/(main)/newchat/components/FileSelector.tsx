import React, { useState, useEffect } from "react";
import { X, Plus, Info, Folder, FileText, Hash, Regex, Trash2, ChevronDown, ChevronRight, FolderTree, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import FileTree, { calculateFileCounts } from "./FileTree";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";

export interface ParseFilters {
    excluded_directories: string[];
    excluded_files: string[];
    excluded_extensions: string[];
}

interface FileSelectorProps {
    filters: ParseFilters;
    setFilters: (filters: ParseFilters) => void;
    repoName?: string;
    branchName?: string;
    isParsing?: boolean;
}

const TagInput = ({
    label,
    items,
    onAdd,
    onRemove,
    placeholder,
    description,
    suggestions = [],
}: {
    label: string;
    items: string[];
    onAdd: (item: string) => void;
    onRemove: (index: number) => void;
    placeholder: string;
    description?: string;
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
            <div>
                <Label className="text-sm font-medium">{label}</Label>
                {description && (
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
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
        </div>
    );
};

// Exclusion Summary Component
const ExclusionSummary = ({ filters, onRemoveDirectory, onRemoveFile, onRemoveExtension, onClearAll, totalFiles, filesToParse }: {
    filters: ParseFilters;
    onRemoveDirectory: (index: number) => void;
    onRemoveFile: (index: number) => void;
    onRemoveExtension: (index: number) => void;
    onClearAll: () => void;
    totalFiles?: number;
    filesToParse?: number;
}) => {
    // Separate patterns (containing *) from static file paths
    const patterns = filters.excluded_files.filter(f => f.includes('*'));
    const staticFiles = filters.excluded_files.filter(f => !f.includes('*'));

    const hasExclusions = filters.excluded_directories.length > 0 ||
        filters.excluded_files.length > 0 ||
        filters.excluded_extensions.length > 0;

    if (!hasExclusions) {
        return (
            <div className="p-4 rounded-lg border border-dashed border-gray-200 bg-background/50">
                <p className="text-sm text-gray-400 text-center">
                    No exclusions configured. All files will be parsed.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-background/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Exclusion Summary
                </h4>
                <button
                    onClick={onClearAll}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                    <Trash2 className="h-3 w-3" />
                    Clear all
                </button>
            </div>

            {/* File Count Summary */}
            {totalFiles !== undefined && filesToParse !== undefined && (
                <div className="mx-4 mb-3 px-3 py-1.5 rounded-md bg-background border border-gray-200">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                            <span className="text-gray-500">Total: <span className="font-medium text-gray-700">{totalFiles.toLocaleString()}</span></span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500">To Parse: <span className="font-medium text-green-600">{filesToParse.toLocaleString()}</span></span>
                            {totalFiles > filesToParse && (
                                <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-gray-500">Excluded: <span className="font-medium text-orange-600">{(totalFiles - filesToParse).toLocaleString()}</span></span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="max-h-[290px] min-h-[200px] overflow-y-auto px-4 pb-4 space-y-4">
                {/* Extensions - broadest impact */}
                {filters.excluded_extensions.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <Hash className="h-3.5 w-3.5 text-purple-500" />
                            <span className="text-xs font-medium text-gray-600">
                                Extensions
                            </span>
                            <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                                {filters.excluded_extensions.length}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {filters.excluded_extensions.map((ext, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="gap-1 pr-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100"
                                >
                                    {ext}
                                    <X
                                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                                        onClick={() => onRemoveExtension(index)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Patterns */}
                {patterns.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <Regex className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-xs font-medium text-gray-600">
                                Patterns
                            </span>
                            <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                                {patterns.length}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {patterns.map((pattern) => {
                                const originalIndex = filters.excluded_files.indexOf(pattern);
                                return (
                                    <TooltipProvider key={originalIndex} delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge
                                                    variant="secondary"
                                                    className="gap-1 pr-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 cursor-default font-mono"
                                                >
                                                    {pattern.length > 25 ? `...${pattern.slice(-22)}` : pattern}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                                                        onClick={() => onRemoveFile(originalIndex)}
                                                    />
                                                </Badge>
                                            </TooltipTrigger>
                                            {pattern.length > 25 && (
                                                <TooltipContent side="top" className="max-w-xs">
                                                    <p className="text-xs font-mono break-all">{pattern}</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Folders */}
                {filters.excluded_directories.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <Folder className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-xs font-medium text-gray-600">
                                Folders
                            </span>
                            <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                                {filters.excluded_directories.length}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {filters.excluded_directories.map((dir, index) => (
                                <TooltipProvider key={index} delayDuration={300}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge
                                                variant="secondary"
                                                className="gap-1 pr-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-default"
                                            >
                                                {dir.length > 25 ? `...${dir.slice(-22)}` : dir}
                                                <X
                                                    className="h-3 w-3 cursor-pointer hover:text-red-500"
                                                    onClick={() => onRemoveDirectory(index)}
                                                />
                                            </Badge>
                                        </TooltipTrigger>
                                        {dir.length > 25 && (
                                            <TooltipContent side="top" className="max-w-xs">
                                                <p className="text-xs font-mono break-all">{dir}</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
                        </div>
                    </div>
                )}

                {/* Static Files - most specific */}
                {staticFiles.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-orange-500" />
                            <span className="text-xs font-medium text-gray-600">
                                Files
                            </span>
                            <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                                {staticFiles.length}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {staticFiles.map((file) => {
                                const originalIndex = filters.excluded_files.indexOf(file);
                                return (
                                    <TooltipProvider key={originalIndex} delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge
                                                    variant="secondary"
                                                    className="gap-1 pr-1 text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 cursor-default"
                                                >
                                                    {file.length > 25 ? `...${file.slice(-22)}` : file}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                                                        onClick={() => onRemoveFile(originalIndex)}
                                                    />
                                                </Badge>
                                            </TooltipTrigger>
                                            {file.length > 25 && (
                                                <TooltipContent side="top" className="max-w-xs">
                                                    <p className="text-xs font-mono break-all">{file}</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const FileSelector: React.FC<FileSelectorProps> = ({ filters, setFilters, repoName, branchName, isParsing }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [fileCounts, setFileCounts] = useState<{ totalFiles: number; filesToParse: number } | null>(null);

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
        <div className="w-full border rounded-md p-3 bg-background mt-4 shadow-sm">
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
                                                filters.excluded_extensions.length} exclusions
                                        </Badge>
                                    )}
                            </div>
                        )}
                    </div>
                </div>

                <CollapsibleContent forceMount className="data-[state=closed]:hidden space-y-4 mt-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Top Notice */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
                        <Info className="h-4 w-4 shrink-0" />
                        <p className="text-xs font-medium">
                            Unchecked files and folders will not be parsed. Only selected items will be included in the analysis.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Left Column: File Tree (50%) */}
                        <div className="flex flex-col">
                            <h4 className="font-medium text-xs mb-2 flex items-center gap-1.5 text-gray-600 uppercase tracking-wide">
                                <FolderTree className="h-3.5 w-3.5" />
                                File Tree
                            </h4>
                            <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[400px] border rounded-lg bg-background/30">
                                {repoName && branchName ? (
                                    <FileTree
                                        repoName={repoName}
                                        branchName={branchName}
                                        filters={filters}
                                        setFilters={setFilters}
                                        onFileCountsChange={setFileCounts}
                                    />
                                ) : (
                                    <div className="text-center p-8 text-gray-500 text-sm">
                                        Select a repository and branch to view files.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Extensions + Exclusion Summary */}
                        <div className="flex flex-col gap-3">
                            {/* Extensions */}
                            <div>
                                <TagInput
                                    label="Exclude Extensions"
                                    items={filters.excluded_extensions}
                                    onAdd={(item) => addItem("excluded_extensions", item)}
                                    onRemove={(index) => removeItem("excluded_extensions", index)}
                                    placeholder="e.g. .min.js, .map, .log"
                                    description="Skip all files ending with these extensions"
                                />
                            </div>

                            {/* Exclusion Summary */}
                            <ExclusionSummary
                                filters={filters}
                                onRemoveDirectory={(index) => removeItem("excluded_directories", index)}
                                onRemoveFile={(index) => removeItem("excluded_files", index)}
                                onRemoveExtension={(index) => removeItem("excluded_extensions", index)}
                                onClearAll={() => setFilters({
                                    ...filters,
                                    excluded_directories: [],
                                    excluded_files: [],
                                    excluded_extensions: []
                                })}
                                totalFiles={fileCounts?.totalFiles}
                                filesToParse={fileCounts?.filesToParse}
                            />
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};

export default FileSelector;