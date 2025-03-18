"use client";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LucideCopy, LucideCopyCheck } from "lucide-react";

interface MyCodeBlockProps {
  code: string;
  language: string;
}

function MyCodeBlock({ code, language }: MyCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-gray-100 rounded-lg shadow-lg mt-4">
      <div className="flex justify-between items-center bg-gray-300 px-4 py-1 rounded-t-lg">
        <span className="text-sm font-semibold text-gray-800">{language}</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="text-xs font-semibold px-2 py-1 rounded text-gray-800"
        >
          {copied ? <div className="flex gap-2 items-center"> <LucideCopyCheck className="size-4"/> Copied! </div> : <div className="flex gap-2 items-center"> <LucideCopy className="size-4"/> Copy</div>}
        </Button>
      </div>
      <SyntaxHighlighter 
        language={language.toLowerCase()}
        style={oneLight}
        customStyle={{
          backgroundColor: 'hsl(var(--muted))',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, "Liberation Mono", Consolas, monospace',
          fontFeatureSettings: 'normal',
          fontSize: '0.8rem',
          fontVariationSettings: 'normal',
          fontWeight: '500',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default MyCodeBlock;
