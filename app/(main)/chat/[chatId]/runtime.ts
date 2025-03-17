import { setPendingMessage } from "@/lib/state/Reducers/chat";
import { AppDispatch, RootState } from "@/lib/state/store";
import ChatService from "@/services/ChatService";
import {
  AppendMessage,
  ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

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
    streaming: false,
  });

  const initarray: ThreadMessageLike[] = [];
  const [messages, setMessages] = useState(initarray);
  const { pendingMessage } = useSelector((state: RootState) => state.chat);
  const dispatch: AppDispatch = useDispatch();

  const loadMessages = async () => {
    try {
      if (messagesLoaded) return;
      if (!chatId) return;

      setExtras({ loading: true, streaming: false });

      const res = await ChatService.loadMessages(chatId, 0, 100);

      setMessages(res.map((msg: any) => convertToThreadMessage(msg)));

      setMessagesLoaded(true);
      setExtras({ loading: false, streaming: false });

      if (pendingMessage && pendingMessage != "") {
        onMessage(pendingMessage);
        dispatch(setPendingMessage(""));
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const getMessageFromText = (
    id: string | undefined,
    text: string,
    tool_calls: any[] = []
  ): ThreadMessageLike => {
    return {
      role: "assistant",
      id: id,
      content: [
        {
          type: "text",
          text: text,
        },
        ...tool_calls.map(
          (
            tool_call
          ): {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            result: any;
          } => {
            const {
              call_id,
              tool_name,
              tool_call_details,
              event_type,
              tool_response,
            } = JSON.parse(tool_call);
            return {
              type: "tool-call",
              toolCallId: call_id,
              toolName: tool_name,
              result: {
                event_type: event_type,
                response: tool_response,
                details: tool_call_details,
              },
            };
          }
        ),
      ],
    };
  };

  const onMessage = async (message: string) => {
    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text: message }],
    };
    setIsRunning(true);
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    setMessages((currentMessages) => {
      return [...currentMessages, getMessageFromText(undefined, "")];
    });
    await ChatService.streamMessage(
      chatId,
      message,
      [], // @ts-ignore
      (message: string, tool_calls: any[]) => {
        setIsRunning(false);
        setExtras({ loading: false, streaming: true });

        setMessages((currentMessages) => {
          return [
            ...currentMessages.slice(0, -1),
            getMessageFromText(currentMessages.at(-1)?.id, message, tool_calls),
          ];
        });
      }
    );
    setIsRunning(false);
    setExtras({ loading: false, streaming: false });
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
      (message: string, tool_calls: any[]) => {
        setIsRunning(false);
        setExtras({ loading: false, streaming: true });

        setMessages((currentMessages) => {
          return [
            ...currentMessages.slice(0, -1),
            getMessageFromText(currentMessages.at(-1)?.id, message, tool_calls),
          ];
        });
      }
    );
    setIsRunning(false);
    setExtras({ loading: false, streaming: false });
  };

  const onReload = async (parentId: string | null) => {
    setIsRunning(true);
    await ChatService.regenerateMessage(
      chatId,
      [],
      (message: string, tool_calls: any[]) => {
        setIsRunning(false);
        setExtras({ loading: false, streaming: true });
        setMessages((currentMessages) => {
          return [
            ...currentMessages.slice(0, -1),
            getMessageFromText(currentMessages.at(-1)?.id, message, tool_calls),
          ];
        });
      }
    );
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
