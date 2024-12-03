import React from "react";

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
import { useMutation, useQuery } from "@tanstack/react-query";
import KeyManagmentService from "@/services/KeyManagment";
import { auth } from "@/configs/Firebase-config";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDispatch } from "react-redux";
import { setAiProvider } from "@/lib/state/Reducers/keyManagment";
const SelectLLM = ({
  width,
  setGlobalAiProvider,
}: {
  width?: string;
  setGlobalAiProvider: any;
}) => {
  const userId = auth.currentUser?.uid || "";
  const dispatch = useDispatch();
  const {
    data: llms,
    isLoading: llmsLoading,
    isError: llmsError,
  } = useQuery({
    queryKey: ["list-available-llms"],
    queryFn: async () => KeyManagmentService.ListAvailableLLM(),
    // enabled: selectedKey === "potpieKey",
  });
  const { data: Prefferredllm, isLoading: PrefferredllmLoading } = useQuery({
    queryKey: ["list-preferred-llms"],
    queryFn: async () =>
      KeyManagmentService.GetPrefferredLLM({ userId: userId }),
  });

  if (llmsLoading && PrefferredllmLoading)
    return <Skeleton className="w-[180px] h-10" />;

  return (
    <Select
      disabled={setGlobalAiProvider.isPending}
      onValueChange={(e: string) => {
        setGlobalAiProvider.mutate(e);
        dispatch(setAiProvider(e));
      }}
    >
      <SelectTrigger
        className={` ${width ? "w-" + width + "px" : "w-[180px]"}`}
      >
        <SelectValue placeholder="Select LLM" />
      </SelectTrigger>
      <SelectContent
        className={`overflow-visible ${width ? "w-" + width + "px" : "w-[180px]"}`}
        defaultValue={Prefferredllm?.preferred_llm ?? undefined}
      >
        {llms?.map((llm, idx) => (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <SelectItem value={llm.id}>{llm.name}</SelectItem>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="w-1/2">
              <p>{llm.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SelectLLM;
