import React, { FC, useEffect, useState } from 'react';
import { ContextUsageResponse } from '@/lib/types/attachment';
import ChatService from '@/services/ChatService';
import { cn } from '@/lib/utils';
import { AlertTriangle, Sparkles } from 'lucide-react';
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
  refreshTrigger?: number; // Increment to trigger immediate refresh
}

// Format large numbers compactly (e.g., 31552 -> "31.6k")
const formatTokenCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};

export const ContextUsageIndicator: FC<ContextUsageIndicatorProps> = ({
  conversationId,
  className,
  refreshInterval = 30000, // 30 seconds default
  refreshTrigger = 0,
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
  }, [conversationId, refreshInterval, refreshTrigger]);

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-1 w-24 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!usage) return null;

  const percentage = usage.usage_percentage;

  const getBarGradient = () => {
    if (usage.warning_level === 'critical') {
      return 'bg-gradient-to-r from-red-400 to-red-500';
    }
    if (usage.warning_level === 'approaching') {
      return 'bg-gradient-to-r from-amber-400 to-orange-500';
    }
    if (percentage > 50) {
      return 'bg-gradient-to-r from-blue-400 to-blue-500';
    }
    return 'bg-gradient-to-r from-emerald-400 to-emerald-500';
  };

  const getTextColor = () => {
    if (usage.warning_level === 'critical') return 'text-red-600';
    if (usage.warning_level === 'approaching') return 'text-amber-600';
    return 'text-gray-500';
  };

  const getBackgroundColor = () => {
    if (usage.warning_level === 'critical') return 'bg-red-50';
    if (usage.warning_level === 'approaching') return 'bg-amber-50';
    return 'bg-gray-50';
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full cursor-default transition-colors whitespace-nowrap',
              getBackgroundColor(),
              'hover:bg-opacity-80',
              className
            )}
          >
            {/* Icon */}
            <Sparkles className={cn('w-3.5 h-3.5', getTextColor())} />

            {/* Mini Progress Bar */}
            <div className="w-16 h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  getBarGradient()
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            {/* Compact Text */}
            <span className={cn('text-xs font-medium tabular-nums', getTextColor())}>
              {formatTokenCount(usage.current_usage.total)} / {formatTokenCount(usage.context_limit)}
            </span>

            {/* Warning icon for critical/approaching */}
            {usage.warning_level !== 'none' && (
              <AlertTriangle className={cn('w-3.5 h-3.5', getTextColor())} />
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent
          side="top"
          className="w-64 p-0 overflow-hidden"
          sideOffset={8}
        >
          <div className="bg-white rounded-lg shadow-lg border">
            {/* Header */}
            <div className={cn(
              'px-3 py-2 border-b',
              usage.warning_level === 'critical' ? 'bg-red-50' :
              usage.warning_level === 'approaching' ? 'bg-amber-50' : 'bg-gray-50'
            )}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Context Window</span>
                <span className={cn(
                  'text-xs font-bold',
                  usage.warning_level === 'critical' ? 'text-red-600' :
                  usage.warning_level === 'approaching' ? 'text-amber-600' : 'text-gray-600'
                )}>
                  {percentage.toFixed(1)}% used
                </span>
              </div>

              {/* Full progress bar in tooltip */}
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', getBarGradient())}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Breakdown */}
            <div className="px-3 py-2 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Conversation</span>
                <span className="font-mono font-medium">
                  {formatTokenCount(usage.current_usage.conversation_history)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Attachments</span>
                <span className="font-mono font-medium">
                  {formatTokenCount(usage.current_usage.text_attachments)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Code context</span>
                <span className="font-mono font-medium">
                  {formatTokenCount(usage.current_usage.code_context)}
                </span>
              </div>

              <div className="pt-1.5 mt-1.5 border-t flex justify-between">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="font-mono font-bold text-gray-900">
                  {usage.current_usage.total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 bg-gray-50 border-t text-[10px] text-gray-400">
              {usage.model} • {usage.context_limit.toLocaleString()} token limit
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
