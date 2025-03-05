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
  const [isRunning, setIsRunning] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [extras, setExtras] = useState({
    loading: true,
    streaming: true,
  });

  const initarray: ThreadMessageLike[] = [];
  const [messages, setMessages] = useState(initarray);

  const loadMessages = async () => {
    try {
      if (messagesLoaded) return;

      setExtras({ loading: true, streaming: false });

      const res = await ChatService.loadMessages(chatId, 0, 50);

      setMessages(res.map((msg: any) => convertToThreadMessage(msg)));

      setMessagesLoaded(true);
      setExtras({ loading: false, streaming: false });
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const onNew = async (message: AppendMessage) => {
    if (message.content.length !== 1 || message.content[0]?.type !== "text")
      throw new Error("Only text content is supported");

    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text: message.content[0].text }],
    };
    setIsRunning(true);
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
    await ChatService.streamMessage(
      chatId,
      message.content[0].text,
      message.runConfig?.custom?.selectedNodes || [],
      (message: string) => {
        setIsRunning(false);
        setExtras({ loading: false, streaming: true });

        const lastMessage = assistantMessage;
        lastMessage.content[0].text = message;
        setMessages((currentMessages) => {
          return [...currentMessages.slice(0, -1), lastMessage];
        });
      }
    );
    setIsRunning(false);
    setExtras({ loading: false, streaming: false });
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
      setIsRunning(false);
      setExtras({ loading: false, streaming: true });
      setMessages((currentMessages) => {
        assistantMessage.content[0].text = message;
        return [
          ...currentMessages.slice(0, currentMessages.length - 1),
          assistantMessage,
        ];
      });
    });
    setIsRunning(false);
    setExtras({ loading: false, streaming: false });
  };

  return useExternalStoreRuntime<ThreadMessageLike>({
    isRunning,
    messages,
    extras,
    setMessages,
    onNew,
    onReload,
    convertMessage,
  });
}
