"use client";

import React, { useEffect } from "react";
import axios from "axios";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-select";
import { Eye, EyeOff, Trash, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import getHeaders from "@/app/utils/headers.util";
import ModelService from "@/services/ModelService";

interface KeySecrets {
  inference_config: {
    api_key: string;
    provider?: string;
  };
}

interface IntegrationKey {
  service: string;
  api_key: string;
}

interface ApiKeyState {
  api_key: string;
  isVisible: boolean;
}

interface ProviderInfo {
  name: string;
  inference_model_id: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const KeyManagement = () => {
  const queryClient = useQueryClient();

  const getKeyPromptMessage = (provider: string) => {
    const openrouterProviders = [
      "deepseek",
      "meta-llama",
      "mistralai",
      "gemini",
    ];
    if (openrouterProviders.includes(provider)) {
      return "Please enter your OpenRouter API key. This provider is accessed through OpenRouter's API.";
    }
    return `Please enter your ${provider.charAt(0).toUpperCase() + provider.slice(1)} API key.`;
  };

  // Global provider state – only provider is selected.
  const [selectedGlobalProvider, setSelectedGlobalProvider] =
    React.useState("");

  // User key (secret) management state
  const [inputKeyValue, setInputKeyValue] = React.useState("");
  const [userSelectedProvider, setUserSelectedProvider] = React.useState("");
  useEffect(() => {
    setUserSelectedProvider(selectedGlobalProvider);
  }, [selectedGlobalProvider]);

  // Radio selection: "momentumKey" = using Potpie's key, "userKey" = using your own key.
  const [keyType, setKeyType] = React.useState("momentumKey");
  const [createNewKeyDialogOpen, setCreateNewKeyDialogOpen] =
    React.useState(false);
  const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = React.useState(false);
  
  // Integrations state
  const [selectedIntegration, setSelectedIntegration] = React.useState("");
  const [integrationKeyValue, setIntegrationKeyValue] = React.useState("");
  const [createIntegrationDialogOpen, setCreateIntegrationDialogOpen] =
    React.useState(false);

  // Query available providers for both global and secret registration
  const { data: availableProviders } = useQuery<ProviderInfo[]>({
    queryKey: ["available-providers"],
    queryFn: async () => {
      const res = await ModelService.listModels();
      return res.models
        .filter((model) => model.is_inference_model)
        .map((model) => {
          return { inference_model_id: model.id, name: model.provider };
        });
    },
  });

  // Query global AI provider settings
  const { data: globalAIProvider } = useQuery<{
    provider: string;
    mode_id: string;
    model_name: string;
  }>({
    queryKey: ["global-provider"],
    queryFn: async () => {
      const headers = await getHeaders();
      const response = await axios.get(
        `${BASE_URL}/api/v1/get-global-ai-provider/`,
        {
          headers,
        }
      );
      return response.data.inference_model;
    },
  });

  useEffect(() => {
    if (globalAIProvider?.provider) {
      setSelectedGlobalProvider(globalAIProvider.provider);
    }
  }, [globalAIProvider]);

  // Query user key secret (using "all" to fetch saved secret)
  const { data: KeySecrets, isLoading: isLoadingSecrets } =
    useQuery<KeySecrets>({
      queryKey: ["secrets"],
      queryFn: async () => {
        const headers = await getHeaders();
        const response = await axios.get<KeySecrets>(
          `${BASE_URL}/api/v1/secrets/all`,
          { headers }
        );
        return response.data;
      },
    });
    
  // Query integration keys
  const { data: integrationKeys, isLoading: isLoadingIntegrationKeys } =
    useQuery<IntegrationKey[]>({
      queryKey: ["integration-keys"],
      queryFn: async () => {
        const headers = await getHeaders();
        const response = await axios.get<IntegrationKey[]>(
          `${BASE_URL}/api/v1/integration-keys`,
          { headers }
        );
        return response.data;
      },
      onError: () => {
        // Silently fail if there are no integration keys
        return [];
      }
    });

  useEffect(() => {
    if (KeySecrets?.inference_config?.api_key) {
      setKeyType("userKey");
    } else {
      setKeyType("momentumKey");
    }
  }, [KeySecrets]);

  // Query API key for LLM operations (unchanged)
  const {
    data: apiKey,
    isLoading: isLoadingKey,
    refetch: refetchKey,
  } = useQuery<ApiKeyState>({
    queryKey: ["api-key"],
    queryFn: async () => {
      const headers = await getHeaders();
      const response = await axios.get<{ api_key: string }>(
        `${BASE_URL}/api/v1/api-keys`,
        { headers }
      );
      return { api_key: response.data.api_key, isVisible: false };
    },
  });

  // Mutation: Set Global AI Provider (only provider is sent)
  const { mutate: setGlobalProviderMutation, isPending: isSettingGlobal } =
    useMutation({
      mutationFn: async () => {
        const headers = await getHeaders();
        const payload = {
          inference_model: availableProviders?.findLast(
            (provider) => provider.name == userSelectedProvider
          )?.inference_model_id,
        };
        return axios.post(
          `${BASE_URL}/api/v1/set-global-ai-provider/`,
          payload,
          { headers }
        );
      },
      onSuccess: () => {
        toast.success("Global AI provider set successfully");
        queryClient.invalidateQueries({ queryKey: ["global-provider"] });
      },
      onError: () => {
        toast.error("Failed to set global AI provider");
      },
    });

  // Mutation: Save user secret (register user key) – no model fields sent.
  const { mutate: saveSecret, isPending: isSaving } = useMutation({
    mutationFn: async (data: { provider: string; api_key: string }) => {
      const headers = await getHeaders();
      return axios.post(
        `${BASE_URL}/api/v1/secrets`,
        {
          inference_config: {
            api_key: data.api_key,
            model: availableProviders?.findLast(
              (provider) => provider.name == userSelectedProvider
            )?.inference_model_id,
          },
        },
        { headers }
      );
    },
    onSuccess: () => {
      toast.success("Key saved successfully");
      setCreateNewKeyDialogOpen(false);
      setKeyType("userKey");
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
      setInputKeyValue("");
      setUserSelectedProvider("");
    },
    onError: () => {
      toast.error("Something went wrong while saving the key");
    },
  });

  // Mutation: Delete user secret (switch back to Potpie's key)
  const { mutate: deleteSecret, isPending: isDeleting } = useMutation({
    mutationFn: async (provider: string) => {
      const headers = await getHeaders();
      await axios.delete(`${BASE_URL}/api/v1/secrets/${provider}`, { headers });
    },
    onSuccess: () => {
      toast.success("Key deleted successfully");
      setDeleteKeyDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
      setKeyType("momentumKey");
    },
    onError: () => {
      toast.error("Something went wrong while deleting the key");
    },
  });
  
  // Mutation: Save integration API key
  const { mutate: saveIntegration, isPending: isSavingIntegration } = useMutation({
    mutationFn: async (data: { service: string; api_key: string }) => {
      const headers = await getHeaders();
      const payload = {
        integration_keys: [
          { service: data.service, api_key: data.api_key }
        ]
      };
      return axios.post(`${BASE_URL}/api/v1/integration-keys`, payload, { headers });
    },
    onSuccess: () => {
      toast.success("Integration key saved successfully");
      setCreateIntegrationDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["integration-keys"] });
      setIntegrationKeyValue("");
      setSelectedIntegration("");
    },
    onError: () => {
      toast.error("Something went wrong while saving the integration key");
    },
  });
  
  // Mutation: Delete integration API key
  const { mutate: deleteIntegration, isPending: isDeletingIntegration } = useMutation({
    mutationFn: async (service: string) => {
      const headers = await getHeaders();
      await axios.delete(`${BASE_URL}/api/v1/integration-keys/${service}`, { headers });
    },
    onSuccess: () => {
      toast.success("Integration key deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["integration-keys"] });
    },
    onError: () => {
      toast.error("Something went wrong while deleting the integration key");
    },
  });

  // Mutation: Generate API Key (unchanged)
  const { mutate: generateApiKey, isPending: isGenerating } = useMutation({
    mutationFn: async () => {
      const headers = await getHeaders();
      return axios.post(`${BASE_URL}/api/v1/api-keys`, {}, { headers });
    },
    onSuccess: () => {
      toast.success("API Key generated successfully");
      refetchKey();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to generate API key"
      );
    },
  });

  // Mutation: Revoke API Key (unchanged)
  const { mutate: revokeApiKey, isPending: isRevoking } = useMutation({
    mutationFn: async () => {
      const headers = await getHeaders();
      return axios.delete(`${BASE_URL}/api/v1/api-keys`, { headers });
    },
    onSuccess: () => {
      toast.success("API Key revoked successfully");
      queryClient.setQueryData(["api-key"], null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to revoke API key");
    },
  });

  // Toggle API key visibility
  const toggleKeyVisibility = () => {
    if (!apiKey) return;
    queryClient.setQueryData(
      ["api-key"],
      (oldData: ApiKeyState | undefined) => {
        if (!oldData) return oldData;
        return { ...oldData, isVisible: !oldData.isVisible };
      }
    );
  };

  // Mask key for display
  const maskKey = (key: string) => {
    if (!key) return "";
    const visibleStart = key.slice(0, 4);
    const visibleEnd = key.slice(-4);
    return `${visibleStart}${"•".repeat(32)}${visibleEnd}`;
  };

  return (
    <div className="ml-8 mt-4 flex flex-col text-start h-full">
      {/* Global Provider Section */}
      <div className="flex flex-col pb-8">
        <h2 className="text-2xl font-semibold mb-4 text-primary mt-4">
          Set Global AI Provider
        </h2>
        <div className="flex items-center gap-4">
          <Select
            value={selectedGlobalProvider}
            onValueChange={setSelectedGlobalProvider}
          >
            <SelectTrigger className="w-[280px] rounded-sm">
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent className="bg-muted">
              {availableProviders?.map((prov) => (
                <SelectItem key={prov.name} className="pl-8" value={prov.name}>
                  {prov.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setGlobalProviderMutation()}
            disabled={!selectedGlobalProvider || isSettingGlobal}
          >
            Set as Global
          </Button>
        </div>
      </div>
      <Separator className="pr-20 mt-4" />
      {/* Key Management Section */}
      <div className="flex flex-col pb-8">
        <h2 className="text-2xl font-semibold mb-4 text-primary mt-4">
          Set the Key
        </h2>
        <h2 className="text-base text-black pb-4">
          Select the key you want to use for generating tests
        </h2>
        <RadioGroup>
          <div className="flex items-center">
            <RadioGroupItem
              value="momentumKey"
              checked={keyType === "momentumKey"}
              onClick={() => setDeleteKeyDialogOpen(true)}
            />
            <Label className="pl-2">I want to use Potpie&apos;s key</Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem
              value="userKey"
              checked={keyType === "userKey"}
              onClick={() => setCreateNewKeyDialogOpen(true)}
            />
            <Label className="pl-2">I want to use my key</Label>
          </div>
        </RadioGroup>
        {/* Delete (switch back to Potpie's key) Dialog */}
        <Dialog
          open={deleteKeyDialogOpen}
          onOpenChange={setDeleteKeyDialogOpen}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg text-primary">
                Are you sure you want to switch?
              </DialogTitle>
              <DialogDescription>
                <p className="text-base text-black mt-2">
                  We don&apos;t keep unused keys. If you switch to Potpie&apos;s
                  key, all your saved keys will be deleted and you will have to
                  re-register them later. Are you sure you want to proceed?
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() =>
                  deleteSecret(KeySecrets?.inference_config?.provider || "all")
                }
                disabled={isDeleting}
              >
                Delete All Keys
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteKeyDialogOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Create new key (user key) Dialog */}
        <Dialog
          open={createNewKeyDialogOpen}
          onOpenChange={setCreateNewKeyDialogOpen}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg text-primary">
                Register New Key
              </DialogTitle>
              <DialogDescription>
                <p className="text-base text-black mt-2">
                  Select the LLM you want to use and enter your API key.
                </p>
                {userSelectedProvider && (
                  <p className="text-sm text-black mt-2">
                    {getKeyPromptMessage(userSelectedProvider)}
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col">
              <div className="flex mt-2">
                <Select
                  value={userSelectedProvider}
                  onValueChange={setUserSelectedProvider}
                >
                  <SelectTrigger className="w-xl rounded-sm">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectGroup>
                      {availableProviders?.map((prov) => (
                        <SelectItem key={prov.name} value={prov.name}>
                          {prov.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col mt-2">
                <h2 className="text-base text-black">Enter Your API Key</h2>
                <Input
                  type="password"
                  className="w-xl bg-background mt-2"
                  value={inputKeyValue}
                  onChange={(e) => setInputKeyValue(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() =>
                  saveSecret({
                    provider: userSelectedProvider,
                    api_key: inputKeyValue,
                  })
                }
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Separator className="pr-20 mt-4" />
      {/* Display Saved Key */}
      <div className="mt-4 pr-10">
        {KeySecrets?.inference_config?.api_key && keyType === "userKey" && (
          <Table>
            <TableHeader>
              <TableRow className="border-bottom border-border">
                <TableHead className="w-[200px] text-black">Provider</TableHead>
                <TableHead className="w-[400px] text-black">
                  Key Value
                </TableHead>
                <TableHead className="w-[100px] text-black">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow key={KeySecrets?.inference_config?.api_key}>
                <TableCell>
                  {KeySecrets?.inference_config?.provider
                    ? KeySecrets?.inference_config?.provider
                        .charAt(0)
                        .toUpperCase() +
                      KeySecrets.inference_config.provider.slice(1)
                    : "Unknown Provider"}
                </TableCell>
                <TableCell className="font-mono">
                  {maskKey(KeySecrets.inference_config.api_key)}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      deleteSecret(
                        KeySecrets?.inference_config?.provider || "all"
                      )
                    }
                    disabled={isDeleting}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
      <Separator className="pr-20 mt-8" />
      
      {/* Integrations Section */}
      <div className="flex flex-col pb-8">
        <h2 className="text-2xl font-semibold mb-4 text-primary mt-4">
          Integrations
        </h2>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setCreateIntegrationDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} /> Add Integration Key
          </Button>
        </div>
        
        {/* Create Integration Key Dialog */}
        <Dialog
          open={createIntegrationDialogOpen}
          onOpenChange={setCreateIntegrationDialogOpen}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg text-primary">
                Add Integration Key
              </DialogTitle>
              <DialogDescription>
                <p className="text-base text-black mt-2">
                  Select an integration and enter your API key.
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col">
              <div className="flex mt-2">
                <Select
                  value={selectedIntegration}
                  onValueChange={setSelectedIntegration}
                >
                  <SelectTrigger className="w-xl rounded-sm">
                    <SelectValue placeholder="Select an integration" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectGroup>
                      <SelectItem value="notion">Notion</SelectItem>
                      <SelectItem value="linear">Linear</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col mt-2">
                <h2 className="text-base text-black">Enter Your API Key</h2>
                <Input
                  type="password"
                  className="w-xl bg-background mt-2"
                  value={integrationKeyValue}
                  onChange={(e) => setIntegrationKeyValue(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() =>
                  saveIntegration({
                    service: selectedIntegration,
                    api_key: integrationKeyValue,
                  })
                }
                disabled={!selectedIntegration || !integrationKeyValue || isSavingIntegration}
              >
                {isSavingIntegration ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Display Saved Integration Keys */}
        <div className="mt-4 pr-10">
          {integrationKeys && integrationKeys.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-bottom border-border">
                  <TableHead className="w-[200px] text-black">Integration</TableHead>
                  <TableHead className="w-[400px] text-black">
                    Key Value
                  </TableHead>
                  <TableHead className="w-[100px] text-black">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrationKeys.map((item) => (
                  <TableRow key={item.service}>
                    <TableCell className="flex items-center gap-2">
                      <div className="w-6 h-6 relative">
                        <Image
                          src={`/images/${item.service}.svg`}
                          alt={item.service}
                          width={24}
                          height={24}
                        />
                      </div>
                      {item.service.charAt(0).toUpperCase() + item.service.slice(1)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {maskKey(item.api_key)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteIntegration(item.service)}
                        disabled={isDeletingIntegration}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {isLoadingIntegrationKeys && (
            <div className="text-center py-4 text-gray-500">
              Loading integration keys...
            </div>
          )}
          {integrationKeys && integrationKeys.length === 0 && !isLoadingIntegrationKeys && (
            <div className="text-center py-4 text-gray-500">
              No integration keys found. Add one to get started.
            </div>
          )}
        </div>
      </div>
      
      <Separator className="pr-20 mt-8" />
      {/* API Key Management Section */}
      <h2 className="text-2xl font-semibold mb-4 text-primary mt-4">
        API Key Management
      </h2>
      <div className="flex">
        <h3 className="text-lg text-primary">Your API Key</h3>
        {!isLoadingKey && !apiKey && (
          <Button
            onClick={() => generateApiKey()}
            className="text-right w-40 ml-auto mr-10"
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate API Key"}
          </Button>
        )}
      </div>
      <div className="mt-4 pr-10">
        {isLoadingKey ? (
          <div className="text-center py-4 text-gray-500">
            Loading API key...
          </div>
        ) : apiKey?.api_key ? (
          <Table>
            <TableHeader>
              <TableRow className="border-bottom border-border">
                <TableHead className="w-[400px] text-black">API Key</TableHead>
                <TableHead className="w-[100px] text-black text-right">
                  Actions
                </TableHead>
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
          <div className="text-center py-4 text-gray-500">
            No API key found. Generate one to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyManagement;
