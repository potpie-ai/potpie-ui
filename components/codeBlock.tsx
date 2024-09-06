"use client";
import { CodeBlock } from "react-code-block";
import { themes } from "prism-react-renderer";

function MyCodeBlock({ code, language }) {
  return (
    <CodeBlock code={code} language={language} theme={themes.vsLight} >
      <CodeBlock.Code className="bg-gray-100 p-6 rounded-xl shadow-lg mt-4">
        <div className="table-row">
          <CodeBlock.LineNumber className="table-cell pr-4 text-sm text-gray-500 text-right select-none" />
          <CodeBlock.LineContent className="table-cell">
            <CodeBlock.Token />
          </CodeBlock.LineContent>
        </div>
      </CodeBlock.Code>
    </CodeBlock>
  );
}

export default MyCodeBlock;
