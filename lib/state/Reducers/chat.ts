import getHeaders from "@/app/utils/headers.util";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import dayjs from "dayjs";

interface Message {
  id?: string
  text: string | any;
  sender: "user" | "agent";
  citations?: string[];
}

interface Conversation {
  conversationId: string;
  messages: Message[];
  totalMessages: number;
  start?: number;
}

interface chatState {
  repoName: string;
  branchName?: string;
  chatStep?: number;
  agentId: string;
  projectId: string;
  conversations: Conversation[];
  selectedNodes: any[]
  title: string;
  status: string;
  currentConversationId: string;
  pendingMessage: string | null;
  chatFlow: string;
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
  selectedNodes: [],
  chatFlow: "EXISTING_CHAT"
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
        totalMessages: 1,
      });
    },

    addMessageToConversation: (
      state,
      action: PayloadAction<{
        chatId: string;
        message: {
          id?: string; // Unique identifier for each message
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
        conversation.totalMessages = Math.max(
          0,
          conversation.totalMessages - 1
        );
      }
    },

    setPendingMessage: (state, action: PayloadAction<string>) => {
      state.pendingMessage = action.payload;
    },

    clearPendingMessage: (state) => {
      state.pendingMessage = null;
    },

    clearChat: (state) => {
      const { projectId, branchName, repoName, selectedNodes, title, chatFlow,agentId } = state;  
      return {
        ...initialState,
        projectId,
        branchName,
        repoName,
        selectedNodes,
        title,
        chatFlow,
        agentId
      };
    },

    setStart: (
      state,
      action: PayloadAction<{ chatId: string; start: number }>
    ) => {
      const { chatId, start } = action.payload;
      const validStart = start >= 0 ? start : 0;
      let conversation = state.conversations.find(
        (c) => c.conversationId === chatId
      );

      if (conversation) {
        conversation.start = validStart;
      } else {
        conversation = {
          conversationId: chatId,
          messages: [],
          totalMessages: 0,
          start: validStart,
        };
        state.conversations.push(conversation);
      }
    },
    addOlderMessages: (
      state,
      action: PayloadAction<{ chatId: string; messages: any[] }>
    ) => {
      const { chatId, messages } = action.payload;
      const conversation = state.conversations.find(
        (c) => c.conversationId === chatId
      );
    
      if (conversation) {
        const existingMessageIds = new Set(conversation.messages.map((msg) => msg.id));
        const formattedMessages = messages
          .filter((message) => !existingMessageIds.has(message.id)) // Filter out duplicates by ID
          .map((message) => ({
            id: message.id, 
            text: message.content,
            sender: message.type === "HUMAN" ? "user" : ("agent" as "user" | "agent"),
            citations: message.citations || [],
          }));
    
        if (formattedMessages.length > 0) {
          conversation.messages.unshift(...formattedMessages);
          conversation.totalMessages += formattedMessages.length;
        }
      }
    },    
    setTotalMessages: (
      state,
      action: PayloadAction<{ chatId: string; totalMessages: number }>
    ) => {
      const { chatId, totalMessages } = action.payload;
      const conversation = state.conversations.find(
        (c) => c.conversationId === chatId
      );
      if (conversation) {
        conversation.totalMessages = totalMessages;
      }
    },
    clearFullChat: (state) => {
      return initialState
    },
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
  setStart,
  addOlderMessages,
  setTotalMessages,
  clearFullChat
} = chatSlice.actions;
