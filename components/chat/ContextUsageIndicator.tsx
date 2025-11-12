import React, { FC, useEffect, useState } from 'react';
import { ContextUsageResponse } from '@/lib/types/attachment';
import ChatService from '@/services/ChatService';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ContextUsageIndicatorProps {
  conversationId: string;
  className?: string;
  refreshInterval?: number; // ms
}

export const ContextUsageIndicator: FC<ContextUsageIndicatorProps> = ({
  conversationId,
  className,
  refreshInterval = 30000, // 30 seconds default
}) => {
  const [usage, setUsage] = useState<ContextUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const data = await ChatService.getContextUsage(conversationId);
        setUsage(data);
      } catch (error) {
        console.error('Error fetching context usage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, refreshInterval);
    return () => clearInterval(interval);
  }, [conversationId, refreshInterval]);

  if (loading || !usage) return null;

  const getBarColor = () => {
    if (usage.warning_level === 'critical') return 'bg-red-500';
    if (usage.warning_level === 'approaching') return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (usage.warning_level === 'critical') return 'text-red-700';
    if (usage.warning_level === 'approaching') return 'text-orange-700';
    return 'text-gray-700';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('w-full space-y-1', className)}>
            {/* Progress Bar */}
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all duration-300', getBarColor())}
                style={{ width: `${Math.min(usage.usage_percentage, 100)}%` }}
              />
            </div>

            {/* Text Info */}
            <div className={cn('flex items-center justify-between text-xs', getTextColor())}>
              <span className="font-medium">
                {usage.current_usage.total.toLocaleString()} /{' '}
                {usage.context_limit.toLocaleString()} tokens
              </span>
              <span className="font-semibold">
                {usage.usage_percentage.toFixed(1)}%
              </span>
            </div>

            {/* Warning Message */}
            {usage.warning_level !== 'none' && (
              <div className="flex items-center gap-1 text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>
                  {usage.warning_level === 'critical'
                    ? 'Context nearly full'
                    : 'Approaching context limit'}
                </span>
              </div>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <div className="font-semibold border-b pb-1">
              Context Usage Breakdown
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Conversation history:</span>
                <span className="font-mono">
                  {usage.current_usage.conversation_history.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Text attachments:</span>
                <span className="font-mono">
                  {usage.current_usage.text_attachments.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Code context:</span>
                <span className="font-mono">
                  {usage.current_usage.code_context.toLocaleString()}
                </span>
              </div>
              <div className="border-t pt-1 flex justify-between font-semibold">
                <span>Total:</span>
                <span className="font-mono">
                  {usage.current_usage.total.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="text-gray-500 pt-1 border-t">
              Model: {usage.model}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
