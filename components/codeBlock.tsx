"use client";
import { CodeBlock } from "react-code-block";
import { themes } from "prism-react-renderer";
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
    <div className="relative bg-gray-100 rounded-lg shadow-lg">
      <div className="flex justify-between items-center bg-gray-300 px-4 py-1 rounded-t-lg">
        <span className="text-sm   font-semibold text-gray-800">{language}</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="text-xs font-semibold px-2 py-1 rounded text-gray-800"
        >
          {copied ? <div className="flex gap-2 items-center"> <LucideCopyCheck className="size-4"/> Copied! </div> : <div className="flex gap-2 items-center"> <LucideCopy className="size-4"/> Copy</div>}
        </Button>
      </div>
      <CodeBlock code={code} language={language} theme={themes.vsLight}>
        <CodeBlock.Code className="bg-gray-100 p-6 rounded-b-lg overflow-x-auto">
          <div className="table-row">
            {/* <CodeBlock.LineNumber className="table-cell pr-4 text-sm text-border text-right select-none" /> */}
            <CodeBlock.LineContent className="table-cell">
                <CodeBlock.Token />
            </CodeBlock.LineContent>
          </div>
        </CodeBlock.Code>
      </CodeBlock>
    </div>
  );
}

export default MyCodeBlock;
