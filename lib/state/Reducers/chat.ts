import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import dayjs from "dayjs";

interface Agent {
  id?: string;
  name?: string;
  description?: string;
}

interface TemporaryContext {
  branch: string;
  repo: string;
  projectId: string;
}

interface chatState {
  selectedNodes: any[]
  pendingMessage: string | null;
  chatFlow: string;
  title: string;
  agentId: string;
  allAgents: Agent[];
  temporaryContext: TemporaryContext;
}

const initialState: chatState = {
  agentId: "",
  title: dayjs().format("MMMM DD, YYYY") + " Untitled Chat",
  allAgents: [],
  pendingMessage: "",
  selectedNodes: [],
  chatFlow: "EXISTING_CHAT",
  temporaryContext: { branch: "", repo: "", projectId: "" }
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setChat: (state, action: PayloadAction<Partial<chatState>>) => {
      Object.assign(state, action.payload);
    },

    setPendingMessage: (state, action: PayloadAction<string>) => {
      state.pendingMessage = action.payload;
    },

    clearPendingMessage: (state) => {
      state.pendingMessage = null;
    },

    clearChat: (state) => {
      return initialState
    },
  },
});

export default chatSlice.reducer;

export const {
  setChat,
  clearChat,
  setPendingMessage,
  clearPendingMessage,
} = chatSlice.actions;
