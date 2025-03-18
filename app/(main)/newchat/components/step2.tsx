import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { auth } from "@/configs/Firebase-config";
import { setChat } from "@/lib/state/Reducers/chat";
import { AppDispatch } from "@/lib/state/store";
import { useDispatch } from "react-redux";
import AgentService from "@/services/AgentService";
import ChatService from "@/services/ChatService";
import { Bot, ChevronLeft, ChevronRight } from "lucide-react";

interface AgentType {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface Step2Props {
  projectId: string | null;
  title: string;
  setChatStep: (step: number) => void;
  gotoChat: (conversation_id: string) => void;
}

const Step2: React.FC<Step2Props> = ({
  projectId,
  title,
  setChatStep,
  gotoChat,
}) => {
  const userId = auth.currentUser?.uid || "";
  const dispatch: AppDispatch = useDispatch();

  const { data: AgentTypes, isLoading: AgentTypesLoading } = useQuery<
    AgentType[]
  >({
    queryKey: ["agent-types"],
    queryFn: async () => {
      const agentTypes = await AgentService.getAgentTypes();
      dispatch(setChat({ allAgents: agentTypes }));
      return agentTypes;
    },
  });

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const cardWidth = 280; // Fixed width for each card in pixels

  const createConversation = async (agentId: string) => {
    try {
      const response = await ChatService.createConversation(
        userId,
        title,
        projectId,
        agentId
      );
      dispatch(setChat({ agentId: agentId }));
      setChatStep(3);
      gotoChat(response.conversation_id);
    } catch (err) {
      setChatStep(2);
    }
  };

  const truncateText = (text: string, wordLimit: number) => {
    const words = text.split(" ");
    return words.length > wordLimit
      ? words.slice(0, wordLimit).join(" ") + "..."
      : text;
  };

  const nextSlide = () => {
    if (AgentTypes) {
      const maxCards = Math.floor((window.innerWidth * 0.8) / cardWidth);
      setCurrentIndex((prev) =>
        prev + maxCards >= AgentTypes.length ? 0 : prev + 1
      );
    }
  };

  const prevSlide = () => {
    if (AgentTypes) {
      const maxCards = Math.floor((window.innerWidth * 0.8) / cardWidth);
      setCurrentIndex((prev) =>
        prev === 0 ? AgentTypes.length - maxCards : prev - 1
      );
    }
  };

  return (
    <div className="flex flex-col w-full items-start gap-4">
      <h1 className="text-lg">Choose Your Expert</h1>

      <div className="relative w-full max-w-[900px]">
        {/* Left Arrow */}
        <button
          onClick={prevSlide}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white shadow-md p-2 rounded-full hover:bg-gray-100 transition z-10"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Cards Container */}
        <div className="overflow-hidden w-full">
          <div
            className="flex gap-4 transition-transform duration-300 ease-in-out ml-4"
            style={{ transform: `translateX(-${currentIndex * (cardWidth + 16)}px)` }}
          >
            {AgentTypesLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} style={{ width: `${cardWidth}px` }} className="flex-shrink-0">
                    <Skeleton className="h-[280px] w-full" />
                  </div>
                ))
              : AgentTypes?.map((content) => (
                  <div key={content.id} style={{ width: `${cardWidth}px` }} className="flex-shrink-0">
                    <Card
                      className={`relative flex flex-col h-[210px] border transition-all duration-300 rounded-xl p-4 cursor-pointer hover:shadow-lg ${
                        selectedCard === content.id
                          ? "border-blue-500 shadow-md"
                          : "border-gray-200"
                      }`}
                      onClick={() => {
                        createConversation(content.id);
                        setSelectedCard(content.id);
                      }}
                    >
                      <CardHeader className="flex items-center space-x-3 pb-2">
                      <Bot className="flex-shrink-0" />
                        <CardTitle className="text-lg font-medium">
                          {content.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-gray-600 flex-grow overflow-hidden">
                        {truncateText(content.description, 15)}
                      </CardContent>
                    </Card>
                  </div>
                ))}
          </div>
        </div>

        {/* Right Arrow */}
        <button
          onClick={nextSlide}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white shadow-md p-2 rounded-full hover:bg-gray-100 transition"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Pagination Dots */}
      <div className="flex space-x-2 mt-4">
        {AgentTypes &&
          [...Array(Math.ceil(AgentTypes.length / Math.floor((window.innerWidth * 0.8) / cardWidth)))].map(
            (_, index) => (
              <button
                key={index}
                className={`h-2 w-2 rounded-full transition ${
                  currentIndex === index * Math.floor((window.innerWidth * 0.8) / cardWidth) ? "bg-blue-500 w-4" : "bg-gray-300"
                }`}
                onClick={() => setCurrentIndex(index * Math.floor((window.innerWidth * 0.8) / cardWidth))}
              />
            )
          )}
      </div>
    </div>
  );
};

export default Step2;
