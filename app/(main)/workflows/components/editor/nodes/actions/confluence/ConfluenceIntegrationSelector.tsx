import React, { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import IntegrationService, { ConnectedIntegration } from '@/services/IntegrationService';
import { useRouter } from 'next/navigation';

interface ConfluenceIntegrationSelectorProps {
    selectedIntegrationId: string | null;
    onIntegrationChange: (integrationId: string, cloudId: string) => void;
}

export function ConfluenceIntegrationSelector({
    selectedIntegrationId,
    onIntegrationChange,
}: ConfluenceIntegrationSelectorProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadIntegrations();
    }, []);

    const loadIntegrations = async () => {
        try {
            setLoading(true);
            setError(null);

            const allIntegrations = await IntegrationService.getConnectedIntegrations();

            // Filter for Confluence integrations only
            const confluenceIntegrations = allIntegrations.filter(
                (integration) => integration.type === 'confluence'
            );

            setIntegrations(confluenceIntegrations);

            // Auto-select if only one integration
            if (confluenceIntegrations.length === 1 && !selectedIntegrationId) {
                const integration = confluenceIntegrations[0];
                onIntegrationChange(
                    integration.id,
                    integration.uniqueIdentifier || ''
                );
            }
        } catch (err) {
            console.error('Failed to load Confluence integrations:', err);
            setError('Failed to load Confluence integrations');
        } finally {
            setLoading(false);
        }
    };

    const selectedIntegration = integrations.find(
        (integration) => integration.id === selectedIntegrationId
    );

    const handleSetupIntegration = () => {
        router.push('/integrations');
    };

    if (error) {
        return (
            <div className="space-y-2">
                <label className="text-sm font-medium">Confluence Workspace</label>
                <div className="flex items-center gap-2 p-3 border rounded-md bg-destructive/10">
                    <span className="text-sm text-destructive">{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Confluence Workspace</label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    {loading ? (
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            disabled
                        >
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Loading workspaces...</span>
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                        >
                            {selectedIntegration ? (
                                <div className="flex flex-col items-start">
                                    <span className="font-medium">{selectedIntegration.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedIntegration.uniqueIdentifier}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-muted-foreground">Select workspace...</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    )}
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search workspaces..." />
                        <CommandList>
                            <CommandEmpty>
                                {integrations.length === 0 ? (
                                    <div className="p-4 text-center">
                                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-600 mb-3">
                                            No Confluence integrations found
                                        </p>
                                        <Button
                                            size="sm"
                                            onClick={handleSetupIntegration}
                                            className="gap-2"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Set up Confluence Integration
                                        </Button>
                                    </div>
                                ) : (
                                    "No workspace found."
                                )}
                            </CommandEmpty>
                            <CommandGroup>
                                {integrations.map((integration) => (
                                    <CommandItem
                                        key={integration.id}
                                        value={`${integration.name} ${integration.uniqueIdentifier}`}
                                        onSelect={() => {
                                            onIntegrationChange(
                                                integration.id,
                                                integration.uniqueIdentifier || ''
                                            );
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                selectedIntegrationId === integration.id
                                                    ? 'opacity-100'
                                                    : 'opacity-0'
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{integration.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {integration.uniqueIdentifier}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
