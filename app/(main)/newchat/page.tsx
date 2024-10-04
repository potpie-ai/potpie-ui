"use client";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { setChat, setPendingMessage, clearChat } from "@/lib/state/Reducers/chat";
import Step1 from "./components/step1";
import Step2 from "./components/step2";
import NodeSelectorForm from "@/components/NodeSelectorChatForm/NodeSelector";
import { useEffect } from "react";

const NewChat = () => {
  const router = useRouter();
  const dispatch: AppDispatch = useDispatch();
  const { chatStep, currentConversationId, projectId, selectedNodes } = useSelector(
    (state: RootState) => state.chat
  );

  /*
  This function handles the form submission in the NodeSelectorForm.
  - It dispatches an action to set the pending message in the Redux store.
  - After setting the pending message, it navigates the user to the chat page based on the current conversation ID.
  */
  const handleFormSubmit = (message: string) => {
    if(!projectId || !currentConversationId) return;
    dispatch(setPendingMessage(message));
    dispatch(setChat({ chatFlow: "NEW_CHAT" }));
    router.push(`/chat/${currentConversationId}`);
  };

  /*
  Steps configuration for the chat creation process.
  - Each step contains a label and corresponding content.
  - Step1 and Step2 are imported components, while Step3 simply displays a message.
  */
  const steps = [
    {
      label: 1,
      content: <Step1 />, // Step 1 content component
    },
    {
      label: 2,
      content: <Step2 />, // Step 2 content component
    },
    {
      label: 3,
      content: (
        <div className="flex flex-col ml-4 w-full">
          <span className="text-lg">All Set! Start chatting.</span>
        </div>
      ),
    },
  ];

  // Reset relevant states when the component mounts
  useEffect(() => {
    dispatch(clearChat());
    dispatch(setChat({ repoName: "", branchName: "", chatStep: 1 }));
  }, [dispatch]);

  return (
    <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl p-2 lg:col-span-2">
      {/* Step Logic */}
      <div className="relative w-[97%] h-full flex flex-col items-center -mb-6 mt-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-start mb-4 w-full relative ${chatStep !== undefined && step.label === chatStep ? "" : "pointer-events-none"
              }`}
          >
            {/* Vertical Line */}
            <div
              className={`absolute left-[18px] top-10 h-full border-l-2 border-gray-300 z-0 ${index === steps.length - 1 ? "hidden" : "top-10"
                }`}
            ></div>

            {/* Step Circle */}
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full z-5 ${step.label === 3 && chatStep === 3
                  ? "bg-[#00C313] text-white"
                  : step.label <= (chatStep ?? 0)
                    ? "bg-white text-border border-2 border-accent"
                    : "bg-border text-white"
                }`}
            >
              {step.label}
            </div>

            {/* Step Text */}
            <div className="flex flex-col ml-8 w-full">{step.content}</div>
          </div>
        ))}
      </div>

      <NodeSelectorForm projectId={projectId} onSubmit={handleFormSubmit} disabled={chatStep !== 3} />
    </div>
  );
};

export default NewChat;