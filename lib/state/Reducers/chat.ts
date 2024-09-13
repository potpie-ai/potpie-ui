import getHeaders from "@/app/utils/headers.util";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import dayjs from "dayjs";

interface Message {
  text: string;
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
      action: PayloadAction<{ chatId: string; message: Message }>
    ) => {
      const conversation = state.conversations.find(
        (conv) => conv.conversationId === action.payload.chatId
      );
      if (conversation) conversation.messages.push(action.payload.message);
      else
        state.conversations.push({
          conversationId: action.payload.chatId,
          messages: [action.payload.message],
        });
    },
    removeLastMessage:  (
      state,
      action: PayloadAction<{ chatId: string; }>
    ) => {
      const conversation = state.conversations.find(
        (conv) => conv.conversationId === action.payload.chatId
      );
      if (conversation) conversation.messages.pop();
      state.status = "loading";
    },
    clearChat: (state) => {
      return initialState;
    },
  },
});

export default chatSlice.reducer;

export const { setChat, addConversation, addMessageToConversation, clearChat,removeLastMessage } =
  chatSlice.actions;
