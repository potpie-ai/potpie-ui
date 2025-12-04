import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef } from "react";
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

const Step2: React.FC<Step2Props> = ({ projectId, title, setChatStep, gotoChat }) => {
  const userId = auth.currentUser?.uid || "";
  const dispatch: AppDispatch = useDispatch();

  const { data: AgentTypes, isLoading: AgentTypesLoading } = useQuery<AgentType[]>({
    queryKey: ["agent-types"],
    queryFn: async () => {
      const agentTypes = await AgentService.getAgentTypes();
      dispatch(setChat({ allAgents: agentTypes }));
      return agentTypes;
    },
  });

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(0);

  const cardWidth = 280; // Fixed width for each card in pixels
  const containerPadding = 32; // 16px padding on both sides (px-4)
  const cardGap = 16;
  const containerRef = useRef<HTMLDivElement>(null);
  // Helper function to calculate how many cards can be shown based on available width.
  const calculateVisibleCards = () => {
        const availableWidth = containerRef.current 
      ? containerRef.current.clientWidth
      : window.innerWidth * 0.8 - containerPadding;
    return Math.max(1, Math.floor((availableWidth / (cardWidth + cardGap)) + 0.9));
  };

  // Update visible cards and adjust the current index if necessary on mount and window resize.
  useEffect(() => {
    const updateVisibleCards = () => {
      const newVisibleCards = calculateVisibleCards();
      setVisibleCards(newVisibleCards);
    };
    
    // Basic debounce implementation
    let resizeTimer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateVisibleCards, 150);
    };
    
    updateVisibleCards();
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimer);
    };
  }, [AgentTypes]); // Removed currentIndex from dependencies

  // Separate effect to handle currentIndex adjustments
  useEffect(() => {
    if (AgentTypes && visibleCards > 0) {
      const maxIndex = Math.max(0, AgentTypes.length - visibleCards);
      if (currentIndex > maxIndex) {
        setCurrentIndex(maxIndex);
      }
    }
  }, [AgentTypes, visibleCards, currentIndex]);

  const createConversation = async (agentId: string) => {
    try {
      const response = await ChatService.createConversation(userId, title, projectId, agentId);
      dispatch(setChat({ agentId }));
      setChatStep(3);
      gotoChat(response.conversation_id);
    } catch (err) {
      setChatStep(2);
    }
  };

  const truncateText = (text: string, wordLimit: number) => {
    const words = text.split(" ");
    return words.length > wordLimit ? words.slice(0, wordLimit).join(" ") + "..." : text;
  };

  // Using a helper to calculate max index based on AgentTypes and visibleCards.
  const getMaxIndex = () => (AgentTypes ? Math.max(0, AgentTypes.length - visibleCards) : 0);

  const nextSlide = () => {
    if (AgentTypes) {
      const maxIndex = getMaxIndex();
      setCurrentIndex(prev => (prev + 1 > maxIndex ? 0 : prev + 1));
    }
  };

  const prevSlide = () => {
    if (AgentTypes) {
      const maxIndex = getMaxIndex();
      setCurrentIndex(prev => (prev - 1 < 0 ? maxIndex : prev - 1));
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
          style={{ left: '-12px' }}
        >
          <ChevronLeft size={24} />
        </button>

        {/* Cards Container */}
        <div className="overflow-hidden w-full px-4" ref={containerRef}>
          <div
            className="flex gap-4 transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * (cardWidth + cardGap)}px)` }}
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
                        selectedCard === content.id ? "border-blue-500 shadow-md" : "border-gray-200"
                      }`}
                      onClick={() => {
                        createConversation(content.id);
                        setSelectedCard(content.id);
                      }}
                    >
                      <CardHeader className="flex items-center space-x-3 pb-2">
                        <Bot className="flex-shrink-0" />
                        <CardTitle className="text-lg font-medium">{content.name}</CardTitle>
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
        {AgentTypes && AgentTypes.length > 0 && visibleCards > 0 && (() => {
          const totalPages = Math.ceil(AgentTypes.length / visibleCards);
          // Ensure totalPages is a valid positive number
          const safeTotalPages = Math.max(1, Math.min(totalPages, 1000)); // Cap at 1000 to prevent memory issues
          const currentPage = Math.floor(currentIndex / visibleCards);
          return [...Array(safeTotalPages)].map((_, index) => (
            <button
              key={index}
              className={`h-2 w-2 rounded-full transition ${
                currentPage === index ? "bg-blue-500 w-4" : "bg-gray-300"
              }`}
              onClick={() => {
                const maxIndex = getMaxIndex();
                setCurrentIndex(Math.min(index * visibleCards, maxIndex));
              }}
            />
          ));
        })()}
      </div>
    </div>
  );
};

export default Step2;