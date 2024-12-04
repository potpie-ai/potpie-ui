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
import { useQuery } from "@tanstack/react-query";
import KeyManagmentService from "@/services/KeyManagment";
import { auth } from "@/configs/Firebase-config";
import { Skeleton } from "@/components/ui/skeleton";
import { useDispatch, useSelector } from "react-redux";
import { setAiProvider } from "@/lib/state/Reducers/keyManagment";
import { RootState } from "@/lib/state/store";
const SelectLLM = ({
  width,
  setGlobalAiProvider,
  setGlobalAiProviderOnChange = true,
}: {
  width?: string;
  setGlobalAiProvider: any;
  setGlobalAiProviderOnChange?: boolean;
}) => {
  const { AiProvider } = useSelector((state: RootState) => state.KeyManagment);
  const userId = auth.currentUser?.uid || "";
  const dispatch = useDispatch();
  const {
    data: llms,
    isLoading: llmsLoading,
    isError: llmsError,
  } = useQuery({
    queryKey: ["list-available-llms"],
    queryFn: async () => KeyManagmentService.ListAvailableLLM(),
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
      disabled={setGlobalAiProvider.isPending} defaultValue={AiProvider}
      onValueChange={(e: string) => {
        if(setGlobalAiProviderOnChange){
          setGlobalAiProvider.mutate(e);
        }
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
