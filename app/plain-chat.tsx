"use client";

import { useEffect } from "react";

export default function PlainChatProvider() {
    useEffect(() => {
        if (document.getElementById("plain-chat-script")) return;

        const style = document.createElement("style");
        style.id = "plain-chat-light-mode";
        style.textContent = `
            [data-plain-chat],
            [data-plain-chat] *,
            .plain-chat-container,
            .plain-chat-container * {
                --plain-background: #ffffff !important;
                --plain-surface: #f9fafb !important;
                --plain-text-primary: #111827 !important;
                --plain-text-secondary: #6b7280 !important;
                --plain-border: #e5e7eb !important;
                --plain-input-bg: #ffffff !important;
                --plain-message-bg-user: #f3f4f6 !important;
                --plain-message-bg-agent: #ffffff !important;
                background-color: var(--plain-background) !important;
                color: var(--plain-text-primary) !important;
            }

            [data-plain-chat-window],
            .plain-chat-window {
                background: #ffffff !important;
                border: 1px solid #e5e7eb !important;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
            }
            
            [data-plain-chat] input,
            [data-plain-chat] textarea {
                background-color: #ffffff !important;
                color: #111827 !important;
                border-color: #e5e7eb !important;
            }
            
            [data-plain-chat] [data-message] {
                background-color: #f9fafb !important;
                color: #111827 !important;
            }
        `;
        document.head.appendChild(style);

        (function (d) {
            const script = d.createElement("script");
            script.id = "plain-chat-script";
            script.async = false;
            script.onload = function () {
                // @ts-ignore
                if (window.Plain) {
                    // @ts-ignore
                    window.Plain.init({
                        appId: "liveChatApp_01KHRDQSB5WJHKCW4ZE3GFH7K5",
                        hideLauncher: true,
                        theme: 'light',
                        links: [
                            {
                                icon: 'book',
                                text: 'Documentation',
                                url: 'https://docs.potpie.ai/introduction',
                            },
                            {
                                icon: 'link',
                                text: 'Open Source',
                                url: 'https://github.com/potpie-ai/potpie',
                            },
                            {
                                icon: 'discord',
                                text: 'Join our Discord',
                                url: 'https://discord.gg/ryk5CMD5v6',
                            },
                        ],
                    });
                }
            };
            script.src = "https://chat.cdn-plain.com/index.js";
            d.getElementsByTagName("head")[0].appendChild(script);
        })(document);
    }, []);

    return null;
}
