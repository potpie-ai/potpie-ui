import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

export default class ChatService {
    static async sendMessage(conversationId: string, message: string, selectedNodes: any[]) {
        const headers = await getHeaders();
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/message/`,
            {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ content: message, node_ids: selectedNodes }),
            }
        );

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedMessage = "";
        let accumulatedCitation = "";

        if (reader) {
            const { value } = await reader.read();
            if (value) {
                const chunk = decoder.decode(value);
                try {
                    const parsedChunk = JSON.parse(chunk);
                    accumulatedMessage = parsedChunk.message;
                    accumulatedCitation = parsedChunk.citations;
                    return { accumulatedMessage, accumulatedCitation };
                } catch (error) {
                    console.error("Error parsing single chunk response:", error);
                }
            }
        }

        // For streaming response
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
        const response = await axios.get(`${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/info/`, { headers });
        return response.data;
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
}
