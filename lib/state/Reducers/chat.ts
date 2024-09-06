import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import dayjs from "dayjs";
import axios from "@/configs/httpInterceptor";

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
  status: "active",
  currentConversationId: "",
};

export const agentRespond = createAsyncThunk<any>(
  "agentRespond",
  async (_, { getState }) => {
    const state = getState() as { chat: chatState };

    const currentConversation = state.chat.conversations.find(
      (c) => c.conversationId === state.chat.currentConversationId
    );
    const lastUserMessage = currentConversation?.messages
      .filter((message) => message.sender === "user")
      .slice(-1)[0];

    const response = await axios.post(
      `/conversations/${state.chat.currentConversationId}/message/`,
      {
        content: lastUserMessage?.text,
      }
    );

    return response.data;
  }
);

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
      action: PayloadAction<{ conversationId: string; message: Message }>
    ) => {
      const conversation = state.conversations.find(
        (conv) => conv.conversationId === action.payload.conversationId
      );

      if (
        action.payload.conversationId === "temp" &&
        conversation?.messages.length === 1
      ) {
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
        if (conversation.conversationId !== "temp") {
          conversation.conversationId = "temp";
        }

        if (action.payload.newId) {
          conversation.conversationId = action.payload.newId;
          state.currentConversationId = action.payload.newId;
        }
      }
    },
  },
  extraReducers(builder) {
    builder.addCase(agentRespond.pending, (state) => {
      state.status = "loading";
    })
    builder.addCase(agentRespond.fulfilled, (state, action) => {
      state.status = "active";
      const conversation = state.conversations.find(
        (conv) => conv.conversationId === state.currentConversationId
      );
      console.log(action.payload);  

      if (conversation) {
        conversation.messages.push({
          sender: "agent",
          text: action.payload,
        });
      }
    });
    builder.addCase(agentRespond.rejected, (state, action) => {
      console.log(action.payload);
      state.status = "error";
    })
  },
});

export default chatSlice.reducer;

export const {
  setChat,
  addConversation,
  addMessageToConversation,
  changeConversationId,
} = chatSlice.actions;
