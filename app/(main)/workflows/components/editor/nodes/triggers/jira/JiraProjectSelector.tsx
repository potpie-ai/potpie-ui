import { useEffect, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Info, RefreshCw } from "lucide-react";
import IntegrationService from "@/services/IntegrationService";

interface JiraProject {
    id: string;
    key: string;
    name: string;
    projectTypeKey?: string;
    simplified?: boolean;
    style?: string;
    isPrivate?: boolean;
}

interface JiraProjectSelectorProps {
    integrationId: string;
    selectedProjectKey: string;
    onProjectChange: (projectKey: string) => void;
    readOnly?: boolean;
}

export const JiraProjectSelector = ({
    integrationId,
    selectedProjectKey,
    onProjectChange,
    readOnly = false,
}: JiraProjectSelectorProps) => {
    const [projects, setProjects] = useState<JiraProject[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchProjects = async () => {
            if (!integrationId) {
                setProjects([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const response = await IntegrationService.getJiraProjects(
                    integrationId,
                    0,
                    100 // Fetch up to 100 projects
                );

                // The response has projects in response.data.projects.values
                const projectList = response?.projects?.values || [];
                setProjects(projectList);
            } catch (err) {
                console.error("Error fetching Jira projects:", err);
                setError(err instanceof Error ? err.message : "Failed to fetch projects");
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [integrationId, refreshKey]);

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const selectedProject = projects.find((p) => p.key === selectedProjectKey);

    if (!integrationId) {
        return (
            <div className="p-3 border border-blue-200 bg-blue-50 rounded-md flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">
                    Please select a Jira integration first
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-2 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                <span className="text-sm text-gray-500">Loading projects...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-2">
                <div className="p-3 border border-red-200 bg-red-50 rounded-md flex items-start gap-2">
                    <Info className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-red-800">
                            Failed to load projects: {error}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="p-1 hover:bg-red-100 rounded"
                        title="Retry"
                    >
                        <RefreshCw className="h-4 w-4 text-red-600" />
                    </button>
                </div>
            </div>
        );
    }

    const handleProjectChange = (value: string) => {
        // Convert the special "__none__" value to empty string
        const projectKey = value === "__none__" ? "" : value;
        onProjectChange(projectKey);
    };

    // Convert empty string to "__none__" for the Select component
    const selectValue = selectedProjectKey || "__none__";

    return (
        <div className="space-y-2">
            <Select
                value={selectValue}
                onValueChange={handleProjectChange}
                disabled={readOnly || projects.length === 0}
            >
                <SelectTrigger className="w-full">
                    <SelectValue
                        placeholder={
                            projects.length === 0
                                ? "No projects found"
                                : "Select a project (optional)"
                        }
                    >
                        {selectedProjectKey && selectedProject
                            ? `${selectedProject.key} - ${selectedProject.name}`
                            : "All projects"}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {/* Empty option for "All projects" */}
                    <SelectItem value="__none__">
                        <span className="text-gray-500 italic">All projects</span>
                    </SelectItem>
                    {projects.map((project) => (
                        <SelectItem key={project.id} value={project.key}>
                            <div className="flex flex-col">
                                <span className="font-medium">{project.key}</span>
                                <span className="text-xs text-gray-500">
                                    {project.name}
                                </span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {projects.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        {projects.length} project{projects.length !== 1 ? "s" : ""}{" "}
                        found
                    </p>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        disabled={loading}
                    >
                        <RefreshCw className="h-3 w-3" />
                        Refresh
                    </button>
                </div>
            )}
        </div>
    );
};
