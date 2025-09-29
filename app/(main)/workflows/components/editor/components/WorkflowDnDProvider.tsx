import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ReactNode } from "react";

interface WorkflowDnDProviderProps {
  children: ReactNode;
}

export const WorkflowDnDProvider: React.FC<WorkflowDnDProviderProps> = ({
  children,
}) => {
  return <DndProvider backend={HTML5Backend}>{children}</DndProvider>;
};
