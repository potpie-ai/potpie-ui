import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import dayjs from "dayjs";
import { SessionInfo } from "@/lib/types/session";

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
  // New session fields
  backgroundTaskActive: boolean;
  sessionResuming: boolean;
  activeSessionId?: string;
  lastKnownSessionStatus?: SessionInfo;
}

const initialState: chatState = {
  agentId: "",
  title: dayjs().format("MMMM DD, YYYY") + " Untitled Chat",
  allAgents: [],
  pendingMessage: "",
  selectedNodes: [],
  chatFlow: "EXISTING_CHAT",
  temporaryContext: { branch: "", repo: "", projectId: "" },
  // New session fields
  backgroundTaskActive: false,
  sessionResuming: false,
  activeSessionId: undefined,
  lastKnownSessionStatus: undefined
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

    setBackgroundTaskActive: (state, action: PayloadAction<boolean>) => {
      state.backgroundTaskActive = action.payload;
    },

    setSessionResuming: (state, action: PayloadAction<boolean>) => {
      state.sessionResuming = action.payload;
    },

    setActiveSession: (state, action: PayloadAction<SessionInfo | null>) => {
      if (action.payload) {
        state.activeSessionId = action.payload.sessionId;
        state.lastKnownSessionStatus = action.payload;
      } else {
        state.activeSessionId = undefined;
        state.lastKnownSessionStatus = undefined;
      }
    },
  },
});

export default chatSlice.reducer;

export const {
  setChat,
  clearChat,
  setPendingMessage,
  clearPendingMessage,
  setBackgroundTaskActive,
  setSessionResuming,
  setActiveSession,
} = chatSlice.actions;
