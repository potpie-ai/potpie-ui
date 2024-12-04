"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery } from "@tanstack/react-query";
import KeyManagmentService from "@/services/KeyManagment";
import { toast } from "sonner";
import UserKeys from "./components/UserKeys";
import SelectLLM from "./components/SelectLLM";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";

const KeyManagment = () => {
  const [selectedKey, setSelectedKey] = useState("");
  const { AiProvider } = useSelector((state: RootState) => state.KeyManagment);
  const [savedKeysResponse, setSavedKeysResponse] = useState<
    { provider: string; api_key: any }[]
  >([]);
  const [openKeyDialog, setOpenKeyDialog] = useState(false);
  const handleCheckboxChange = (key: string) => {
    setSelectedKey((prevKey) => (prevKey === key ? "" : key));
  };

  const setGlobalAiProvider = useMutation({
    mutationFn: (provider: string) =>
      KeyManagmentService.SetGlobalAiProvider(provider),
    onSuccess(data) {
      toast.success(data.message);
    },
  });
  const {
    data: secret,
    isLoading: secretLoading,
    refetch: refetchSecret,
    isError: secretError,
  } = useQuery({
    queryKey: ["provider-secret", AiProvider],
    queryFn: async () => {
      const res = await KeyManagmentService.GetSecreteForProvider(AiProvider);
      if (!res) return "";
      setSavedKeysResponse((prev) => {
        const existingProvider = prev.find(
          (item) => item.provider === AiProvider
        );
        if (existingProvider) {
          return prev.map((item) =>
            item.provider === AiProvider
              ? { provider: AiProvider, api_key: res.api_key }
              : item
          );
        } else {
          return [...prev, { provider: AiProvider, api_key: res.api_key }];
        }
      });
      return res;
    },
  });

  const { mutate: deleteSecret, isPending: isDeleting } = useMutation({
    mutationFn: (provider: string) =>
      KeyManagmentService.DeleteSecret(provider),
    onSuccess: (data, provider) => {
      toast.success(data.message);
      setSavedKeysResponse((prev) =>
        prev.filter((item) => item.provider !== provider)
      );
      setSelectedKey("potpieKey");
    },
    onError: () => {
      toast.error("Something went wrong");
    },
  });

  useEffect(() => {
    if (AiProvider && openKeyDialog) {
      refetchSecret();
    }
  }, [AiProvider, openKeyDialog, refetchSecret]);

  useEffect(() => {
    const providers = ["openai", "anthropic"];
    const fetchRemainingKey = async () => {
      const remainingProvider = providers.find(
        (provider) => provider !== AiProvider
      );

      if (remainingProvider) {
        const res =
          await KeyManagmentService.GetSecreteForProvider(remainingProvider);

        if (res.api_key) {
          setSavedKeysResponse((prev) => {
            const updatedResponse = prev.filter(
              (item) => item.provider !== remainingProvider
            );
            return [
              ...updatedResponse,
              { provider: remainingProvider, api_key: res.api_key },
            ];
          });
        }
      }
    };

    fetchRemainingKey();
  }, []); // Re-run whenever AiProvider changes

  return (
    <div className="flex flex-col gap-10 w-full h-full">
      <Card className="border-none shadow-none bg-background">
        <CardHeader>
          <CardTitle className="text-primary">Set Your Keys</CardTitle>
          <CardDescription>
            Select the key you want to use for generating tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            <div className="flex gap-6 items-center ">
              <div className="flex items-center gap-2 h-10">
                <Checkbox
                  disabled={setGlobalAiProvider.isPending}
                  id="potpieKey"
                  checked={selectedKey === "potpieKey"}
                  onCheckedChange={() => handleCheckboxChange("potpieKey")}
                />
                <label
                  htmlFor="potpieKey"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I want to use potpie&apos;s key
                </label>
              </div>
              {selectedKey === "potpieKey" && (
                <SelectLLM setGlobalAiProvider={setGlobalAiProvider} />
              )}
            </div>

            <div className="flex items-center gap-2 h-10">
              <Checkbox
                disabled={setGlobalAiProvider.isPending}
                id="UserKey"
                checked={selectedKey === "UserKey"}
                onCheckedChange={() => {
                  handleCheckboxChange("UserKey");
                  setOpenKeyDialog(true);
                }}
              />
              <label
                htmlFor="UserKey"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I want to use my key
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
      {selectedKey === "UserKey" && (
        <UserKeys
          open={openKeyDialog}
          setOpen={setOpenKeyDialog}
          setGlobalAiProvider={setGlobalAiProvider}
          secret={secret}
          secretLoading={secretLoading}
          secretError={secretError}
          refetchSecret={refetchSecret}
        />
      )}

      <Card className="border-none shadow-none bg-background">
        <CardHeader>
          <CardTitle className="text-primary">Manage Your Keys</CardTitle>
          <div className="pt-7 flex items-center justify-between w-full">
            <CardTitle className="text-primary">Saved Keys</CardTitle>
            <Button
              onClick={() => {
                setSelectedKey("UserKey");
                setOpenKeyDialog(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" /> Register Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mt-4 pr-10">
            <Table className="">
              <TableHeader>
                <TableRow className="border-bottom border-border">
                  <TableHead className="w-[200px] text-black">
                    Provider
                  </TableHead>
                  <TableHead className="w-[200px] text-black">
                    Key Value
                  </TableHead>
                </TableRow>
              </TableHeader>
              {savedKeysResponse.length != 0 && (
                <TableBody>
                  {savedKeysResponse.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.provider}</TableCell>
                      <TableCell className="">{item.api_key}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          disabled={isDeleting}
                          onClick={() => deleteSecret(item.provider)}
                        >
                          {isDeleting ? (
                            <Loader2 className="animate-spin h-4 w-4 " />
                          ) : (
                            <Trash className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyManagment;
