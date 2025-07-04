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
  const content: any[] = [
    {
      type: "text",
      text: message.text,
    },
  ];

  // Process attachments if they exist
  if (message.has_attachments && message.attachments && message.attachments.length > 0) {
    const imageAttachments = message.attachments.filter(
      (attachment: any) => attachment.attachment_type === "image"
    );
    
    // Add image content for each image attachment
    imageAttachments.forEach((attachment: any) => {
      // Use the signed download URL provided by the API
      if (attachment.download_url) {
        content.push({
          type: "image",
          image: attachment.download_url,
        });
      }
    });
  }

  return {
    id: message.id,
    role: message.sender == "user" ? "user" : "assistant",
    content,
  };
};

export function PotpieRuntime(chatId: string) {
  const [isRunning, setIsRunning] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [extras, setExtras] = useState({
    loading: true,
    streaming: false,
    error: false,
  });

  const initarray: ThreadMessageLike[] = [];
  const [messages, setMessages] = useState(initarray);
  const { pendingMessage } = useSelector((state: RootState) => state.chat);
  const dispatch: AppDispatch = useDispatch();

  const loadMessages = async () => {
    try {
      if (messagesLoaded) return;
      if (!chatId) return;

      setExtras({ loading: true, streaming: false, error: false });

      const res = await ChatService.loadMessages(chatId, 0, 1000);

      setMessages(res.map((msg: any) => convertToThreadMessage(msg)));

      setMessagesLoaded(true);
      setExtras({ loading: false, streaming: false, error: false });

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
      [], // No images for this function
      (message: string, tool_calls: any[]) => {
        setIsRunning(false);
        setExtras({ loading: false, streaming: true, error: false });

        setMessages((currentMessages) => {
          return [
            ...currentMessages.slice(0, -1),
            getMessageFromText(currentMessages.at(-1)?.id, message, tool_calls),
          ];
        });
      }
    );
    setIsRunning(false);
    setExtras({ loading: false, streaming: false, error: false });
  };

  const onNew = async (message: AppendMessage) => {
    // Extract text content
    const textContent = message.content.find(c => c.type === "text");
    if (!textContent) {
      throw new Error("Message must contain text content");
    }

    // Get images from run config
    const images: File[] = (message.runConfig?.custom?.images as File[]) || [];
    
    // Create image content for display purposes
    const imageContent = images.map(image => ({
      type: "image" as const,
      image: URL.createObjectURL(image)
    }));

    // Create user message with both text and images
    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [
        { type: "text", text: textContent.text },
        ...imageContent
      ],
    };
    setIsRunning(true);
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    setMessages((currentMessages) => {
      return [...currentMessages, getMessageFromText(undefined, "")];
    });
    try {
      await ChatService.streamMessage(
        chatId,
        textContent.text,
        (message.runConfig?.custom?.selectedNodes as any[]) || [],
        images, // Pass images to the service
        (message: string, tool_calls: any[]) => {
          setIsRunning(false);
          setExtras({ loading: false, streaming: true, error: false });

          setMessages((currentMessages) => {
            return [
              ...currentMessages.slice(0, -1),
              getMessageFromText(
                currentMessages.at(-1)?.id,
                message,
                tool_calls
              ),
            ];
          });
        }
      );
    } catch (error) {
      setIsRunning(false);
      setExtras({
        loading: false,
        streaming: false,
        error: true,
      });
      console.error("Error streaming message:", error);
      return;
    }
    setIsRunning(false);
    setExtras({ loading: false, streaming: false, error: false });
  };

  const onReload = async (parentId: string | null) => {
    setIsRunning(true);
    try {
      await ChatService.regenerateMessage(
        chatId,
        [],
        (message: string, tool_calls: any[]) => {
          setIsRunning(false);
          setExtras({ loading: false, streaming: true, error: false });
          setMessages((currentMessages) => {
            return [
              ...currentMessages.slice(0, -1),
              getMessageFromText(
                currentMessages.at(-1)?.id,
                message,
                tool_calls
              ),
            ];
          });
        }
      );
    } catch (error) {
      setIsRunning(false);
      setExtras({
        loading: false,
        streaming: false,
        error: true,
      });
      console.error("Error streaming message:", error);
      return;
    }
    setIsRunning(false);
    setExtras({ loading: false, streaming: false, error: false });
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
