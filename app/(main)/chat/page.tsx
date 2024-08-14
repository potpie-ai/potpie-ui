"use client";
import React, { FormEvent, useEffect, useState, KeyboardEvent, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { marked } from 'marked';
import { Send, SendHorizonal } from "lucide-react"
import MarkdownEditor from '@/components/ui/markdown-editor';

interface ChatItem {
    message: string;
    time: string;
    isResponse: boolean;
    isDataSourceSelected?: boolean;
}

const HunderpointsChatComponent = () => {
    const getCurrentTimeFormatted = () => {
        const now = new Date();
        const hours = now.getHours() % 12 || 12;
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
        return `${hours}:${minutes} ${ampm}`;
    };

    const [chat, setChat] = useState<ChatItem[]>([
        { message: 'Welcome! How can I assist you today?', time: getCurrentTimeFormatted(), isResponse: true }
    ]);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<number | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const sampleCode = `
# Sample Code

\`\`\`javascript
function helloWorld() {
  console.log('Hello, world!');
}
\`\`\`
`;


    // Method to scroll to the bottom of the chat window
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            // Only scroll if the user is already at the bottom
            if (isScrollAtBottom()) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }
    };

    // Method to check if the user is scrolled to the bottom
    const isScrollAtBottom = (): boolean => {
        const threshold = 50;
        if (chatContainerRef.current) {
            const position = chatContainerRef.current.scrollTop + chatContainerRef.current.clientHeight;
            const height = chatContainerRef.current.scrollHeight;
            return position >= height - threshold;
        }
        return false;
    };



    // Adjust the autoResize method
    const autoResize = (event: React.FormEvent<HTMLTextAreaElement>): void => {
        const textarea = event.currentTarget;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    };


    // Adjust the handleKeydown method
    const handleKeydown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        const textarea = event.currentTarget;

        if (event.key === 'Enter') {
            if (event.shiftKey || loading) {
                // Shift + Enter: Increase height of the textarea
                event.preventDefault();
                textarea.value += '\n';
                autoResize({ currentTarget: textarea } as React.FormEvent<HTMLTextAreaElement>);
            } else {
                // Enter: Submit the text
                event.preventDefault();
                textarea.value = ''; // Clear the textarea after submission
                textarea.style.height = 'auto'; // Reset the height
                sendPrompt();
            }
        }
    };


    // Handle sending prompt
    const sendPrompt = (message: string | null = null, isSelfResponseRender: boolean = true) => {
        const currentPrompt = (message || prompt).trim();
        if (currentPrompt) {
            //setLoading(true);
            setPrompt('');

            if (isSelfResponseRender) {
                setChat(prevChat => [
                    ...prevChat,
                    { message: currentPrompt, time: getCurrentTimeFormatted(), isResponse: false }
                ]);
                scrollToBottom();
            }

            if (conversationId) {
                axios.post('/your-api-endpoint-for-sending-prompt', { conversation_id: conversationId, message: currentPrompt })
                    .then(response => {
                        renderResponse(response.data.response);
                    })
                    .catch(() => {
                        renderResponse('Error sending prompt. Please try again.');
                    });
            }
        }
    };

    const renderResponse = (response: string, isDataSourceSelected: boolean = false) => {
        const formattedResponse = marked.parse(response) as string;

        // Update the state with the new chat item
        setChat(prevChat => [
            ...prevChat,
            { message: formattedResponse, time: getCurrentTimeFormatted(), isResponse: true, isDataSourceSelected }
        ]);
        setLoading(false);
        scrollToBottom();
    };

    useEffect(() => {
        // Scroll to the bottom when the component mounts or chat updates
        scrollToBottom();
    }, [chat]);

    return (
        <div>
            <div className="fixed top-0 left-0 h-full w-64 bg-gray-800 text-white shadow-lg z-6 flex">
                <div className="p-4 mt-20">
                    <h1 className="text-xl font-semibold">Conversations</h1>
                    <ul className="mt-4 space-y-2">
                        <li className="p-2 hover:bg-gray-700 rounded cursor-pointer">o Debug my code</li>
                        <li className="p-2 hover:bg-gray-700 rounded cursor-pointer">o What's wrong with the current implementation</li>
                        <li className="p-2 hover:bg-gray-700 rounded cursor-pointer">o Test my code</li>
                    </ul>
                </div>
            </div>
            <div className="md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem] m-auto mb-20" ref={chatContainerRef}>
                {chat.map((item, index) => (
                    <React.Fragment key={index}>
                        {!item.isResponse && (
                            <div className="flex flex-col items-end justify-end mb-2">
                                <div className="relative max-w-[70%] rounded-3xl bg-gray-200 text-gray-900 p-3 rounded-tr-lg break-words">
                                    <p className="whitespace-pre-line">{item.message}</p>
                                </div>
                                <div className="mr-3 text-right">
                                    <span className="text-xs text-gray-500">{item.time}</span>
                                </div>
                            </div>
                        )}

                        {item.isResponse && (
                            <div className="flex items-start mb-4">
                                <div className="flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-teal-500 flex items-center justify-center text-white text-lg">
                                        <span>H</span>
                                    </div>
                                </div>
                                <div className="ml-3 w-full">
                                    <div className="text-gray-950 break-words" dangerouslySetInnerHTML={{ __html: item.message }} />
                                    <span className="text-xs text-gray-500 mb-2 inline-block">{item.time}</span>
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                ))}

                {loading === null && (
                    <div className="flex items-start mb-2">
                        <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-teal-500 flex items-center justify-center text-white text-lg">
                                <span>P</span>
                            </div>
                        </div>
                        <div className="ml-3 mt-2">
                            <div className="animate-ping rounded-full w-2 h-2 bg-teal-500"></div>
                        </div>
                    </div>
                )}
            </div>
            <div className="fixed bottom-0 left-0 right-0 p-4 pt-0 bg-gray-50">
                <div className="md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem] mx-auto bg-gray-200 rounded-3xl p-1 flex items-center">
                    <textarea
                        className="resize-none w-full bg-transparent min-h-10 max-h-52 border-none text-sm focus:ring-0 pt-2 pl-4"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Message Hunderpoints"
                        onKeyDown={handleKeydown}
                        onInput={autoResize} // Ensure textarea resizes on input
                    />
                    <button
                        className={`ml-2 h-9 w-9 bg-teal-500 rounded-full flex items-center justify-center text-white ${loading ? 'cursor-not-allowed opacity-60' : ''}`}
                        disabled={loading}
                        onClick={() => sendPrompt()}
                    >
                        <SendHorizonal></SendHorizonal>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HunderpointsChatComponent;
