import { FC } from "react";
import { Button } from "@/components/ui/button";

interface LocalWorkflowBannerProps {
  show: boolean;
  onLoadLocalWorkflow: () => void;
  onDiscardLocalWorkflow: () => void;
}

export const LocalWorkflowBanner: FC<LocalWorkflowBannerProps> = ({
  show,
  onLoadLocalWorkflow,
  onDiscardLocalWorkflow,
}) => {
  if (!show) return null;

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
              You have unsaved changes from a previous session. Would you like
              to continue editing or start fresh?
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDiscardLocalWorkflow}
            className="text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            Load Last Saved Copy
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
