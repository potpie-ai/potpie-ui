import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the initial state type
interface ChatState {
  conversations: Array<{
    conversationId: string;
    messages: Array<{ sender: "user" | "agent"; text: string }>;
  }>;
  status: "idle" | "loading" | "active" | "error";
  currentConversationId: string | null;
}

// Define the initial state
const initialState: ChatState = {
  conversations: [],
  status: "idle",
  currentConversationId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessageToConversation: (state, action: PayloadAction<{
      chatId: string;
      message: { sender: "user" | "agent"; text: string };
    }>) => {
      const { chatId, message } = action.payload;
      const conversation = state.conversations.find(c => c.conversationId === chatId);
      if (conversation) {
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        if (message.sender === "agent" && lastMessage && lastMessage.sender === "agent") {
          // Update the last message if it's from the agent
          lastMessage.text = message.text;
        } else {
          // Add a new message
          conversation.messages.push(message);
        }
      } else {
        // Create a new conversation if it doesn't exist
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
    setChat: (state, action: PayloadAction<Partial<ChatState>>) => {
      return { ...state, ...action.payload };
    },
  }
});

export const { addMessageToConversation, removeLastMessage, setChat } = chatSlice.actions;
export default chatSlice.reducer;