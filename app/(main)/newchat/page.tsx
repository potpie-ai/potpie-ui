"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Step1 from "./components/step1";
import Step2 from "./components/step2";
import NodeSelectorForm from "@/components/NodeSelectorChatForm/NodeSelector";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { setChat, setPendingMessage } from "@/lib/state/Reducers/chat";

const NewChat = () => {
  const router = useRouter();
  const [chatStep, setChatStep] = useState(1);
  const [repoName, setRepoName] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string>();
  const { title } = useSelector(
    (state: RootState) => state.chat
  );
  const dispatch: AppDispatch = useDispatch();

 /*
  This function handles the form submission in the NodeSelectorForm.
  - It dispatches an action to set the pending message in the Redux store.
  - After setting the pending message, it navigates the user to the chat page based on the current conversation ID.
  */
  const handleFormSubmit = (message: string) => {
    if(!projectId || !currentConversationId) return;
    dispatch(setPendingMessage(message));
    dispatch(setChat({ chatFlow: "NEW_CHAT", temporaryContext: {branch:branchName, repo: repoName, projectId: projectId}, agentId: agentId }));
    router.push(`/chat/${currentConversationId}`);
  };

  // Steps for the chat creation process
  const steps = [
    {
      label: 1,
      content: (
        <Step1
          repoName={repoName}
          branchName={branchName}
          setRepoName={setRepoName}
          setBranchName={setBranchName}
          setProjectId={setProjectId}
          setChatStep={setChatStep}
        />
      ),
    },
    {
      label: 2,
      content: (
        <Step2
          projectId={projectId}
          title={title}
          setChatStep={setChatStep}
          setCurrentConversationId={setCurrentConversationId}
          setAgentId={setAgentId}
        />
      ),
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

  return (
    <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl p-2 lg:col-span-2">
      {/* Step Logic */}
      <div className="relative w-[97%] h-full flex flex-col items-center -mb-6 mt-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-start mb-4 w-full relative ${chatStep === step.label ? "" : "pointer-events-none"}`}
          >
            <div className={`absolute left-[18px] top-10 h-full border-l-2 border-gray-300 z-0 ${index === steps.length - 1 ? "hidden" : "top-10"}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full z-5 ${step.label === 3 && chatStep === 3 ? "bg-[#00C313] text-white" : step.label <= chatStep ? "bg-white text-border border-2 border-accent" : "bg-border text-white"}`}>
              {step.label}
            </div>
            <div className="flex flex-col ml-8 w-full">{step.content}</div>
          </div>
        ))}
      </div>

      <NodeSelectorForm projectId={projectId} onSubmit={handleFormSubmit} disabled={chatStep !== 3} />
    </div>
  );
};

export default NewChat;
function dispatch(arg0: any) {
  throw new Error("Function not implemented.");
}

