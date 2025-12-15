import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ChevronRight, ChevronDown, Folder, File, Loader2, Search, X, Settings, Regex } from "lucide-react";
import { minimatch } from "minimatch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";

// Duplicate interface to avoid circular dependency
export interface ParseFilters {
    excluded_directories: string[];
    excluded_files: string[];
    excluded_extensions: string[];
}

interface FileNode {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: FileNode[];
}

interface FileTreeProps {
    repoName: string;
    branchName: string;
    filters: ParseFilters;
    setFilters: (filters: ParseFilters) => void;
    onFileCountsChange?: (counts: { totalFiles: number; filesToParse: number }) => void;
}

// Sort nodes: directories first, then files, alphabetically within each group
const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return [...nodes].sort((a, b) => {
        // Directories come first
        if (a.type === "directory" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "directory") return 1;
        // Alphabetically within same type
        return a.name.localeCompare(b.name);
    });
};

// VS Code style search result item - flat list with path on the side
const SearchResultItem = ({
    node,
    isSelected,
    onToggle,
    searchQuery,
}: {
    node: FileNode;
    isSelected: boolean;
    onToggle: (node: FileNode, checked: boolean) => void;
    searchQuery: string;
}) => {
    // Get parent path (everything except the file/folder name)
    const parentPath = node.path.includes("/")
        ? node.path.substring(0, node.path.lastIndexOf("/"))
        : "";

    // Highlight matching text in name
    const highlightMatch = (text: string) => {
        if (!searchQuery) return text;
        const index = text.toLowerCase().indexOf(searchQuery.toLowerCase());
        if (index === -1) return text;
        return (
            <>
                {text.slice(0, index)}
                <span className="bg-yellow-200 rounded px-0.5">{text.slice(index, index + searchQuery.length)}</span>
                {text.slice(index + searchQuery.length)}
            </>
        );
    };

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer group">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => onToggle(node, checked as boolean)}
                            className="h-4 w-4 shrink-0"
                        />

                        {node.type === "directory" ? (
                            <Folder className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : (
                            <File className="h-4 w-4 text-gray-500 shrink-0" />
                        )}

                        <span className="text-sm font-medium truncate">
                            {highlightMatch(node.name)}
                        </span>

                        {parentPath && (
                            <span className="text-xs text-gray-400 truncate ml-auto pl-2 max-w-[50%] text-right">
                                {parentPath}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md">
                    <p className="text-xs font-mono">{node.path}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

// Pattern preview item - no checkbox, just shows what will be excluded
const PatternPreviewItem = ({
    node,
}: {
    node: FileNode;
}) => {
    const parentPath = node.path.includes("/")
        ? node.path.substring(0, node.path.lastIndexOf("/"))
        : "";

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded cursor-default group">
                        {node.type === "directory" ? (
                            <Folder className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : (
                            <File className="h-4 w-4 text-gray-500 shrink-0" />
                        )}

                        <span className="text-sm truncate text-gray-700">
                            {node.name}
                        </span>

                        {parentPath && (
                            <span className="text-xs text-gray-400 truncate ml-auto pl-2 max-w-[50%] text-right">
                                {parentPath}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md">
                    <p className="text-xs font-mono">{node.path}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

const FileTreeNode = ({
    node,
    level,
    selectedPaths,
    onToggle,
    searchQuery,
    forceOpen,
}: {
    node: FileNode;
    level: number;
    selectedPaths: Set<string>;
    onToggle: (node: FileNode, checked: boolean) => void;
    searchQuery: string;
    forceOpen: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const isSelected = selectedPaths.has(node.path);

    // Auto-expand when search matches children
    useEffect(() => {
        if (forceOpen) {
            setIsOpen(true);
        }
    }, [forceOpen]);

    const handleToggle = (checked: boolean) => {
        onToggle(node, checked);
    };

    // Highlight matching text
    const highlightMatch = (text: string) => {
        if (!searchQuery) return text;
        const index = text.toLowerCase().indexOf(searchQuery.toLowerCase());
        if (index === -1) return text;
        return (
            <>
                {text.slice(0, index)}
                <span className="bg-yellow-200 rounded px-0.5">{text.slice(index, index + searchQuery.length)}</span>
                {text.slice(index + searchQuery.length)}
            </>
        );
    };

    return (
        <div style={{ paddingLeft: `${level * 12}px` }}>
            <div className="flex items-center gap-2 py-1 hover:bg-gray-100 rounded px-2">
                {node.type === "directory" ? (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-0.5 hover:bg-gray-200 rounded"
                    >
                        {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                    </button>
                ) : (
                    <div className="w-5" /> // Spacer for alignment
                )}

                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleToggle(checked as boolean)}
                    className="h-4 w-4"
                />

                <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => node.type === "directory" && setIsOpen(!isOpen)}>
                    {node.type === "directory" ? (
                        <Folder className="h-4 w-4 text-blue-500" />
                    ) : (
                        <File className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm truncate">{highlightMatch(node.name)}</span>
                </div>
            </div>

            {isOpen && node.children && (
                <div>
                    {sortNodes(node.children).map((child) => (
                        <FileTreeNode
                            key={child.path}
                            node={child}
                            level={level + 1}
                            selectedPaths={selectedPaths}
                            onToggle={onToggle}
                            searchQuery={searchQuery}
                            forceOpen={forceOpen}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Export function to calculate file counts based on filters
export const calculateFileCounts = (
    allNodes: FileNode[],
    filters: ParseFilters,
    isPathActive: (node: FileNode, directories: string[], files: string[], extensions: string[]) => boolean
): { totalFiles: number; filesToParse: number } => {
    const totalFiles = allNodes.filter(node => node.type === "file").length;
    let filesToParse = 0;

    allNodes.forEach(node => {
        if (node.type !== "file") return;

        const isExcluded = isPathActive(
            node,
            filters.excluded_directories,
            filters.excluded_files,
            filters.excluded_extensions
        );

        if (!isExcluded) {
            filesToParse++;
        }
    });

    return { totalFiles, filesToParse };
};

const FileTree: React.FC<FileTreeProps> = ({
    repoName,
    branchName,
    filters,
    setFilters,
    onFileCountsChange,
}) => {
    const [treeData, setTreeData] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [showPatternMode, setShowPatternMode] = useState(false);
    const [patternQuery, setPatternQuery] = useState("");
    const [debouncedPatternQuery, setDebouncedPatternQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const patternTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debounce search query - wait 300ms after user stops typing
    useEffect(() => {
        if (searchQuery) {
            setIsSearching(true);
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setIsSearching(false);
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    // Debounce pattern query
    useEffect(() => {
        if (patternTimeoutRef.current) {
            clearTimeout(patternTimeoutRef.current);
        }

        patternTimeoutRef.current = setTimeout(() => {
            setDebouncedPatternQuery(patternQuery);
        }, 300);

        return () => {
            if (patternTimeoutRef.current) {
                clearTimeout(patternTimeoutRef.current);
            }
        };
    }, [patternQuery]);

    // Flatten tree for easier lookup
    const allNodes = useMemo(() => {
        const nodes: FileNode[] = [];
        const traverse = (n: FileNode[]) => {
            n.forEach(node => {
                nodes.push(node);
                if (node.children) traverse(node.children);
            });
        };
        traverse(treeData);
        return nodes;
    }, [treeData]);

    // Helper to check if a file matches an extension filter
    const matchesExtension = (fileName: string, extensions: string[]) => {
        return extensions.some(ext => {
            // Normalize extension to start with dot
            const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
            return fileName.endsWith(normalizedExt);
        });
    };

    // Helper to match glob patterns (supports * and **)
    const matchesGlobPattern = (filePath: string, pattern: string): boolean => {
        try {
            // dot: true allows matching files/folders that start with .
            // matchBase: false means patterns are matched from the start of the path
            return minimatch(filePath, pattern, {
                dot: true,
                matchBase: false,
                nocomment: true,
            });
        } catch (error) {
            // If minimatch fails, fall back to exact match
            console.warn('Glob pattern matching failed:', error);
            return filePath === pattern;
        }
    };

    // Helper to check if path is excluded/included by filters
    const isPathActive = useCallback((node: FileNode, directories: string[], files: string[], extensions: string[]) => {
        // Check if path matches any file pattern (supports globs)
        // Only match against full path for proper root-relative behavior
        const matchesFilePattern = files.some(pattern =>
            matchesGlobPattern(node.path, pattern)
        );
        if (matchesFilePattern) return true;

        // Check if path or any parent is in directories list
        const inDirectory = directories.some(dir =>
            dir && (node.path === dir || node.path.startsWith(dir + "/"))
        );
        if (inDirectory) return true;

        // Check if file matches any excluded extension
        if (node.type === "file" && extensions.length > 0) {
            if (matchesExtension(node.name, extensions)) return true;
        }

        return false;
    }, []);

    // Calculate selected paths based on filters
    const selectedPaths = useMemo(() => {
        const selected = new Set<string>();

        allNodes.forEach(node => {
            const isMatch = isPathActive(
                node,
                filters.excluded_directories,
                filters.excluded_files,
                filters.excluded_extensions
            );

            // Exclude Mode: Selected (checked) if it DOES NOT match a filter (is NOT excluded)
            if (!isMatch) selected.add(node.path);
        });

        return selected;
    }, [allNodes, filters, isPathActive]);

    // Calculate and emit file counts whenever they change
    useEffect(() => {
        if (!onFileCountsChange) return;

        const totalFiles = allNodes.filter(node => node.type === "file").length;
        let filesToParse = 0;

        allNodes.forEach(node => {
            if (node.type !== "file") return;
            const isExcluded = isPathActive(
                node,
                filters.excluded_directories,
                filters.excluded_files,
                filters.excluded_extensions
            );
            if (!isExcluded) filesToParse++;
        });

        onFileCountsChange({ totalFiles, filesToParse });
    }, [allNodes, filters, onFileCountsChange, isPathActive]);

    // Maximum results to show (prevents UI from freezing on huge repos)
    const MAX_SEARCH_RESULTS = 200;

    // Get files matching the current pattern query (for preview)
    const patternMatches = useMemo(() => {
        if (!debouncedPatternQuery.trim()) return [];

        const results: FileNode[] = [];
        const trimmedPattern = debouncedPatternQuery.trim();

        // Early exit once we have enough results
        for (const node of allNodes) {
            if (results.length >= MAX_SEARCH_RESULTS) break;

            // Only match against full path for consistent root-relative behavior
            if (matchesGlobPattern(node.path, trimmedPattern)) {
                results.push(node);
            }
        }

        return sortNodes(results);
    }, [allNodes, debouncedPatternQuery]);

    // Handle adding pattern as exclusion
    const handleExcludePattern = () => {
        if (!patternQuery.trim() || patternMatches.length === 0) return;

        const newFilters = { ...filters };
        if (!newFilters.excluded_files.includes(patternQuery.trim())) {
            newFilters.excluded_files = [...newFilters.excluded_files, patternQuery.trim()];
        }
        setFilters(newFilters);
        setPatternQuery("");
    };

    // Transform tree data to ensure all nodes have paths
    const addPathsToTree = useCallback((nodes: FileNode[], parentPath: string = ""): FileNode[] => {
        const recursiveAdd = (nodes: FileNode[], parentPath: string = ""): FileNode[] => {
            return nodes.map(node => {
                const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name;
                return {
                    name: node.name,
                    path: node.path || nodePath, // Use existing path or build from parent
                    type: node.type,
                    children: node.children ? recursiveAdd(node.children, nodePath) : undefined
                };
            });
        };
        return recursiveAdd(nodes, parentPath);
    }, []);

    const filterEmptyDirectories = useCallback((nodes: FileNode[]): FileNode[] => {
        const recursiveFilter = (nodes: FileNode[]): FileNode[] => {
            const filteredNodes: FileNode[] = [];

            for (const node of nodes) {
                if (node.type === "file") {
                    filteredNodes.push(node);
                } else if (node.type === "directory") {
                    const children = node.children || [];
                    const filteredChildren = recursiveFilter(children);

                    if (filteredChildren.length > 0) {
                        filteredNodes.push({ ...node, children: filteredChildren });
                    }
                }
            }
            return filteredNodes;
        };
        return recursiveFilter(nodes);
    }, []);

    useEffect(() => {
        const fetchTree = async () => {
            if (!repoName || !branchName) return;

            setLoading(true);
            setError(null);
            try {
                const data = await BranchAndRepositoryService.getRepoStructure(
                    repoName,
                    branchName
                );
                const dataWithPaths = addPathsToTree(data);
                const filteredData = filterEmptyDirectories(dataWithPaths);
                setTreeData(filteredData);
            } catch (err) {
                setError("Failed to load file tree");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTree();
    }, [repoName, branchName, addPathsToTree, filterEmptyDirectories]);

    const handleToggle = (node: FileNode, checked: boolean) => {
        const newFilters = { ...filters };

        // Exclude Mode:
        // Checked = Include (Remove from exclude list)
        // Unchecked = Exclude (Add to exclude list)

        const addToFilter = !checked;

        if (addToFilter) {
            // Add to exclude filter list
            if (node.type === "directory") {
                // First, remove any descendants (they'll be covered by parent)
                newFilters.excluded_directories = newFilters.excluded_directories.filter(
                    p => !p.startsWith(node.path + "/")
                );
                newFilters.excluded_files = newFilters.excluded_files.filter(
                    p => !p.startsWith(node.path + "/")
                );
                // Then add this directory if not already present
                if (node.path && !newFilters.excluded_directories.includes(node.path)) {
                    newFilters.excluded_directories = [...newFilters.excluded_directories, node.path];
                }
            } else {
                // Add file if not already present
                if (node.path && !newFilters.excluded_files.includes(node.path)) {
                    newFilters.excluded_files = [...newFilters.excluded_files, node.path];
                }
            }
        } else {
            // Remove from exclude filter list
            if (node.type === "directory") {
                // Remove this directory and any of its descendants
                newFilters.excluded_directories = newFilters.excluded_directories.filter(
                    p => p !== node.path && !p.startsWith(node.path + "/")
                );
                newFilters.excluded_files = newFilters.excluded_files.filter(
                    p => !p.startsWith(node.path + "/")
                );
            } else {
                // Remove this specific file
                newFilters.excluded_files = newFilters.excluded_files.filter(
                    p => p !== node.path
                );
            }
        }

        setFilters(newFilters);
    };

    // Filter tree based on search query (for tree view - keeps structure)
    const filterTreeBySearch = (nodes: FileNode[], query: string): FileNode[] => {
        if (!query) return nodes;

        const lowerQuery = query.toLowerCase();
        const result: FileNode[] = [];

        for (const node of nodes) {
            const nameMatches = node.name.toLowerCase().includes(lowerQuery);
            const pathMatches = node.path.toLowerCase().includes(lowerQuery);

            if (node.type === "file") {
                if (nameMatches || pathMatches) {
                    result.push(node);
                }
            } else {
                // For directories, include if name matches or if any children match
                const filteredChildren = node.children
                    ? filterTreeBySearch(node.children, query)
                    : [];

                if (nameMatches || pathMatches || filteredChildren.length > 0) {
                    result.push({
                        ...node,
                        children: filteredChildren.length > 0 ? filteredChildren : node.children
                    });
                }
            }
        }

        return result;
    };

    // Flatten matching nodes for search results (VS Code style)
    // Optimized: uses debounced query and limits results
    const getSearchResults = useMemo(() => {
        if (!debouncedSearchQuery) return [];

        const lowerQuery = debouncedSearchQuery.toLowerCase();

        // Prioritize name matches over path matches
        const nameMatches: FileNode[] = [];
        const pathOnlyMatches: FileNode[] = [];

        for (const node of allNodes) {
            // Early exit if we have enough results
            if (nameMatches.length + pathOnlyMatches.length >= MAX_SEARCH_RESULTS) break;

            const lowerName = node.name.toLowerCase();
            const lowerPath = node.path.toLowerCase();

            if (lowerName.includes(lowerQuery)) {
                nameMatches.push(node);
            } else if (lowerPath.includes(lowerQuery)) {
                pathOnlyMatches.push(node);
            }
        }

        // Combine results: name matches first, then path-only matches
        const combined = [...nameMatches, ...pathOnlyMatches].slice(0, MAX_SEARCH_RESULTS);

        // Sort: directories first, then alphabetically
        return sortNodes(combined);
    }, [allNodes, debouncedSearchQuery]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 p-4 text-sm">{error}</div>;
    }

    if (!treeData.length) {
        return <div className="text-gray-500 p-4 text-sm">No files found.</div>;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search Box with Pattern Toggle */}
            <div className="p-2 border-b sticky top-0 bg-white z-10 space-y-2">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search files and folders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 pr-8 text-sm"
                            disabled={showPatternMode}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
                            >
                                <X className="h-3.5 w-3.5 text-gray-400" />
                            </button>
                        )}
                    </div>
                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={showPatternMode ? "secondary" : "ghost"}
                                    size="sm"
                                    className="h-8 w-8 p-0 shrink-0"
                                    onClick={() => {
                                        setShowPatternMode(!showPatternMode);
                                        if (showPatternMode) {
                                            setPatternQuery("");
                                        } else {
                                            setSearchQuery("");
                                        }
                                    }}
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p className="text-xs">{showPatternMode ? "Close pattern mode" : "Exclude by pattern"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Pattern Input - Only visible when pattern mode is active */}
                {showPatternMode && (
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <Regex className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="e.g. *.test.js, **/node_modules/**"
                                value={patternQuery}
                                onChange={(e) => setPatternQuery(e.target.value)}
                                className="h-8 pl-8 pr-8 text-sm"
                                autoFocus
                            />
                            {patternQuery && (
                                <button
                                    onClick={() => setPatternQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
                                >
                                    <X className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                            )}
                        </div>
                        <Button
                            size="sm"
                            className="h-8 text-xs shrink-0"
                            onClick={handleExcludePattern}
                            disabled={!patternQuery.trim() || patternMatches.length === 0}
                        >
                            Exclude Pattern
                        </Button>
                    </div>
                )}
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto p-1">
                {showPatternMode && patternQuery ? (
                    // Pattern preview mode - no checkboxes
                    debouncedPatternQuery !== patternQuery ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                    ) : patternMatches.length === 0 ? (
                        <div className="text-gray-500 p-4 text-sm text-center">
                            No files matching pattern &quot;{patternQuery}&quot;
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            <div className="text-xs text-orange-500 px-2 py-1 font-medium">
                                {patternMatches.length >= MAX_SEARCH_RESULTS
                                    ? `${MAX_SEARCH_RESULTS}+ files will be excluded (showing first ${MAX_SEARCH_RESULTS})`
                                    : `${patternMatches.length} file${patternMatches.length !== 1 ? 's' : ''} will be excluded`
                                }
                            </div>
                            {patternMatches.map((node) => (
                                <PatternPreviewItem
                                    key={node.path}
                                    node={node}
                                />
                            ))}
                        </div>
                    )
                ) : searchQuery ? (
                    // VS Code style flat search results
                    isSearching ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                    ) : getSearchResults.length === 0 ? (
                        <div className="text-gray-500 p-4 text-sm text-center">
                            No files matching &quot;{searchQuery}&quot;
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            <div className="text-xs text-gray-400 px-2 py-1">
                                {getSearchResults.length >= MAX_SEARCH_RESULTS
                                    ? `${MAX_SEARCH_RESULTS}+ results (showing first ${MAX_SEARCH_RESULTS})`
                                    : `${getSearchResults.length} result${getSearchResults.length !== 1 ? 's' : ''}`
                                }
                            </div>
                            {getSearchResults.map((node) => (
                                <SearchResultItem
                                    key={node.path}
                                    node={node}
                                    isSelected={selectedPaths.has(node.path)}
                                    onToggle={handleToggle}
                                    searchQuery={debouncedSearchQuery}
                                />
                            ))}
                        </div>
                    )
                ) : (
                    // Normal tree view
                    sortNodes(treeData).map((node) => (
                        <FileTreeNode
                            key={node.path}
                            node={node}
                            level={0}
                            selectedPaths={selectedPaths}
                            onToggle={handleToggle}
                            searchQuery={searchQuery}
                            forceOpen={false}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default FileTree;
