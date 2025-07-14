import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface EditorControlsProps {
  mode: "view_only" | "edit";
  hasUnsavedChanges: boolean;
  onModeChange: (mode: "view_only" | "edit") => void;
  onSave: () => void;
  onCancel: () => void;
}

export const EditorControls: FC<EditorControlsProps> = ({
  mode,
  hasUnsavedChanges,
  onModeChange,
  onSave,
  onCancel,
}) => {
  return (
    <div className="flex justify-between items-center p-4 border-b min-h-16">
      <div className="flex items-center gap-4">
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
        {/* Unsaved changes indicator */}
        <span
          className={`text-sm text-orange-600 transition-opacity duration-200 ${
            mode === "edit" && hasUnsavedChanges ? "opacity-100" : "opacity-0"
          }`}
        >
          Unsaved changes (auto-saved locally)
        </span>
      </div>
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
          Save Changes
        </Button>
      </div>
    </div>
  );
};
