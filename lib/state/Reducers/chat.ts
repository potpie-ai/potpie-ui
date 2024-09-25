import getHeaders from "@/app/utils/headers.util";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import dayjs from "dayjs";

interface Message {
  text: string | any;
  sender: "user" | "agent";
  citations?: string[];
}

interface Conversation {
  conversationId: string;
  messages: Message[];
  totalMessages: number;
  start?:number;
}

interface chatState {
  repoName: string;
  branchName?: string;
  chatStep?: number;
  agentId: string;
  projectId: string;
  conversations: Conversation[];
  title: string;
  status: string;
  currentConversationId: string;
  pendingMessage: string | null;
}

const initialState: chatState = {
  repoName: "",
  branchName: "",
  chatStep: 1,
  agentId: "",
  projectId: "",
  conversations: [],
  title: dayjs().format("MMMM DD, YYYY") + " Untitled",
  status: "loading",
  currentConversationId: "",
  pendingMessage: "",
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setChat: (state, action: PayloadAction<Partial<chatState>>) => {
      Object.assign(state, action.payload);
    },
    addConversation: (
      state,
      action: PayloadAction<{ id: string; messages: Message[] }>
    ) => {
      state.conversations.push({
        conversationId: action.payload.id,
        messages: action.payload.messages,
        totalMessages: action.payload.messages.length,
      });
    },

    addMessageToConversation: (
      state,
      action: PayloadAction<{
        chatId: string;
        message: {
          sender: "user" | "agent";
          text: string;
          citations?: string[];
        };
      }>
    ) => {
      const { chatId, message } = action.payload;
      const conversation = state.conversations.find(
        (c) => c.conversationId === chatId
      );

      if (conversation) {
        const lastMessage =
          conversation.messages[conversation.messages.length - 1];

        if (
          message.sender === "agent" &&
          lastMessage &&
          lastMessage.sender === "agent"
        ) {
          lastMessage.text = message.text;
        } else {
          conversation.messages.push(message);
          conversation.totalMessages += 1;
        }
      } else {
        state.conversations.push({
          conversationId: chatId,
          messages: [message],
          totalMessages: 1,
        });
      }
    },

    removeLastMessage: (state, action: PayloadAction<{ chatId: string }>) => {
      const { chatId } = action.payload;
      const conversation = state.conversations.find(
        (c) => c.conversationId === chatId
      );
      if (conversation && conversation.messages.length > 0) {
        conversation.messages.pop();
        conversation.totalMessages = Math.max(0, conversation.totalMessages - 1);
      }
    },

    setPendingMessage: (state, action: PayloadAction<string>) => {
      state.pendingMessage = action.payload;
    },

    clearPendingMessage: (state) => {
      state.pendingMessage = null;
    },

    clearChat: (state) => {
      const { projectId, branchName, repoName } = state;
      return {
        ...initialState,
        projectId,
        branchName,
        repoName,
      };
    },

    setStart: (
      state,
      action: PayloadAction<{ chatId: string; start: number }>
    ) => {
      const { chatId, start } = action.payload;
      const conversation = state.conversations.find(
        (c) => c.conversationId === chatId
      );
      if (conversation && start >= 0) {
        conversation.start = start;
      }
    },
    addOlderMessages: (state, action: PayloadAction<{ chatId: string; messages: any[] }>) => {
      const { chatId, messages } = action.payload;
      const conversation = state.conversations.find(
        (c) => c.conversationId === chatId
      );
      
      if (conversation) {
        const formattedMessages = messages.map((message) => ({
          text: message.content,
          sender: message.type === "HUMAN" ? "user" : "agent" as "user" | "agent",  // Explicitly typing the sender
          citations: message.citations || [],
        }));
    
        conversation.messages.unshift(...formattedMessages);
        conversation.totalMessages += formattedMessages.length;
      }
    }
  },
});

export default chatSlice.reducer;

export const {
  setChat,
  addConversation,
  addMessageToConversation,
  clearChat,
  removeLastMessage,
  setPendingMessage,
  clearPendingMessage,
  setStart,addOlderMessages   
} = chatSlice.actions;
