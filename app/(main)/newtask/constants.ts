export const NEW_TASK_CONSTANTS = {
  PLACEHOLDERS: {
    MESSAGE: "Type your message here...",
    REPOSITORY: "Select Repository",
    BRANCH: "Select Branch",
    SEARCH_REPO: "Search repository...",
    SEARCH_BRANCH: "Search branch...",
  },
  EMPTY_MESSAGES: {
    REPOSITORY: "No repository found.",
    BRANCH: "No branch found.",
  },
  SUGGESTIONS: [
    "Write unit tests for the auth module",
    "Refactor the API error handling",
    "Create technical documentation for the codebase",
  ],
  ERROR_MESSAGES: {
    VALIDATION: "Please select a repository and enter a message",
    CREATE_TASK: "Error creating task: ",
  },
  UI: {
    TITLE: "Bake your new task!",
    MAX_WIDTH: "max-w-3xl",
    MIN_HEIGHT: "min-h-[80vh]",
    TEXTAREA_MIN_HEIGHT: "min-h-[60px]",
    TEXTAREA_MAX_HEIGHT: "max-h-[200px]",
    BUTTON_HEIGHT: "h-8",
    SKELETON_WIDTH_REPO: "w-[160px]",
    SKELETON_WIDTH_BRANCH: "w-[140px]",
    DROPDOWN_WIDTH: "w-[220px]",
    DROPDOWN_MAX_HEIGHT: "max-h-[200px]",
    TRUNCATE_MAX_WIDTH: "max-w-[100px]",
  },
  STYLING: {
    ICON_COLOR: "text-[#7A7A7A]",
    ICON_STROKE_WIDTH: 1.5,
    ICON_SIZE: "h-3.5 w-3.5",
  },
} as const;
