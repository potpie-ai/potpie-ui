import { Handle, Position } from "reactflow";

interface HandleProps {
  className?: string;
}

export const SourceHandle = ({
  className = "w-8 h-8 bg-orange-400 rounded-full border-2 border-orange-300 shadow-md cursor-crosshair z-10 flex items-center justify-center",
}: HandleProps) => {
  return (
    <Handle
      type="source"
      position={Position.Right}
      className="w-10 h-10 bg-orange-400 rounded-full border-2 border-orange-300 shadow-md cursor-crosshair z-10 flex items-center justify-center"
      style={{
        right: -20,
        width: 20, // Smaller interactive area
        height: 20, // Smaller interactive area
        backgroundColor: "#fb923c", // Orange to match arrow
      }}
      isConnectable={true}
    >
      {/* Right-pointing arrow */}
      <svg
        className="absolute left-full top-1/2 -translate-y-1/2"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="4,4 16,10 4,16" fill="#fb923c" opacity="0.8" />
      </svg>
    </Handle>
  );
};

export const TargetHandle = ({
  className = "w-8 h-8 bg-blue-400 rounded-full border-2 border-blue-300 shadow-md cursor-crosshair z-10 flex items-center justify-center",
}: HandleProps) => {
  return (
    <Handle
      type="target"
      position={Position.Left}
      className="w-10 h-10 bg-blue-400 rounded-full border-2 border-blue-300 shadow-md cursor-crosshair z-10 flex items-center justify-center"
      style={{
        left: -20,
        width: 20, // Smaller interactive area
        height: 20, // Smaller interactive area
        backgroundColor: "#60a5fa", // Blue to match arrow
      }}
      isConnectable={true}
    >
      {/* Left-pointing arrow */}
      <svg
        className="absolute right-full top-1/2 -translate-y-1/2 mr-1"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="16,4 4,10 16,16" fill="#60a5fa" opacity="0.8" />
      </svg>
    </Handle>
  );
};
