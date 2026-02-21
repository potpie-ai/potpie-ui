import React from 'react';
import { CheckCircle, Loader, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ParsingStatusEnum } from '@/lib/Constants';

const BRAND_GREEN = 'text-[#B6E343]';

interface ParsingProgressProps {
  status: string;
  projectId?: string;
  onRetry?: () => void;
}

const ParsingProgress: React.FC<ParsingProgressProps> = ({ 
  status, 
  projectId,
  onRetry 
}) => {
  // Format status for display - capitalize first letter
  const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
  
  if (status === ParsingStatusEnum.READY) {
    return (
      <div className="flex justify-start items-center gap-3 mt-2">
        <CheckCircle className={cn('h-4 w-4', BRAND_GREEN)} />
        <span className={BRAND_GREEN}>{displayStatus}</span>
      </div>
    );
  }
  
  if (status === ParsingStatusEnum.ERROR) {
    return (
      <div className="flex justify-between items-center gap-3 mt-2">
        <div className="flex items-center gap-3">
          <XCircle className="text-red-600 h-4 w-4" />
          <span className="text-red-600">{displayStatus}</span>
        </div>
        {onRetry && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onRetry}
          >
            Retry
          </Button>
        )}
      </div>
    );
  }
  
  // For in-progress statuses (use brand green #B6E343 for progress)
  if (status === ParsingStatusEnum.SUBMITTED ||
      status === ParsingStatusEnum.CLONED ||
      status === ParsingStatusEnum.PARSED ||
      status === ParsingStatusEnum.INFERRING ||
      status === "loading") { // Include "loading" for backward compatibility
    return (
      <div className="flex justify-start items-center gap-3 mt-2">
        <Loader className={cn('animate-spin h-4 w-4', BRAND_GREEN)} />
        <span>{displayStatus}</span>
      </div>
    );
  }
  
  // For any other status that might be added in the future
  if (status && status !== "") {
    return (
      <div className="flex justify-start items-center gap-3 mt-2">
        <span>{displayStatus}</span>
      </div>
    );
  }
  
  return null;
};

export default ParsingProgress;