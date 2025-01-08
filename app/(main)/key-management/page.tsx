"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-select";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Trash } from "lucide-react";
import React, { useEffect } from "react";
import { toast } from "sonner";
import getHeaders from "@/app/utils/headers.util";

interface KeySecrets {
    api_key: string;
    provider: string;
}


//Refactor later when we have multiple providers, currently api return single provider */
const KeyManagement = () => {
    const [inputKeyValue, setInputKeyValue] = React.useState("");
    const [savedKeysResponse, setSavedKeysResponse] = React.useState<any>([]);
    const [keyType, setKeyType] = React.useState("momentumKey");
    const [createNewKeyDialogOpen, setCreateNewKeyDialogOpen] = React.useState(false);
    const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = React.useState(false);

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

    const { mutate: saveSecret, isPending: isSaving } = useMutation({
        mutationFn: async (data: any) => {
            const headers = await getHeaders();
            return axios.post(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/secrets`,
                data,
                { headers }
            );
        },
        onSuccess: () => {
            toast.success("Key Saved successfully", {});
            setCreateNewKeyDialogOpen(false);
            setKeyType("userKey")
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
            setSavedKeysResponse([])
            setKeyType("momentumKey")
        },
        onError: () => {
            toast.error("Something went wrong");
        },
    });

    useEffect(() => {
        if (!KeySecrets || isLoading) return;
        {
            setSavedKeysResponse(KeySecrets);
            if (KeySecrets.api_key != null) {
                setKeyType("userKey")
            }
        }
    }, [KeySecrets, isLoading]);

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
                                    We dont keep unused keys. If you switch to Momentums key, we will delete your saved OpenAI key, requiring you to re-register it next time. Are you sure you want to proceed?                </p>
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
            <h2 className="text-2xl font-semibold mb-4 text-start text-primary mt-4">Manage Your Keys</h2>
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
                            <p className="text-xs text-start text-black mt-1">Note: We only integrate with Open AI’s GPT-4o and GPT-3.5-Turbo. Support for integrating other LLMs will be available soon.</p>
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
                {(savedKeysResponse.length != 0) && (
                    <Table className="">
                        <TableHeader>
                            <TableRow className="border-bottom border-border">
                                <TableHead className="w-[200px] text-black">Provider</TableHead>
                                <TableHead className="w-[200px] text-black text-right">Key Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow key={savedKeysResponse.api_key}>
                                <TableCell>Open AI</TableCell>
                                <TableCell className="text-right">{savedKeysResponse.api_key}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        className="delete"
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

        </div >
    );
};

export default KeyManagement;