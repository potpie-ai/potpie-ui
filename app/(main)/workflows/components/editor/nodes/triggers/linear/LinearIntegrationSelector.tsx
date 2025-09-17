import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Loader2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import IntegrationService, {
  ConnectedIntegration,
} from "@/services/IntegrationService";
import { useRouter } from "next/navigation";

interface LinearIntegrationSelectorProps {
  selectedIntegrationId: string;
  onIntegrationChange: (
    integrationId: string,
    uniqueIdentifier?: string
  ) => void;
  readOnly?: boolean;
}

export const LinearIntegrationSelector = ({
  selectedIntegrationId,
  onIntegrationChange,
  readOnly = false,
}: LinearIntegrationSelectorProps) => {
  console.log(
    "LinearIntegrationSelector render with selectedIntegrationId:",
    selectedIntegrationId
  );
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [integrationsLoaded, setIntegrationsLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Memoize the callback to prevent unnecessary re-renders
  const handleIntegrationChange = useCallback(
    (integrationId: string) => {
      if (readOnly) return;
      console.log(
        "LinearIntegrationSelector handleIntegrationChange called with:",
        integrationId
      );
      // Find the integration to get the unique identifier
      const integration = integrations.find((int) => int.id === integrationId);
      const uniqueIdentifier = integration?.uniqueIdentifier;
      console.log("LinearIntegrationSelector found integration:", integration);
      console.log(
        "LinearIntegrationSelector uniqueIdentifier:",
        uniqueIdentifier
      );
      onIntegrationChange(integrationId, uniqueIdentifier);
      setOpen(false);
    },
    [onIntegrationChange, readOnly, integrations]
  );

  // Load integrations when component mounts or when refresh is triggered
  useEffect(() => {
    if ((!integrationsLoaded && integrations.length === 0) || refreshKey > 0) {
      setLoading(true);

      IntegrationService.getConnectedIntegrations()
        .then((allIntegrations) => {
          // Filter for Linear integrations only
          const linearIntegrations = allIntegrations.filter(
            (integration) => integration.type === "linear"
          );
          setIntegrations(linearIntegrations);
          setLoading(false);
          setIntegrationsLoaded(true);
        })
        .catch((error) => {
          console.error("Failed to load Linear integrations:", error);
          setLoading(false);
          setIntegrationsLoaded(true);
        });
    }
  }, [integrationsLoaded, integrations.length, refreshKey]);

  // Load integrations immediately if we have a selectedIntegrationId but no integrations loaded yet
  useEffect(() => {
    if (
      selectedIntegrationId &&
      !integrationsLoaded &&
      integrations.length === 0
    ) {
      setLoading(true);

      IntegrationService.getConnectedIntegrations()
        .then((allIntegrations) => {
          // Filter for Linear integrations only
          const linearIntegrations = allIntegrations.filter(
            (integration) => integration.type === "linear"
          );
          setIntegrations(linearIntegrations);
          setLoading(false);
          setIntegrationsLoaded(true);
        })
        .catch((error) => {
          console.error("Failed to load Linear integrations:", error);
          setLoading(false);
          setIntegrationsLoaded(true);
        });
    }
  }, [selectedIntegrationId, integrationsLoaded, integrations.length]);

  // Helper to clear cache and force refresh
  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIntegrations([]);
    setIntegrationsLoaded(false);
    setRefreshKey((k) => k + 1);
  };

  // Get selected integration details
  const selectedIntegration = integrations.find(
    (integration) => integration.id === selectedIntegrationId
  );

  // If we have a selectedIntegrationId but haven't found the integration in our loaded list,
  // we should still show that an integration is selected
  const hasSelectedIntegration =
    selectedIntegrationId && selectedIntegrationId !== "";

  // Handle integration setup redirect
  const handleSetupIntegration = () => {
    router.push("/integrations/linear");
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={readOnly ? undefined : setOpen}>
        <PopoverTrigger asChild>
          {loading ? (
            <Button
              className="flex gap-3 items-center font-semibold justify-start w-full"
              variant="outline"
              disabled
            >
              <Loader2
                className="h-4 w-4 text-[#7A7A7A] animate-spin"
                strokeWidth={1.5}
              />
              Loading Linear integrations...
            </Button>
          ) : !hasSelectedIntegration ? (
            <Button
              className="flex gap-3 items-center font-semibold justify-start w-full"
              variant="outline"
              style={readOnly ? { pointerEvents: "none" } : {}}
            >
              <MessageSquare
                className="h-4 w-4 text-[#7A7A7A]"
                strokeWidth={1.5}
              />
              Select Linear Integration
            </Button>
          ) : (
            <Button
              className="flex gap-3 items-center font-semibold justify-start w-full"
              variant="outline"
              style={readOnly ? { pointerEvents: "none" } : {}}
            >
              <MessageSquare
                className="h-4 w-4 text-[#7A7A7A]"
                strokeWidth={1.5}
              />
              <span className="truncate text-ellipsis whitespace-nowrap">
                {selectedIntegration?.name ||
                  `Integration ${selectedIntegrationId}`}
              </span>
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <div className="relative">
              <CommandInput
                value={searchValue}
                onValueChange={setSearchValue}
                placeholder="Search integrations..."
                style={readOnly ? { pointerEvents: "none" } : {}}
              />
              <button
                type="button"
                onClick={readOnly ? undefined : handleRefresh}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
                title="Refresh integrations"
                style={readOnly ? { pointerEvents: "none" } : {}}
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <CommandList>
              <CommandEmpty>
                {integrations.length === 0 ? (
                  <div className="p-4 text-center">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-3">
                      No Linear integrations found
                    </p>
                    <Button
                      size="sm"
                      onClick={handleSetupIntegration}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Set up Linear Integration
                    </Button>
                  </div>
                ) : (
                  "No integrations match your search."
                )}
              </CommandEmpty>
              <CommandGroup>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">
                      Loading integrations...
                    </span>
                  </div>
                ) : (
                  integrations
                    ?.filter((integration) =>
                      integration.name
                        .toLowerCase()
                        .includes(searchValue.toLowerCase())
                    )
                    ?.map((integration) => (
                      <CommandItem
                        key={integration.id}
                        value={integration.id}
                        onSelect={
                          readOnly
                            ? undefined
                            : (selectedValue) => {
                                handleIntegrationChange(selectedValue);
                              }
                        }
                        style={readOnly ? { pointerEvents: "none" } : {}}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <MessageSquare className="h-4 w-4 text-[#7A7A7A]" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {integration.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {integration.instanceName}
                            </div>
                          </div>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              integration.status === "active"
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          />
                        </div>
                      </CommandItem>
                    ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
