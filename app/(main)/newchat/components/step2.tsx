import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { auth } from "@/configs/Firebase-config";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import dayjs from "dayjs";
import { setChat } from "@/lib/state/Reducers/chat";
import { AppDispatch } from "@/lib/state/store";
import { useDispatch } from "react-redux";

interface AgentType {
  id: string;
  name: string;
  description: string;
}

interface Step2Props {
  projectId: string | null;
  title: string,
  setChatStep: (step: number) => void;
  setCurrentConversationId: (id: string) => void;
  setAgentId: (id: string) => void;
}

const Step2: React.FC<Step2Props> = ({
  projectId,
  title,
  setChatStep,
  setCurrentConversationId,
  setAgentId,
}) => {
  const userId = auth.currentUser?.uid || "";
  const dispatch: AppDispatch = useDispatch();
  
  const { data: AgentTypes, isLoading: AgentTypesLoading } = useQuery<AgentType[]>({
    queryKey: ["agent-types"],
    queryFn: async () => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await axios.get(`${baseUrl}/api/v1/list-available-agents/`, {
        headers: headers,
      });
      dispatch(setChat( {allAgents: response.data}))

      return response.data;
    },
  });

  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const createConversation = async (agentId: string) => {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/`,
        {
          user_id: userId,
          title: title,
          status: "active",
          project_ids: [projectId],
          agent_ids: [agentId],
        },
        { headers: headers }
      );
      setAgentId(agentId);
      setChatStep(3);
      setCurrentConversationId(response.data.conversation_id);
    } catch (err) {
      console.error("Unable to create conversation:", err);
      setChatStep(2); 
    }
  };

  return (
    <div className="flex flex-col w-full gap-3">
      <h1 className="text-lg">Choose your expert</h1>
      <div className="w-full max-w-[65rem] h-full grid grid-cols-2 ml-5 space-y6 gap-6">
        {AgentTypesLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="border-border w-[450px] h-40" />
            ))
          : AgentTypes?.map((content, index) => (
              <Card
                key={index}
                className={`pt-2 border-border w-[485px] shadow-sm rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300 ${
                  selectedCard === content.id
                    ? "border-[#FFB36E] border-2"
                    : "hover:border-[#FFB36E] hover:border-2"
                }`}
                onClick={() => {
                  createConversation(content.id);
                  setSelectedCard(content.id);
                }}
              >
                <CardHeader className="p-1 px-6 font-normal">
                  <CardTitle className="text-lg flex gap-3 text-muted">
                    <Image
                      src={"/images/person.svg"}
                      alt="logo"
                      width={20}
                      height={20}
                    />
                    <span>{content.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-base ml-8 text-muted-foreground leading-tight px-6 pb-4">
                  {content.description}
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
};

export default Step2;
