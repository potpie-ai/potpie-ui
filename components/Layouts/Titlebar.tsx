import { usePathname } from 'next/navigation';
import React from 'react';

const Titlebar = () => {
  const pathname = usePathname();

  const pageTitle = pathname.split('/').pop() ? pathname.split('/').pop() : '';

  const titleMapping = {
    'account': 'Account Settings',
    'all-chats': 'All Chats',
    'key-management': 'Key Management',
    'newchat': 'New Chat',
    'repositories': 'Repositories',
  };

  // @ts-ignore
  const displayTitle = titleMapping[pageTitle] || pageTitle;

  if (!displayTitle) return null;

  return (
    <div className="w-full border-b border-gray-200 bg-background shadow-sm ">
      <div className="max-w-screen-xl mx-auto py-2 px-6">
        <h1 className="text-2xl font-bold text-gray-800 capitalize tracking-wide">
          {displayTitle}
        </h1>
      </div>
    </div>
  );
};

export default Titlebar;
