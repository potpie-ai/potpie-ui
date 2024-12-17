import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { Visibility } from "@/lib/Constants";

export default class ChatService {
    
    static async streamMessage(
        conversationId: string, 
        message: string, 
        selectedNodes: any[],
        onMessageUpdate: (message: string, citations: string[]) => void
    ): Promise<{ message: string; citations: string[] }> {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/message/`,
                {
                    method: "POST",
                    headers: {
                        ...(await getHeaders()),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ content: message, node_ids: selectedNodes }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let currentMessage = "";
            let currentCitations: string[] = [];

            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const jsonObjects = chunk.match(/\{[^}]+\}/g) || [];

                        for (const jsonStr of jsonObjects) {
                            try {
                                const data = JSON.parse(jsonStr);
                                
                                if (data.message !== undefined) {
                                    currentMessage += data.message;
                                    onMessageUpdate(currentMessage, currentCitations);
                                }
                                
                                if (data.citations !== undefined) {
                                    currentCitations = data.citations;
                                    onMessageUpdate(currentMessage, currentCitations);
                                }
                            } catch (e) {
                                console.error("Error parsing JSON object:", e);
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
            }

            return { message: currentMessage, citations: currentCitations };
            
        } catch (error) {
            console.error("Error in streamMessage:", error);
            throw error;
        }
    }
    
    static async loadMessages(conversationId: string, start: number, limit: number) {
        const headers = await getHeaders();
        const response = await axios.get(`${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/messages/`, {
            headers,
            params: { start, limit },
        });

        return response.data.map((message: { id: any; content: any; type: string; citations: any }) => ({
            id: message.id,
            text: message.content,
            sender: message.type === "HUMAN" ? "user" : "agent",
            citations: message.citations || [],
        }));
    }

    static async loadConversationInfo(conversationId: string) {
        const headers = await getHeaders();
        
        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/info/`, 
                { headers }
            );
            return response.data;
        } catch (error: any) {
            if (error.response) {
                const { status, data } = error.response;
                
                if (status === 404) {
                    return {
                        type: "error",
                        status,
                        message: "Conversation not found",
                        description: "The conversation does not exist or has been deleted."
                    };
                } else if (status === 401) {
                    return {
                        type: "error",
                        status,
                        message: "Unauthorized",
                        description: "You do not have permission to access this conversation."
                    };
                } else if (status === 500) {
                    return {
                        type: "error",
                        status,
                        message: "Server Error",
                        description: "There was a problem with the server. Please try again later."
                    };
                }
                
                return {
                    type: "error",
                    status,
                    message: "error",
                    description: data?.message ?? "Failed to load conversation info"
                };
            } else {
                return {
                    type: "error",
                    status: 500,
                    message: "Network Error",
                    description: "Failed to load conversation due to network or server issues."
                };
            }
        }
    }

    static async regenerateMessage(conversationId: string, selectedNodes: any[]) {
        const headers = await getHeaders();

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/regenerate/`,
                {
                    method: "POST",
                    headers: {
                        ...headers,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ node_ids: selectedNodes }), // Only send node_ids
                }
            );

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedMessage = "";
            let accumulatedCitation = "";

            while (true) {
                const { done, value } = (await reader?.read()) || { done: true, value: undefined };
                if (done) break;

                const chunk = decoder.decode(value);
                try {
                    const parsedChunks = chunk
                        .split("}")
                        .filter(Boolean)
                        .map((c) => JSON.parse(c + "}"));

                    for (const parsedChunk of parsedChunks) {
                        accumulatedMessage += parsedChunk.message;
                        accumulatedCitation = parsedChunk.citations;
                    }
                } catch (error) {
                    // Handle parsing error
                }
            }

            return { accumulatedMessage, accumulatedCitation };
        } catch (err) {
            throw new Error("Unable to regenerate message");
        }
    }

    static async createConversation(
        userId: string,
        title: string,
        projectId: string | null,
        agentId: string
    ) {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL;
        try {
            const response = await axios.post(
                `${baseUrl}/api/v1/conversations/`,
                {
                    user_id: userId,
                    title: title,
                    status: "active",
                    project_ids: [projectId],
                    agent_ids: [agentId],
                },
                { headers: headers }
            );
            return response.data;
        } catch (error) {
            throw new Error("Error creating conversation");
        }
    }

    static async getAllChats() {
        const headers = await getHeaders();
        const response = await axios.get(`${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/user/conversations`, {
            params: {
                start: 0,
                limit: 1000,
            },
            headers: headers,
        });
        return response.data.reverse();
    }

    static async renameChat(conversationId: string, title: string) {
        const headers = await getHeaders();
        const response = await axios.patch(
            `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/rename/`,
            {
                title: title,
            },
            { headers: headers }
        );
        return response.data;
    }

    static async deleteChat(conversationId: string) {
        const headers = await getHeaders();
        const response = await axios.delete(`${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/`, {
            headers,
        });
        return response.data;
    }

    static async shareConversation(conversationId: string, recipientEmails: string[], visibility: Visibility) {
        const headers = await getHeaders();
        const payload: any = {
            conversation_id: conversationId,
            visibility: visibility,
        };
        try {
            if (visibility === Visibility.PRIVATE) {
                const filteredEmails = recipientEmails.filter(email => email.trim() !== "");
                payload.recipientEmails = filteredEmails.length > 0 ? filteredEmails : null; // Set to undefined if empty
            }
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/share`,
                payload,
                { headers }
            );

            return response.data;
        } catch (error: any) {
            if (error.response) {
                if (error.response.data && error.response.data.detail) {
                    return {
                        type: "error",
                        message: error.response.data.detail,
                    };
                }
            }

            return {
                type: "error",
                message: "Unable to share the conversation.",
            };
        }
    }
    static async getChatAccess(conversationId: string) {
        const headers = await getHeaders();
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/shared-emails`,
            { headers }
          );
          return response;
        } catch (error: any) {
          if (error.response) {
            return {
              type: "error",
              message: error.response.data.detail || "Unable to fetch access list.",
            };
          }
    
          return {
            type: "error",
            message: "Network error while fetching access list.",
          };
        }
      }

}
