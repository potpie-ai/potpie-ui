import React, { useState, useEffect, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, File, Loader2, Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";

// Duplicate interface to avoid circular dependency
export interface ParseFilters {
    excluded_directories: string[];
    excluded_files: string[];
    excluded_extensions: string[];
    include_mode: boolean;
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
}

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
                    {node.children.map((child) => (
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

const FileTree: React.FC<FileTreeProps> = ({
    repoName,
    branchName,
    filters,
    setFilters,
}) => {
    const [treeData, setTreeData] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

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

    // Helper to check if path is excluded/included by filters
    const isPathActive = (node: FileNode, directories: string[], files: string[], extensions: string[]) => {
        // Check if path is explicitly in files list
        if (files.includes(node.path)) return true;

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
    };

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

            if (filters.include_mode) {
                // Include Mode: Selected if it MATCHES a filter (is in the list)
                if (isMatch) selected.add(node.path);
            } else {
                // Exclude Mode: Selected if it DOES NOT match a filter (is NOT in the list)
                if (!isMatch) selected.add(node.path);
            }
        });

        return selected;
    }, [allNodes, filters]);

    // Transform tree data to ensure all nodes have paths
    const addPathsToTree = (nodes: any[], parentPath: string = ""): FileNode[] => {
        return nodes.map(node => {
            const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name;
            return {
                name: node.name,
                path: node.path || nodePath, // Use existing path or build from parent
                type: node.type,
                children: node.children ? addPathsToTree(node.children, nodePath) : undefined
            };
        });
    };

    const filterEmptyDirectories = (nodes: FileNode[]): FileNode[] => {
        const filteredNodes: FileNode[] = [];

        for (const node of nodes) {
            if (node.type === "file") {
                filteredNodes.push(node);
            } else if (node.type === "directory") {
                const children = node.children || [];
                const filteredChildren = filterEmptyDirectories(children);

                if (filteredChildren.length > 0) {
                    filteredNodes.push({ ...node, children: filteredChildren });
                }
            }
        }
        return filteredNodes;
    };

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
    }, [repoName, branchName]);

    const handleToggle = (node: FileNode, checked: boolean) => {
        const newFilters = { ...filters };

        // In Exclude Mode (default):
        // Checked = Include (Remove from exclude list)
        // Unchecked = Exclude (Add to exclude list)

        // In Include Mode:
        // Checked = Include (Add to include list)
        // Unchecked = Exclude (Remove from include list)

        const addToFilter = filters.include_mode ? checked : !checked;

        if (addToFilter) {
            // Add to filter list
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
            // Remove from filter list
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

    // Filter tree based on search query
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

    const filteredTreeData = useMemo(() => {
        return filterTreeBySearch(treeData, searchQuery);
    }, [treeData, searchQuery]);

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
            {/* Search Box */}
            <div className="p-2 border-b sticky top-0 bg-white z-10">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-8 text-sm"
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
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto p-1">
                {filteredTreeData.length === 0 ? (
                    <div className="text-gray-500 p-4 text-sm text-center">
                        No files matching "{searchQuery}"
                    </div>
                ) : (
                    filteredTreeData.map((node) => (
                        <FileTreeNode
                            key={node.path}
                            node={node}
                            level={0}
                            selectedPaths={selectedPaths}
                            onToggle={handleToggle}
                            searchQuery={searchQuery}
                            forceOpen={!!searchQuery}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default FileTree;
