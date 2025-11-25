"use client";

import { memo } from "react";
import type { TextMessagePartComponent } from "@assistant-ui/react";

import { SharedMarkdown } from "@/components/chat/SharedMarkdown";

const MarkdownTextImpl: TextMessagePartComponent = ({ text }) => (
  <SharedMarkdown content={text ?? ""} />
);

export const MarkdownText = memo(MarkdownTextImpl);
