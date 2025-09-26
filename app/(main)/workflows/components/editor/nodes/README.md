# Adding New Nodes to the Workflow System

This document explains how to add new nodes to the workflow system without maintaining separate hardcoded lists.

## Overview

The workflow system now uses a centralized approach where valid node types are automatically derived from the `availableNodes` registry. This means you only need to register your node in one place, and it will automatically be available throughout the system.

## Steps to Add a New Node

### 1. Create Your Node Component

Create your node component following the existing patterns. For example, for a new trigger:

```typescript
// app/(main)/workflows/components/editor/nodes/triggers/your-trigger/your-trigger.tsx

export const YourTriggerNode: FC<{ data: WorkflowNode }> = ({ data }) => {
  // Your node implementation
};

export const YourTriggerConfigComponent: FC<YourTriggerConfigProps> = ({
  config,
  onConfigChange,
}) => {
  // Your config component implementation
};

export const yourTriggerNodeMetadata = {
  type: "trigger_your_trigger" as NodeType,
  category: "trigger" as NodeCategory,
  group: "default" as NodeGroup,
  name: "Your Trigger",
  description: "Description of your trigger",
  icon: YourIcon,
  configComponent: YourTriggerConfigComponent,
};
```

### 2. Add NodeType to WorkflowService

Add your new node type to the `NodeType` union in `services/WorkflowService.ts`:

```typescript
export type NodeType =
  | "trigger_github_pr_opened"
  | "trigger_github_pr_closed"
  // ... existing types
  | "trigger_your_trigger" // Add your new type here
  | "custom_agent";
// ... rest of types
```

### 3. Register in Node Registry

Add your node metadata to the `availableNodes` array in `app/(main)/workflows/components/editor/nodes/node-registry.ts`:

```typescript
import { yourTriggerNodeMetadata } from "./triggers/your-trigger";

export const availableNodes: NodeInfo[] = [
  // ... existing nodes
  yourTriggerNodeMetadata, // Add your node here
  // ... rest of nodes
];
```

### 4. Add to Trigger Handler (if it's a trigger)

If your node is a trigger, add it to the switch statement in `app/(main)/workflows/components/editor/nodes/triggers/trigger.tsx`:

```typescript
import { YourTriggerNode } from "./your-trigger";

// In the switch statement:
case "trigger_your_trigger":
  return <YourTriggerNode data={data} />;
```

### 5. Export from Index Files

Add exports to the relevant index files:

```typescript
// app/(main)/workflows/components/editor/nodes/triggers/your-trigger/index.ts
export {
  YourTriggerNode,
  YourTriggerConfigComponent,
  yourTriggerNodeMetadata,
} from "./your-trigger";

// app/(main)/workflows/components/editor/nodes/index.ts
export { YourTriggerNode } from "./triggers/your-trigger";
export { yourTriggerNodeMetadata } from "./triggers/your-trigger";
export { YourTriggerConfigComponent } from "./triggers/your-trigger";
```

## What You DON'T Need to Do

With the new centralized approach, you **no longer need to**:

- ✅ Add your node type to hardcoded lists in `NodePalette.tsx`
- ✅ Add your node type to hardcoded lists in `useWorkflowDnD.ts`
- ✅ Add your node type to hardcoded lists in `workflowUtils.ts`

These are now automatically derived from the `availableNodes` registry.

## Validation

The system uses centralized validation through `app/(main)/workflows/components/editor/utils/nodeValidation.ts`:

- `getValidNodeTypes()` - Returns all valid node types
- `isValidNodeType(type)` - Type guard to check if a type is valid
- `getValidNodeTypesArray()` - Returns valid node types as an array

## Testing Your New Node

After adding your node:

1. Run `npx tsc --noEmit` to check for TypeScript errors
2. Start the development server and test dragging your node from the palette
3. Verify the node appears in the correct category and can be configured

## Example: Webhook Trigger

See `app/(main)/workflows/components/editor/nodes/triggers/webhook/` for a complete example of a new trigger implementation.
