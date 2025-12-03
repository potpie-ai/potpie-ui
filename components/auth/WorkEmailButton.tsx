'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface WorkEmailButtonProps {
  onEmailSubmit: (email: string) => void;
}

export function WorkEmailButton({ onEmailSubmit }: WorkEmailButtonProps) {
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  const handleSubmit = () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid work email address');
      return;
    }
    onEmailSubmit(email);
  };

  if (!showEmailInput) {
    return (
      <button
        onClick={() => setShowEmailInput(true)}
        className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition-colors"
      >
        <svg
          className="w-5 h-5 mr-2 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span className="text-gray-700 font-medium">Continue with Work Email</span>
      </button>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center space-x-2">
        <input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
        />
        <button
          onClick={() => {
            setShowEmailInput(false);
            setEmail('');
          }}
          className="px-3 py-3 text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!email}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Continue
      </button>
    </div>
  );
}

