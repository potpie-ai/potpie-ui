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

  const getMessageFromText = (
    id: string | undefined,
    text: string
  ): ThreadMessageLike => {
    return {
      role: "assistant",
      id: id,
      content: [
        {
          type: "text",
          text: text,
        },
      ],
    };
  };

  const onNew = async (message: AppendMessage) => {
    if (message.content.length !== 1 || message.content[0]?.type !== "text")
      throw new Error("Only text content is supported");

    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text: message.content[0].text }],
    };
    setIsRunning(true);
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    setMessages((currentMessages) => {
      return [...currentMessages, getMessageFromText(undefined, "")];
    });
    await ChatService.streamMessage(
      chatId,
      message.content[0].text,
      (message.runConfig?.custom?.selectedNodes as any[]) || [], // @ts-ignore
      (message: string) => {
        setIsRunning(false);
        setExtras({ loading: false, streaming: true });

        setMessages((currentMessages) => {
          return [
            ...currentMessages.slice(0, -1),
            getMessageFromText(currentMessages.at(-1)?.id, message),
          ];
        });
      }
    );
    setIsRunning(false);
    setExtras({ loading: false, streaming: false });
  };

  const onReload = async (parentId: string | null) => {
    setIsRunning(true);
    await ChatService.regenerateMessage(chatId, [], (message: string) => {
      setIsRunning(false);
      setExtras({ loading: false, streaming: true });
      setMessages((currentMessages) => {
        return [
          ...currentMessages.slice(0, -1),
          getMessageFromText(currentMessages.at(-1)?.id, message),
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
