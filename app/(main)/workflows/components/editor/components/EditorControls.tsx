import { FC, useRef, useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ArrowLeft, History } from "lucide-react";
import { useRouter } from "next/navigation";

interface EditorControlsProps {
  mode: "view_only" | "edit" | "preview";
  hasUnsavedChanges: boolean;
  onModeChange: (mode: "view_only" | "edit" | "preview") => void;
  onSave: () => void;
  onCancel: () => void;
  workflowTitle: string;
  onTitleChange: (newTitle: string) => void;
  isNewWorkflow?: boolean;
  onExecutionsClick?: () => void;
}

export const EditorControls: FC<EditorControlsProps> = ({
  mode,
  hasUnsavedChanges,
  onModeChange,
  onSave,
  onCancel,
  workflowTitle,
  onTitleChange,
  isNewWorkflow = false,
  onExecutionsClick,
}) => {
  const router = useRouter();
  // Dynamic width logic - moved to top level
  const [inputWidth, setInputWidth] = useState(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (spanRef.current) {
      setInputWidth(spanRef.current.offsetWidth + 8); // add a little padding
    }
  }, [workflowTitle]);

  const handleBackClick = () => {
    router.push("/workflows");
  };

  // Don't render anything in preview mode
  if (mode === "preview") {
    return null;
  }

  return (
    <div className="flex justify-between items-center p-4 border-b min-h-16 flex-shrink-0">
      <div className="flex items-center gap-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackClick}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Workflow Title */}
        {mode === "edit" ? (
          <>
            <Input
              autoFocus
              style={{
                width: inputWidth
                  ? Math.min(Math.max(inputWidth, 80), 576)
                  : 80, // min 80px, max 576px
                minWidth: 80,
                maxWidth: 576,
              }}
              className="rounded-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none border-none outline-none text-4xl font-bold placeholder:italic placeholder:text-gray-300 inline-block align-middle"
              value={workflowTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Enter workflow title"
              maxLength={100}
              aria-label="Workflow title"
            />
            {/* Hidden span for measuring text width */}
            <span
              ref={spanRef}
              className="invisible absolute whitespace-pre text-4xl font-bold px-0 py-0"
              style={{
                fontFamily: "inherit",
                fontWeight: "bold",
                fontSize: "2.25rem", // text-4xl
                maxWidth: 576,
              }}
            >
              {workflowTitle || "Enter workflow title"}
            </span>
          </>
        ) : (
          <>
            <Input
              style={{
                width: inputWidth
                  ? Math.min(Math.max(inputWidth, 80), 576)
                  : 80,
                minWidth: 80,
                maxWidth: 576,
              }}
              className="rounded-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none border-none outline-none text-4xl font-bold placeholder:italic placeholder:text-gray-300 inline-block align-middle select-none bg-transparent cursor-default"
              value={workflowTitle}
              placeholder="Enter workflow title"
              maxLength={100}
              aria-label="Workflow title"
              readOnly
              tabIndex={-1}
              onFocus={(e) => e.target.blur()}
            />
            {/* Hidden span for measuring text width */}
            <span
              ref={spanRef}
              className="invisible absolute whitespace-pre text-4xl font-bold px-0 py-0"
              style={{
                fontFamily: "inherit",
                fontWeight: "bold",
                fontSize: "2.25rem", // text-4xl
                maxWidth: 576,
              }}
            >
              {workflowTitle || "Enter workflow title"}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-6">
        {/* Unsaved changes indicator */}
        <span
          className={`text-sm text-orange-600 transition-opacity duration-200 ${
            mode === "edit" && hasUnsavedChanges ? "opacity-100" : "opacity-0"
          }`}
        >
          Unsaved changes (auto-saved locally)
        </span>
        {/* Save/Cancel Buttons */}
        <div
          className={`flex gap-2 transition-opacity duration-200 ${
            mode === "edit" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={!hasUnsavedChanges}
          >
            {isNewWorkflow ? "Create" : "Save"}
          </Button>
        </div>
        {/* Executions Button - Only show in view_only mode */}
        {onExecutionsClick && mode === "view_only" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExecutionsClick}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            Show executions
          </Button>
        )}
        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Edit mode</span>
          <Switch
            checked={mode === "edit"}
            onCheckedChange={(checked) =>
              onModeChange(checked ? "edit" : "view_only")
            }
          />
        </div>
      </div>
    </div>
  );
};
