import React, { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
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
import axios from 'axios';
import getHeaders from '@/app/utils/headers.util';

interface ConfluenceSpace {
    id: string;
    key: string;
    name: string;
    type: string;
}

interface ConfluenceSpaceSelectorProps {
    integrationId: string | null;
    selectedSpaceKey: string | null;
    onSpaceChange: (spaceKey: string, spaceName: string) => void;
}

export function ConfluenceSpaceSelector({
    integrationId,
    selectedSpaceKey,
    onSpaceChange,
}: ConfluenceSpaceSelectorProps) {
    const [open, setOpen] = useState(false);
    const [spaces, setSpaces] = useState<ConfluenceSpace[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (integrationId) {
            loadSpaces();
        } else {
            setSpaces([]);
            setError(null);
        }
    }, [integrationId]);

    const loadSpaces = async () => {
        if (!integrationId) return;

        try {
            setLoading(true);
            setError(null);

            const headers = await getHeaders();
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

            const response = await axios.get(
                `${baseUrl}/api/v1/integrations/confluence/${integrationId}/spaces`,
                { headers }
            );

            if (response.data.status === 'success') {
                const spacesData = response.data.spaces?.spaces || [];
                setSpaces(spacesData);

                // Auto-select if only one space
                if (spacesData.length === 1 && !selectedSpaceKey) {
                    const space = spacesData[0];
                    onSpaceChange(space.key, space.name);
                }
            } else {
                setError('Failed to load spaces');
            }
        } catch (err: any) {
            console.error('Failed to load Confluence spaces:', err);
            setError(err.response?.data?.detail || 'Failed to load spaces');
        } finally {
            setLoading(false);
        }
    };

    const selectedSpace = spaces.find((space) => space.key === selectedSpaceKey);

    if (!integrationId) {
        return (
            <div className="space-y-2">
                <label className="text-sm font-medium">Confluence Space</label>
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <span className="text-sm text-muted-foreground">
                        Please select a workspace first
                    </span>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-2">
                <label className="text-sm font-medium">Confluence Space</label>
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                        Loading spaces...
                    </span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-2">
                <label className="text-sm font-medium">Confluence Space</label>
                <div className="flex items-center gap-2 p-3 border rounded-md bg-destructive/10">
                    <span className="text-sm text-destructive">{error}</span>
                </div>
            </div>
        );
    }

    if (spaces.length === 0) {
        return (
            <div className="space-y-2">
                <label className="text-sm font-medium">Confluence Space</label>
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <span className="text-sm text-muted-foreground">
                        No spaces found in this workspace
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Confluence Space</label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {selectedSpace ? (
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{selectedSpace.name}</span>
                                <span className="text-xs text-muted-foreground">
                                    {selectedSpace.key}
                                </span>
                            </div>
                        ) : (
                            <span className="text-muted-foreground">Select space...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search spaces..." />
                        <CommandList>
                            <CommandEmpty>No space found.</CommandEmpty>
                            <CommandGroup>
                                {spaces.map((space) => (
                                    <CommandItem
                                        key={space.id}
                                        value={`${space.name} ${space.key}`}
                                        onSelect={() => {
                                            onSpaceChange(space.key, space.name);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                selectedSpaceKey === space.key
                                                    ? 'opacity-100'
                                                    : 'opacity-0'
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{space.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                Key: {space.key}
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
