import React from "react";
import { Button } from "@/components/ui/button";
import { Loader, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

// Enum for parsing status (aligned with backend: submitted → cloned → parsed → inferring → ready)
export enum ParsingStatusEnum {
  SUBMITTED = "submitted",
  CLONED = "cloned",
  PARSED = "parsed",
  INFERRING = "inferring",
  READY = "ready",
  ERROR = "error"
}

interface ParsingProgressProps {
  status: ParsingStatusEnum | null;
  projectId: string;
  onRetry: () => void;
}

const ParsingProgress: React.FC<ParsingProgressProps> = ({
  status,
  projectId,
  onRetry,
}) => {
  // Get status message based on current status
  const getStatusMessage = () => {
    if (!status) return "Unknown status";
    
    switch (status) {
      case ParsingStatusEnum.SUBMITTED:
        return "Repository parsing request submitted";
      case ParsingStatusEnum.CLONED:
        return "Repository cloned, analyzing code...";
      case ParsingStatusEnum.PARSED:
        return "Code analyzed, finalizing...";
      case ParsingStatusEnum.INFERRING:
        return "Understanding your codebase...";
      case ParsingStatusEnum.READY:
        return "Repository parsed successfully!";
      case ParsingStatusEnum.ERROR:
        return "Failed to parse repository";
      default:
        return "Unknown status";
    }
  };

  // Get status icon based on current status
  const getStatusIcon = () => {
    if (!status) return null;
    
    switch (status) {
      case ParsingStatusEnum.READY:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case ParsingStatusEnum.ERROR:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case ParsingStatusEnum.SUBMITTED:
      case ParsingStatusEnum.CLONED:
      case ParsingStatusEnum.PARSED:
      case ParsingStatusEnum.INFERRING:
        return <Loader className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  if (!status) return null;

  return (
    <div className="p-4 border rounded-md bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusMessage()}</span>
        </div>
        
        {status === ParsingStatusEnum.ERROR && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </Button>
        )}
      </div>
      
      {status !== ParsingStatusEnum.READY && status !== ParsingStatusEnum.ERROR && (
        <div className="mt-2">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ 
                width: status === ParsingStatusEnum.SUBMITTED ? '10%' : 
                       status === ParsingStatusEnum.CLONED ? '60%' : 
                       status === ParsingStatusEnum.PARSED || status === ParsingStatusEnum.INFERRING ? '90%' : '30%' 
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParsingProgress;