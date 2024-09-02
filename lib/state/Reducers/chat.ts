import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  messages: Message[];
}
interface chatState {
  repoName: string;
  branchName?: string;
  chatStep?: number;
  agentId?: string;
  conversations: Conversation[];
}

const initialState: chatState = {
  repoName: "",
  branchName: "",
  chatStep: 1,
  agentId: "",
  conversations: [],
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setChat: (state, action: PayloadAction<Partial<chatState>>) => {
      Object.assign(state, action.payload);
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      state.conversations.push(action.payload);
    },
    addMessageToConversation: (
      state,
      action: PayloadAction<{ conversationId: string; message: Message }>
    ) => {
      const conversation = state.conversations.find(
        (conv) => conv.id === action.payload.conversationId
      );
      if (conversation) {
        conversation.messages.push(action.payload.message);
      }
    },
  },
});

export default chatSlice.reducer;

export const { setChat, addConversation, addMessageToConversation } =
  chatSlice.actions;
