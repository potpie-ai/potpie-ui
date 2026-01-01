"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Step1 from "./components/step1";
import Step2 from "./components/step2";
import { RootState } from "@/lib/state/store";
import { useSelector } from "react-redux";

const NewChat = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chatStep, setChatStep] = useState(1);
  const [projectId, setProjectId] = useState<string>("");
  const { title } = useSelector((state: RootState) => state.chat);

  // Check if projectId is in URL (from idea page redirect)
  useEffect(() => {
    const urlProjectId = searchParams.get("projectId");
    if (urlProjectId) {
      setProjectId(urlProjectId);
      setChatStep(2); // Skip step1, go directly to step2 (agent selection)
    }
  }, [searchParams]);

  const gotoChat = (conversation_id: string) => {
    router.push(`/chat/${conversation_id}`);
  };

  // Steps for the chat creation process
  const steps = [
    {
      label: 1,
      content: <Step1 setProjectId={setProjectId} setChatStep={setChatStep} />,
    },
    {
      label: 2,
      content: (
        <Step2
          projectId={projectId}
          title={title}
          setChatStep={setChatStep}
          gotoChat={gotoChat}
        />
      ),
    },
    {
      label: 3,
      content: (
        <div className="flex flex-col w-full">
          <span className="text-lg">All Set! Start chatting.</span>
        </div>
      ),
    },
  ];

  return (
    <div className="px-10 relative flex h-full min-h-[50vh] flex-col rounded-xl p-2 lg:col-span-2">
      {/* Step Logic */}
      <div className="relative w-[97%] h-full flex flex-col items-center -mb-6 mt-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-start mb-4 w-full relative ${chatStep === step.label ? "" : "pointer-events-none opacity-50"}`}
          >
            <div
              className={`absolute left-[15px] top-8 h-full border-l-2 border-gray-300 z-0 ${index === steps.length - 1 ? "hidden" : "top-10"}`}
            ></div>
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full z-5 flex-shrink-0 ${
                step.label === 3 && chatStep === 3 
                  ? "bg-green-100 text-green-600 border-2 border-green-500" 
                  : step.label <= chatStep 
                  ? "bg-green-100 text-green-600 border-2 border-green-500" 
                  : "bg-gray-100 text-gray-600 border-2 border-gray-500"
              }`}
            >
              {step.label}
            </div>
            <div className="flex flex-col ml-8 w-full text-black">{step.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewChat;
