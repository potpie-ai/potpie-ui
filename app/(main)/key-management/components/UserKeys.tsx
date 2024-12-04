import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import SelectLLM from "./SelectLLM";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { useMutation, useQuery } from "@tanstack/react-query";
import KeyManagmentService from "@/services/KeyManagment";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const UserKeys = ({
  open,
  setOpen,
  setGlobalAiProvider,
}: {
  open: any;
  setOpen: React.Dispatch<React.SetStateAction<any>>;
  setGlobalAiProvider: any;
}) => {
  const { AiProvider } = useSelector((state: RootState) => state.KeyManagment);
  const [apiKey, setApiKey] = React.useState("");
  const {
    data: secret,
    isLoading: secretLoading,
    isError: secretError,
  } = useQuery({
    queryKey: ["provider-secret", AiProvider],
    queryFn: async () => KeyManagmentService.GetSecreteForProvider(AiProvider),
  });

  const CreateSecret = useMutation({
    mutationFn: ({
      api_key,
      provider,
    }: {
      api_key: string;
      provider: string;
    }) => KeyManagmentService.CreateSecret({ api_key, provider }),
    onSuccess(data) {
      toast.success(data.message);
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
    onSuccess(data) {
      toast.success(data.message);
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

        <SelectLLM width="100%" setGlobalAiProvider={setGlobalAiProvider} />
        {secretLoading ? (
          <Skeleton className="w-full h-10" />
        ) : (
          <Input
            type="text"
            placeholder="Enter your API Key"
            defaultValue={secretError || !secret ? "" : secret || ""}
            onChange={(e) => setApiKey(e.target.value)}
            value={apiKey}
          />
        )}
        <DialogFooter>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserKeys;
