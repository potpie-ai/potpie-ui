'use client';
 
import { useAuthContext } from '@/contexts/AuthContext';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // TODO: Turn it off later, this might not be required in future as we have more custom events
    capture_pageview: true,
  });
}
 
const PHProvider = ({ children }: { children: React.ReactNode }) => {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
};
 
export default PHProvider;