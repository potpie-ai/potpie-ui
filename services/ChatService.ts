import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { Visibility } from "@/lib/Constants";

export default class ChatService {
    
    // Method for creating a chat with a shared agent
    static async createChat(params: { agent_id: string; repo_id: number; branch_id: string | number }) {
        const headers = await getHeaders();
        const baseUrl = process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL;
        try {
            console.log("Creating chat with params:", params);
            
            // Prepare the request body
            const requestBody: any = {
                agent_id: params.agent_id,
                repo_id: params.repo_id
            };
            
            // Add branch_id if it's a number, otherwise use branch_name
            if (typeof params.branch_id === 'number') {
                requestBody.branch_id = params.branch_id;
            } else {
                requestBody.branch_name = params.branch_id;
            }
            
            const response = await axios.post(
                `${baseUrl}/api/v1/conversations/`,
                requestBody,
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error("Error creating chat:", error);
            throw new Error("Failed to create chat with the shared agent");
        }
    }
    
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
            let buffer = '';

            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        buffer += chunk;

                        while (true) {
                            const openBraceIndex = buffer.indexOf('{');
                            if (openBraceIndex === -1) break;

                            let depth = 0;
                            let jsonEndIndex = -1;

                            for (let i = openBraceIndex; i < buffer.length; i++) {
                                if (buffer[i] === '{') depth++;
                                if (buffer[i] === '}') depth--;
                                if (depth === 0) {
                                    jsonEndIndex = i + 1;
                                    break;
                                }
                            }

                            if (jsonEndIndex === -1) break;

                            const jsonStr = buffer.substring(openBraceIndex, jsonEndIndex);
                            buffer = buffer.substring(jsonEndIndex);

                            try {
                                const data = JSON.parse(jsonStr);
                                if (data.message !== undefined) {
                                    const messageWithEmojis = data.message.replace(/\\u[\dA-F]{4}/gi, 
                                        (match: string) => String.fromCodePoint(parseInt(match.replace(/\\u/g, ''), 16))
                                    );
                                    for (const char of messageWithEmojis) {
                                        currentMessage += char;
                                        onMessageUpdate(currentMessage, currentCitations);
                                        await new Promise(resolve => setTimeout(resolve, 10));
                                    }
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
    static async regenerateMessage(
        conversationId: string,
        selectedNodes: any[],
        onMessageUpdate: (message: string, citations: string[]) => void
    ): Promise<{ message: string; citations: string[] }> {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/regenerate/`,
                {
                    method: "POST",
                    headers: {
                        ...(await getHeaders()),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ node_ids: selectedNodes }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let currentMessage = "";
            let currentCitations: string[] = [];

            let buffer = '';
            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        buffer += chunk;

                        // Try to extract complete JSON objects from the buffer
                        while (true) {
                            const openBraceIndex = buffer.indexOf('{');
                            if (openBraceIndex === -1) break;

                            let depth = 0;
                            let jsonEndIndex = -1;

                            // Find the matching closing brace
                            for (let i = openBraceIndex; i < buffer.length; i++) {
                                if (buffer[i] === '{') depth++;
                                if (buffer[i] === '}') depth--;
                                if (depth === 0) {
                                    jsonEndIndex = i + 1;
                                    break;
                                }
                            }

                            // If we didn't find a complete JSON object, break and wait for more data
                            if (jsonEndIndex === -1) break;

                            const jsonStr = buffer.substring(openBraceIndex, jsonEndIndex);
                            buffer = buffer.substring(jsonEndIndex);

                            try {
                                const data = JSON.parse(jsonStr);
                                
                                if (data.message !== undefined) {
                                    const messageWithEmojis = data.message.replace(/\\u[\dA-F]{4}/gi, 
                                        (match: string) => String.fromCodePoint(parseInt(match.replace(/\\u/g, ''), 16))
                                    );
                                    currentMessage += messageWithEmojis;
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
            console.error("Error in regenerateMessage:", error);
            throw error;
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
