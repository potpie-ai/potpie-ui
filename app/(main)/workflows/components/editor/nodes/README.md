# Workflow Nodes

This directory contains all the node implementations for the workflow editor. Each node type has its own implementation file with both the component and metadata.

## Structure

```
nodes/
├── triggers/
│   ├── trigger.tsx              # Generic trigger fallback
│   ├── github/
│   │   └── github-trigger.tsx   # GitHub PR trigger
│   └── linear/
│       └── linear-trigger.tsx   # Linear issue trigger
├── agents/
│   └── agent.tsx                # Custom agent
├── flow-controls/
│   └── flow-control.tsx         # Conditional flow control
├── node.tsx                     # Main node switcher component
├── node-registry.ts             # Registry of all available nodes
├── color_utils.ts               # Color utilities for nodes
└── index.ts                     # Clean exports
```

## Adding a New Node

To add a new node type:

1. **Create the node implementation file** in the appropriate category directory:

   ```typescript
   // Example: nodes/triggers/github/new-github-trigger.tsx
   import { Node, NodeCategory, NodeType, NodeGroup } from "@/services/WorkflowService";
   import { getNodeColors } from "../../color_utils";
   import { AlertTriangle, CircleDot, YourIcon } from "lucide-react";
   import { SourceHandle } from "../../../handles";

   // Node metadata for the palette
   export const newGitHubTriggerNodeMetadata = {
     type: NodeType.YOUR_NEW_TYPE,
     category: NodeCategory.TRIGGER,
     group: NodeGroup.GITHUB,
     name: "Your Node Name",
     description: "Description of what this node does",
     icon: YourIcon,
   };

   export const NewGitHubTriggerNode = ({ data }: { data: Node }) => {
     const colors = getNodeColors(data.group);
     return (
       <div className="w-full">
         {/* Your node UI implementation */}
       </div>
     );
   };
   ```

2. **Add the node type to WorkflowService.ts**:

   ```typescript
   export enum NodeType {
     // ... existing types
     YOUR_NEW_TYPE = "your_new_type",
   }
   ```

3. **Register the node** in `node-registry.ts`:

   ```typescript
   import { newGitHubTriggerNodeMetadata } from "./triggers/github/new-github-trigger";

   export const availableNodes: NodeInfo[] = [
     // ... existing nodes
     newGitHubTriggerNodeMetadata,
   ];
   ```

4. **Update the node switcher** in `node.tsx` if needed:

   ```typescript
   case NodeCategory.TRIGGER:
     switch (data.type) {
       case NodeType.YOUR_NEW_TYPE:
         return <NewGitHubTriggerNode data={data} />;
       // ... other cases
     }
   ```

5. **Export from index.ts**:
   ```typescript
   export { NewGitHubTriggerNode } from "./triggers/github/new-github-trigger";
   export { newGitHubTriggerNodeMetadata } from "./triggers/github/new-github-trigger";
   ```

## Node Metadata

Each node must export metadata with the following structure:

```typescript
export const nodeMetadata = {
  type: NodeType.YOUR_TYPE, // Unique node type identifier
  category: NodeCategory.YOUR_CATEGORY, // TRIGGER, AGENT, or FLOW_CONTROL
  group: NodeGroup.YOUR_GROUP, // GITHUB, LINEAR, DEFAULT, etc.
  name: "Display Name", // Human-readable name for the palette
  description: "Description", // Description for the palette
  icon: YourIcon, // Lucide React icon component
};
```

## Benefits of This Structure

- **Single Source of Truth**: Node information is defined alongside its implementation
- **Easy to Add**: Adding new nodes is straightforward and follows a clear pattern
- **Type Safety**: Full TypeScript support with proper type checking
- **Maintainable**: Changes to node behavior and metadata are co-located
- **Scalable**: Easy to add new node categories and types
- **Organized**: Related triggers are grouped in their own directories (github/, linear/, etc.)
