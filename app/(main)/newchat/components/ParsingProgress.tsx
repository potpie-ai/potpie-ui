import React from 'react';
import { CheckCircle, Loader, XCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParsingStatusEnum } from '@/lib/Constants';

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
  // Map status enum to human-readable message
  const getStatusMessage = (status: string) => {
    switch (status) {
      case ParsingStatusEnum.SUBMITTED:
        return "Cloning your repository";
      case ParsingStatusEnum.CLONED:
        return "Parsing your code";
      case ParsingStatusEnum.PARSED:
        return "Understanding your codebase";
      case ParsingStatusEnum.PROCESSING:
        return "Processing your code";
      case ParsingStatusEnum.INFERRING:
        return "Enriching with AI insights";
      case ParsingStatusEnum.READY:
        return "Ready";
      case ParsingStatusEnum.ERROR:
        return "Error";
      case "loading":
        return "Loading...";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const displayStatus = getStatusMessage(status);
  
  if (status === ParsingStatusEnum.READY) {
    return (
      <div className="flex justify-start items-center gap-3 mt-2">
        <CheckCircle className="text-green-600 h-4 w-4" />
        <span className="text-green-600">{displayStatus}</span>
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

  if (status === ParsingStatusEnum.INFERRING) {
    return (
      <div className="flex justify-start items-center gap-3 mt-2">
        <Sparkles className="animate-pulse h-4 w-4 text-blue-500" />
        <span className="text-blue-600">{displayStatus}</span>
        <span className="text-xs text-muted-foreground">(You can start chatting now!)</span>
      </div>
    );
  }
  
  // For in-progress statuses
  if (status === ParsingStatusEnum.SUBMITTED || 
      status === ParsingStatusEnum.CLONED || 
      status === ParsingStatusEnum.PARSED || 
      status === ParsingStatusEnum.PROCESSING ||
      status === "loading") {
    return (
      <div className="flex justify-start items-center gap-3 mt-2">
        <Loader className="animate-spin h-4 w-4" />
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