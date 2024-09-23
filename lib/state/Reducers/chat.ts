import getHeaders from "@/app/utils/headers.util";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import dayjs from "dayjs";

interface Message {
  text: string | any;
  sender: "user" | "agent";
}

interface Conversation {
  conversationId: string;
  messages: Message[];
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
  pendingMessage: string | null ;
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
      });
    },

    addMessageToConversation: (
      state,
      action: PayloadAction<{
        chatId: string;
        message: { sender: "user" | "agent"; text: string };
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
        });
      }
    },
    removeLastMessage: (state, action: PayloadAction<{ chatId: string }>) => {
      const { chatId } = action.payload;
      const conversation = state.conversations.find(c => c.conversationId === chatId);
      if (conversation && conversation.messages.length > 0) {
        conversation.messages.pop();
      }
    },
    setPendingMessage: (state, action: PayloadAction<string>) => {
      state.pendingMessage = action.payload;
    },
    clearPendingMessage: (state) => {
      state.pendingMessage = null;
    },
    clearChat: (state) => {
      return initialState;
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
  setPendingMessage, clearPendingMessage
} = chatSlice.actions;
