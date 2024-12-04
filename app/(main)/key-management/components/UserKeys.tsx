import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import SelectLLM from "./SelectLLM";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { useMutation } from "@tanstack/react-query";
import KeyManagmentService from "@/services/KeyManagment";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const UserKeys = ({
  open,
  setOpen,
  setGlobalAiProvider,
  secret,
  secretLoading,
  secretError,
  refetchSecret,
  selectedKey,
}: {
  open: any;
  setOpen: React.Dispatch<React.SetStateAction<any>>;
  setGlobalAiProvider: any;
  secret: any;
  secretLoading: boolean;
  secretError: boolean;
  refetchSecret: any;
  selectedKey: string;
}) => {
  const { AiProvider } = useSelector((state: RootState) => state.KeyManagment);
  const [apiKey, setApiKey] = React.useState("");

  useEffect(() => {
    if (secret) {
      setApiKey(secret.api_key);
    } else {
      setApiKey("");
    }
  }, [secret,open]);

  const CreateSecret = useMutation({
    mutationFn: ({
      api_key,
      provider,
    }: {
      api_key: string;
      provider: string;
    }) => KeyManagmentService.CreateSecret({ api_key, provider }),
    onSuccess(data, {provider}) {
      refetchSecret();
      setOpen(false);
      toast.success(data.message);
      setGlobalAiProvider(provider);
    },
  });
  const UpdateSecret = useMutation({
    mutationFn: ({
      api_key,
      provider,
    }: {
      api_key: string;
      provider: string;
    }) => KeyManagmentService.UpdateSecret({ api_key, provider }),
    onSuccess(data, {provider}) {
      refetchSecret();
      setOpen(false);
      toast.success(data.message);
      setGlobalAiProvider(provider);
    },
  });

  const handleSave = () => {
    if (!secret) {
      CreateSecret.mutate({ api_key: apiKey, provider: AiProvider });
    } else {
      UpdateSecret.mutate({ api_key: apiKey, provider: AiProvider });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-primary">Register new key</DialogTitle>
          <DialogDescription>Select the LLM you want to use</DialogDescription>
          <DialogDescription>
            Note: We only integrate with Open AI&apos;s GPT-4o and
            GPT-3.5-Turbo. Support for integrating other LLMs will be available
            soon.
          </DialogDescription>
        </DialogHeader>

        <SelectLLM width="100%" setGlobalAiProvider={setGlobalAiProvider} setGlobalAiProviderOnChange={false} />
        {secretLoading ? (
          <Skeleton className="w-full h-10" />
        ) : (
          <Input
            type="text"
            placeholder="Enter your API Key"
            defaultValue={
              secretError || !secret.api_key ? "" : secret.api_key || ""
            }
            onChange={(e) => setApiKey(e.target.value)}
            value={apiKey}
          />
        )}
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={UpdateSecret.isPending || CreateSecret.isPending || !apiKey} className="gap-2"
          >
            {(UpdateSecret.isPending ||
              CreateSecret.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}{" "}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserKeys;
