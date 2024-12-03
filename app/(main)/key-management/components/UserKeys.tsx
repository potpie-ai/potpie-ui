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
import { useQuery } from "@tanstack/react-query";
import KeyManagmentService from "@/services/KeyManagment";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  const {
    data: secret,
    isLoading: secretLoading,
    isError: secretError,
  } = useQuery({
    queryKey: ["provider-secret", AiProvider],
    queryFn: async () => KeyManagmentService.GetSecreteForProvider(AiProvider),
  });

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
          <Skeleton className="w-full h-8" />
        ) : (
          <Input
            type="text"
            placeholder="Enter your API Key"
            defaultValue={secretError ? "" : secret.data}
          />
        )}
        <DialogFooter>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserKeys;
