# Workflow Editor - React DnD Implementation

This directory contains the workflow editor components with React DnD integration for drag and drop functionality.

## Architecture

### Components

- **WorkflowEditor**: Main editor component that wraps everything with DnD context
- **NodePalette**: Contains draggable node items
- **ReactFlowCanvas**: Drop target for the React Flow canvas
- **DraggableNode**: Individual draggable node component
- **DragPreview**: Custom drag preview component

### Hooks

- **useWorkflowDnD**: Custom hooks for drag and drop functionality
  - `useNodeDrag`: Hook for drag sources (node palette items)
  - `useCanvasDrop`: Hook for drop targets (React Flow canvas)

### DnD Flow

1. **Drag Start**: User starts dragging a node from the NodePalette
2. **Drag Preview**: Custom drag preview shows during drag operation
3. **Drop**: User drops the node onto the ReactFlowCanvas
4. **Node Creation**: New node is created at the drop position

## Key Features

- **Type Safety**: Full TypeScript support with proper interfaces
- **Custom Drag Preview**: Visual feedback during drag operations
- **Error Handling**: Robust error handling for edge cases
- **Performance**: Optimized with React.memo and useCallback
- **Accessibility**: Proper ARIA attributes and keyboard support

## Usage

```tsx
import { WorkflowEditor } from "./components/editor/WorkflowEditor";

<WorkflowEditor
  workflow={workflow}
  mode="edit"
  onSave={handleSave}
  onCancel={handleCancel}
/>;
```

## Benefits over HTML5 Drag and Drop

1. **Better TypeScript Support**: Full type safety throughout the drag and drop flow
2. **More Control**: Granular control over drag and drop behavior
3. **Cleaner Code**: Separation of concerns with custom hooks
4. **Better Testing**: Easier to test with React DnD's testing utilities
5. **Performance**: Better performance with React DnD's optimizations
6. **Accessibility**: Better accessibility support out of the box

## Dependencies

- `react-dnd`: Core DnD functionality
- `react-dnd-html5-backend`: HTML5 backend for drag and drop
- `reactflow`: Flow diagram library
