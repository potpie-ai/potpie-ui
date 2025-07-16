import {
  Node,
  NodeCategory,
  NodeType,
  NodeGroup,
} from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { AlertTriangle, CircleDot } from "lucide-react";
import { SourceHandle } from "../../handles";

// Generic trigger node for unhandled trigger types
export const TriggerNode = ({ data }: { data: Node }) => {
  const colors = getNodeColors(data.group);
  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center">
          <AlertTriangle
            className="w-5 h-5 mr-2"
            style={{ color: colors.primary }}
          />
          <h3 className="font-semibold text-gray-800">Trigger</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center bg-orange-50 rounded-md p-2">
          <CircleDot className="w-3 h-3 text-orange-500 mr-2" />
          <span className="text-sm text-gray-700">{data.type}</span>
        </div>
      </div>
      <SourceHandle />
    </div>
  );
};
