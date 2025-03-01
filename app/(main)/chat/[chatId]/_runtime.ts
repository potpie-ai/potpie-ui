import { RootState } from "@/lib/state/store";
import ChatService from "@/services/ChatService";
import {
  AppendMessage,
  ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useState, useEffect } from "react";

const convertMessage = (message: ThreadMessageLike) => {
  return message;
};

const convertToThreadMessage = (message: any): ThreadMessageLike => {
  return {
    id: message.id,
    role: message.sender == "user" ? "user" : "assistant",
    content: [
      {
        type: "text",
        text: message.text,
      },
    ],
  };
};

export function PotpieRuntime(chatId: string) {
  const [messages, setMessages] = useState<readonly ThreadMessageLike[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [isDisabled, setIsDisabled] = useState(true);

  const loadMessages = async () => {
    try {
      if (messagesLoaded) return;

      const res = await ChatService.loadMessages(chatId, 0, 50);

      setMessages(res.map((msg: any) => convertToThreadMessage(msg)));

      setMessagesLoaded(true);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    if (messagesLoaded) {
      setIsDisabled(false);
    }
  }, [messagesLoaded]);

  const onNew = async (message: AppendMessage) => {
    if (message.content.length !== 1 || message.content[0]?.type !== "text")
      throw new Error("Only text content is supported");

    console.log("config:", message.runConfig?.custom);

    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text: message.content[0].text }],
    };
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    const assistantMessage: ThreadMessageLike = {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "",
        },
      ],
    };
    setMessages((currentMessages) => {
      return [...currentMessages, assistantMessage];
    });

    setIsRunning(true);
    await ChatService.streamMessage(
      chatId,
      message.content[0].text,
      message.runConfig?.custom.selectedNodes || [],
      (message: string) => {
        assistantMessage.content[0].text = message;

        setMessages((currentMessages) => {
          return [...currentMessages.slice(0, -1), assistantMessage];
        });
      }
    );

    setIsRunning(false);
  };

  const onReload = async (parentId: string | null) => {
    const assistantMessage: ThreadMessageLike = {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "",
        },
      ],
    };
    setIsRunning(true);
    await ChatService.regenerateMessage(chatId, [], (message: string) => {
      setMessages((currentMessages) => {
        assistantMessage.content[0].text = message;
        return [
          ...currentMessages.slice(0, currentMessages.length - 1),
          assistantMessage,
        ];
      });
    });
    setIsRunning(false);
  };

  return useExternalStoreRuntime<ThreadMessageLike>({
    isDisabled,
    isRunning,
    messages,
    setMessages,
    onNew,
    onReload,
    convertMessage,
  });
}
