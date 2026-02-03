import { FC, useState } from "react";
import { Button } from "@/components/ui/button";

interface LocalWorkflowBannerProps {
  show: boolean;
  onLoadLocalWorkflow: () => void;
  onDiscardLocalWorkflow: () => Promise<void>;
  isNewWorkflow?: boolean;
}

export const LocalWorkflowBanner: FC<LocalWorkflowBannerProps> = ({
  show,
  onLoadLocalWorkflow,
  onDiscardLocalWorkflow,
  isNewWorkflow = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!show) return null;

  const handleDiscardLocalWorkflow = async () => {
    setIsLoading(true);
    try {
      await onDiscardLocalWorkflow();
    } catch (error) {
      console.error("Error loading last saved copy:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              {isNewWorkflow
                ? "You have unsaved changes from a previous session. Would you like to continue editing or start fresh?"
                : "You have unsaved changes from a previous session. Would you like to continue editing or load the latest version from the server?"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiscardLocalWorkflow}
            disabled={isLoading}
            className="text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            {isLoading
              ? "Loading..."
              : isNewWorkflow
                ? "Start Fresh"
                : "Load Last Saved Copy"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onLoadLocalWorkflow}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue Editing
          </Button>
        </div>
      </div>
    </div>
  );
};
