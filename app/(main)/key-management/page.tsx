"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosResponse } from "axios";
import { Eye, EyeOff, Trash } from "lucide-react";
import React, { useEffect } from "react";
import { toast } from "sonner";
import getHeaders from "@/app/utils/headers.util";

interface KeySecrets {
    api_key: string;
    provider: string;
}

interface ApiKeyState extends KeySecrets {
    isVisible: boolean;
}

const KeyManagement = () => {
    const [inputKeyValue, setInputKeyValue] = React.useState("");
    const [keyType, setKeyType] = React.useState("momentumKey");
    const [createNewKeyDialogOpen, setCreateNewKeyDialogOpen] = React.useState(false);
    const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = React.useState(false);
    const [generateKeyDialogOpen, setGenerateKeyDialogOpen] = React.useState(false);
    const [selectedProvider, setSelectedProvider] = React.useState("openai");
    const queryClient = useQueryClient();

    const {
        data: KeySecrets,
        isLoading,
    } = useQuery<KeySecrets>({
        queryKey: ["secrets"],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await axios.get<KeySecrets>(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/secrets/openai`,
                { headers }
            );
            return response.data;
        }
    });

    React.useEffect(() => {
        if (KeySecrets?.api_key) {
            setKeyType("userKey");
        } else {
            setKeyType("momentumKey");
        }
    }, [KeySecrets]);

    const { mutate: saveSecret, isPending: isSaving } = useMutation({
        mutationFn: async (data: any) => {
            const headers = await getHeaders();
            return axios.post(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/secrets`,
                data,
                { headers }
            );
        },
        onSuccess: (response) => {
            toast.success("Key Saved successfully", {});
            setCreateNewKeyDialogOpen(false);
            setKeyType("userKey");
            queryClient.setQueryData(["secrets"], response.data);
            queryClient.invalidateQueries({ queryKey: ["secrets"] });
            setInputKeyValue("");
        },
        onError: () => {
            toast.error("Something went wrong");
        },
    });

    const { mutate: deleteSecret, isPending: isDeleting } = useMutation({
        mutationFn: async () => {
            const headers = await getHeaders();
            return axios.delete(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/secrets/openai`,
                { headers }
            );
        },
        onSuccess: () => {
            toast.success("Key Deleted successfully", {});
            setDeleteKeyDialogOpen(false);
            setKeyType("momentumKey");
            queryClient.invalidateQueries({ queryKey: ["secrets"] });
            queryClient.setQueryData(["secrets"], null);
        },
        onError: () => {
            toast.error("Something went wrong");
        },
    });

    // New API Key Management Section
    const {
        data: apiKey,
        isLoading: isLoadingKey,
        refetch: refetchKey
    } = useQuery<ApiKeyState>({
        queryKey: ["api-key"],
        queryFn: async () => {
            const headers = await getHeaders();
            const response = await axios.get<KeySecrets>(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/api-keys`,
                { headers }
            );
            return {
                ...response.data,
                isVisible: false
            };
        }
    });

    const { mutate: generateApiKey, isPending: isGenerating } = useMutation({
        mutationFn: async () => {
            const headers = await getHeaders();
            return axios.post(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/api-keys`,
                {},
                { headers }
            );
        },
        onSuccess: () => {
            toast.success("API Key generated successfully");
            refetchKey();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to generate API key");
        },
    });

    const { mutate: revokeApiKey, isPending: isRevoking } = useMutation({
        mutationFn: async () => {
            const headers = await getHeaders();
            return axios.delete(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/api-keys`,
                { headers }
            );
        },
        onSuccess: () => {
            toast.success("API Key revoked successfully");
            queryClient.setQueryData(["api-key"], null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to revoke API key");
        },
    });

    const toggleKeyVisibility = () => {
        if (!apiKey) return;
        queryClient.setQueryData(["api-key"], (oldData: ApiKeyState | undefined) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                isVisible: !oldData.isVisible
            };
        });
    };

    const maskKey = (key: string) => {
        if (!key) return "";
        const visibleStart = key.slice(0, 4);
        const visibleEnd = key.slice(-4);
        return `${visibleStart}${"•".repeat(32)}${visibleEnd}`;
    };

    return (
        <div className="ml-8 mt-4 flex flex-col text-start h-full">
            <div className="flex flex-col pb-8">
                <h2 className="text-2xl font-semibold mb-4 text-start text-primary mt-4">Set the Key</h2>
                <h2 className="text-base text-start text-black pb-4">Select the key you want to use for generating tests</h2>
                <RadioGroup>
                    <div className="flex items-center">
                        <RadioGroupItem value="momentumKey" className="text-black" checked={keyType == "momentumKey"} onClick={() => setDeleteKeyDialogOpen(true)}></RadioGroupItem>
                        <Label className="pl-2">I want to use Momentums key</Label>
                    </div>
                    <div className="flex items-center">
                        <RadioGroupItem value="userKey" className="text-black" checked={keyType == "userKey"} onClick={() => setCreateNewKeyDialogOpen(true)}></RadioGroupItem>
                        <Label className="pl-2">I want to use my key</Label>
                    </div>
                </RadioGroup>
                <Dialog open={deleteKeyDialogOpen} onOpenChange={setDeleteKeyDialogOpen}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg text-start text-primary">Are you sure you want to switch?</DialogTitle>
                            <DialogDescription>
                                <p className="text-base text-start text-black mt-2">
                                    We don&apos;t keep unused keys. If you switch to Potpie&apos;s key, we will delete your saved OpenAI key, requiring you to re-register it next time. Are you sure you want to proceed?
                                </p>
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button onClick={() => deleteSecret()}>Delete</Button>
                            <Button variant="outline" onClick={() => setDeleteKeyDialogOpen(false)}>Cancel</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {keyType === 'userKey' && (
                    <div className="flex mt-2">
                        <Select defaultValue="Open AI">
                            <SelectTrigger className="w-[280px] rounded-sm">
                                <SelectValue placeholder="Select a model" defaultValue="Open AI" />
                            </SelectTrigger>
                            <SelectContent className="bg-muted">
                                <SelectItem className="pl-8" key={"Open AI"} value={"Open AI"}>
                                    Open AI
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <Separator className="pr-20 mt-4"></Separator>
            <h2 className="text-2xl font-semibold mb-4 text-start text-primary mt-4">Manage Your LLM Keys</h2>
            <div className="flex">
                <h3 className="text-lg text-start text-primary">Saved Keys</h3>
                <Button onClick={() => setCreateNewKeyDialogOpen(true)} className="text-right w-40 ml-auto pr-6">+ Register Key</Button>
            </div>
            <Dialog open={createNewKeyDialogOpen} onOpenChange={setCreateNewKeyDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg text-start text-primary">Register new key</DialogTitle>
                        <DialogDescription>
                            <p className="text-base text-start text-black mt-2">Select the LLM you want to use</p>
                            <p className="text-xs text-start text-black mt-1">Note: We only integrate with Open AI&apos;s GPT-4o and GPT-4o-mini. Support for integrating other LLMs will be available soon.</p>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col">
                        <div className="flex mt-2">
                            <Select>
                                <SelectTrigger className="w-xl rounded-sm">
                                    <SelectValue placeholder="Select a model" defaultValue="Open AI"/>
                                </SelectTrigger>
                                <SelectContent className="bg-background">
                                    <SelectGroup>
                                        <SelectItem value="master">Open AI</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col mt-2">
                            <h2 className="text-base text-start text-black">Enter your key</h2>
                            <Input type="password" 
                            className="w-xl bg-background mt-2" 
                            value={inputKeyValue}             
                            onChange={(e) => setInputKeyValue(e.target.value)}
                            required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => saveSecret({ provider: "openai", api_key: inputKeyValue })}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="mt-4 pr-10">
                {KeySecrets?.api_key && (
                    <Table className="">
                        <TableHeader>
                            <TableRow className="border-bottom border-border">
                                <TableHead className="w-[200px] text-black">Provider</TableHead>
                                <TableHead className="w-[400px] text-black">Key Value</TableHead>
                                <TableHead className="w-[100px] text-black">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow key={KeySecrets.api_key}>
                                <TableCell>Open AI</TableCell>
                                <TableCell className="font-mono">{maskKey(KeySecrets.api_key)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteSecret()}
                                    >
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                )}
            </div>

            <Separator className="pr-20 mt-8"></Separator>
            <h2 className="text-2xl font-semibold mb-4 text-start text-primary mt-4">API Key Management</h2>
            <div className="flex">
                <h3 className="text-lg text-start text-primary">Your API Key</h3>
                {!isLoadingKey && !apiKey && (
                    <Button 
                        onClick={() => generateApiKey()} 
                        className="text-right w-40 ml-auto pr-6" 
                        disabled={isGenerating}
                    >
                        {isGenerating ? "Generating..." : "Generate API Key"}
                    </Button>
                )}
            </div>

            <div className="mt-4 pr-10">
                {isLoadingKey ? (
                    <div className="text-center py-4 text-gray-500">Loading API key...</div>
                ) : apiKey?.api_key ? (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-bottom border-border">
                                <TableHead className="w-[400px] text-black">API Key</TableHead>
                                <TableHead className="w-[100px] text-black text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-mono">
                                    {apiKey.isVisible ? apiKey.api_key : maskKey(apiKey.api_key)}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={toggleKeyVisibility}
                                        disabled={isRevoking}
                                    >
                                        {apiKey.isVisible ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => revokeApiKey()}
                                        disabled={isRevoking}
                                    >
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-4 text-gray-500">No API key found. Generate one to get started.</div>
                )}
            </div>
        </div>
    );
};

export default KeyManagement;