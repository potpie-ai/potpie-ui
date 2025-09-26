import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { cn } from "@/lib/utils";

interface ValidationStatusProps {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const ValidationStatus = ({
  isValid,
  errors,
  warnings,
  className,
  size = "md",
}: ValidationStatusProps) => {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const allMessages = [...errors, ...warnings];

  const getIcon = () => {
    if (hasErrors) {
      return <XCircle className="text-red-500" />;
    }
    if (hasWarnings) {
      return <AlertCircle className="text-yellow-500" />;
    }
    return <CheckCircle className="text-green-500" />;
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-4 w-4";
      case "lg":
        return "h-6 w-6";
      default:
        return "h-5 w-5";
    }
  };

  const getStatusText = () => {
    if (hasErrors) {
      return "Invalid";
    }
    if (hasWarnings) {
      return "Valid with warnings";
    }
    return "Valid";
  };

  const getStatusColor = () => {
    if (hasErrors) {
      return "text-red-600";
    }
    if (hasWarnings) {
      return "text-yellow-600";
    }
    return "text-green-600";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-2", className)}>
          <div className={getSizeClasses()}>{getIcon()}</div>
          <span className={cn("text-sm font-medium", getStatusColor())}>
            {getStatusText()}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <div className="space-y-2">
          <div className="font-medium">{getStatusText()}</div>
          {allMessages.length > 0 && (
            <div className="space-y-1">
              {allMessages.map((message, index) => (
                <div key={index} className="text-sm text-gray-600">
                  • {message}
                </div>
              ))}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
