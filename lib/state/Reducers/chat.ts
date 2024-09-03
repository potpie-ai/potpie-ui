import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import dayjs from "dayjs";

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: string;
}

interface Conversation {
  conversationId: string; // Changed from 'id' to 'conversationId' for clarity
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
  status: "active",
  currentConversationId: "",
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setChat: (state, action: PayloadAction<Partial<chatState>>) => {
      Object.assign(state, action.payload);
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const newConversation = {
        conversationId: action.payload.conversationId,
        messages: action.payload.messages,
      };

      state.conversations.push(newConversation);
    },
    addMessageToConversation: (
      state,
      action: PayloadAction<{ conversationId: string; message: Message }>
    ) => {
      const conversation = state.conversations.find(
        (conv) => conv.conversationId === action.payload.conversationId
      );
      if (conversation) {
        conversation.messages.push(action.payload.message);
      }
    },
    changeConversationId: (
      state,
      action: PayloadAction<{ oldId: string; newId: string }>
    ) => {
      const conversation = state.conversations.find(
        (conv) => conv.conversationId === action.payload.oldId
      );
      if (conversation) {
        conversation.conversationId = action.payload.newId;
      }
    },
  },
});

export default chatSlice.reducer;

export const {
  setChat,
  addConversation,
  addMessageToConversation,
  changeConversationId,
} = chatSlice.actions;
