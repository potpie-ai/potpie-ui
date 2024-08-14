import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clipboardCopy from 'clipboard-copy';

interface MarkdownEditorProps {
  codeString: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ codeString }) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCopy = () => {
    clipboardCopy(codeString)
      .then(() => setIsCopied(true))
      .catch(() => setIsCopied(false))
      .finally(() => {
        setTimeout(() => setIsCopied(false), 2000); 
      });
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
      <button
        onClick={handleCopy}
        style={{ marginBottom: '10px', padding: '8px 16px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        {isCopied ? 'Copied!' : 'Copy'}
      </button>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {codeString}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownEditor;
