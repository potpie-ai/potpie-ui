# API Documentation

This document describes all the API endpoints used across the services in the application.

**Base URL:** `${NEXT_PUBLIC_WORKFLOWS_URL}`

---

## Table of Contents
- [Recipe Service](#recipe-service)
- [Question Service](#question-service)
- [Spec Service](#spec-service)
- [Plan Service](#plan-service)
- [Task Splitting Service](#task-splitting-service)

---

## Recipe Service

### 1. Get All Recipes
Fetch all recipes with pagination.

**Endpoint:** `GET /api/v1/recipe/codegen`

**Query Parameters:**
```typescript
{
  start: number  // Starting index (default: 0)
  limit: number  // Maximum items to return (default: 100)
}
```

**Response:**
```typescript
{
  recipes: Array<{
    recipe_id: string
    project_id: string
    user_prompt: string
    status: string
    created_at: string
    repo_name?: string
    branch_name?: string
  }>
  total: number
}
```

---

### 2. Get Recipe Details
Fetch detailed information about a specific recipe.

**Endpoint:** `GET /api/v1/recipe/codegen/{recipeId}/details`

**Response:**
```typescript
{
  recipe_id: string
  project_id: string
  user_prompt: string
  repo_name?: string
  branch_name?: string
  questions_and_answers: Array<{
    question_id: string
    question: string
    answer?: string
  }>
}
```

---

## Question Service

### 1. Generate Questions
Generate questions for a project based on repository analysis.

**Endpoint:** `POST /api/v1/repos/analyze`

**Request Body:**
```typescript
{
  project_id: string       // Required
  feature_idea?: string    // Optional feature idea/description
}
```

**Response:**
```typescript
{
  questions: Array<{
    id: string
    section: string
    question: string
    options: string[] | Array<{
      label: string
      description?: string
    }>
    needsInput: boolean
    multipleChoice?: boolean
    assumed?: string
    reasoning?: string
    answerRecommendationIdx?: number | null
    expectedAnswerType?: string
    contextRefs?: Array<{
      path?: string
      type?: string
      [key: string]: unknown
    }> | null
  }>
}
```

---

### 2. Get Questions
Retrieve existing questions and answers for a project.

**Endpoint:** `GET /api/v1/projects/{projectId}/questions`

**Response:**
```typescript
{
  questions: Array<{
    id: string
    section: string
    question: string
    options: string[] | Array<{ label: string; description?: string }>
    needsInput: boolean
    multipleChoice?: boolean
    assumed?: string
    reasoning?: string
    answerRecommendationIdx?: number | null
    expectedAnswerType?: string
    contextRefs?: Array<{ path?: string; type?: string }> | null
  }>
  answers: {
    [question_id: string]: {
      question_id: string
      text_answer?: string
      mcq_answer?: string
      is_user_modified?: boolean
      is_skipped?: boolean
    }
  }
}
```

---

### 3. Submit Answers
Submit answers to questions for a project.

**Endpoint:** `POST /api/v1/projects/{projectId}/questions/answers`

**Request Body:**
```typescript
{
  answers: {
    [question_id: string]: {
      text_answer?: string
      mcq_answer?: string
    }
  }
}
```

**Response:**
```typescript
{
  status: string
  saved_count: number
}
```

---

### 4. Generate Plan
Generate an implementation plan based on submitted answers.

**Endpoint:** `POST /api/v1/plans/generate`

**Request Body:**
```typescript
{
  project_id: string
  answers: {
    [question_id: string]: {
      text_answer?: string
      mcq_answer?: string
    }
  }
  additional_context: string  // Optional, defaults to empty string
}
```

**Response:**
```typescript
{
  plan_id: string
  plan_document: string
}
```

---

### 5. Get Recipe Questions
Fetch questions for a specific recipe (for codegen workflow).

**Endpoint:** `GET /api/v1/recipe/codegen/{recipeId}/questions`

**Response:**
```typescript
{
  recipe_status: string  // e.g., "QUESTIONS_READY", "SPEC_IN_PROGRESS", "ERROR"
  questions: Array<{
    id: string
    section: string
    question: string
    options: string[] | Array<{ label: string; description?: string }>
    needsInput: boolean
    multipleChoice?: boolean
    assumed?: string
    reasoning?: string
    answerRecommendationIdx?: number | null
    expectedAnswerType?: string
    contextRefs?: Array<{ path?: string; type?: string }> | null
  }>
}
```

---

## Spec Service

### 1. Create Recipe
Create a new recipe for spec generation.

**Endpoint:** `POST /api/v1/recipe`

**Request Body:**
```typescript
{
  project_id: string
  user_prompt: string
}
```

**Response:**
```typescript
{
  recipe_id: string
}
```

---

### 2. Create Recipe Codegen
Create a new recipe and trigger QA question generation.

**Endpoint:** `POST /api/v1/recipe/codegen`

**Request Body:**
```typescript
{
  user_prompt: string
  project_id: string
  additional_links?: string[]  // Optional array of additional context links
}
```

**Response:**
```typescript
{
  recipe_id: string
}
```

---

### 3. Get Recipe Questions
Get QA questions for a recipe.

**Endpoint:** `GET /api/v1/recipe/codegen/{recipeId}/questions`

**Response:**
```typescript
{
  recipe_status: string  // e.g., "QUESTIONS_READY", "SPEC_IN_PROGRESS", "ERROR"
  questions: Array<{
    id: string
    section: string
    question: string
    options: string[] | Array<{ label: string; description?: string }>
    needsInput: boolean
    multipleChoice?: boolean
    assumed?: string
    reasoning?: string
    answerRecommendationIdx?: number | null
    expectedAnswerType?: string
    contextRefs?: Array<{ path?: string; type?: string }> | null
  }>
}
```

---

### 4. Get Recipe Details
Get comprehensive recipe details including repo and branch information.

**Endpoint:** `GET /api/v1/recipe/codegen/{recipeId}/details`

**Response:**
```typescript
{
  recipe_id: string
  project_id: string
  user_prompt: string
  repo_name?: string
  branch_name?: string
  questions_and_answers: Array<{
    question_id: string
    question: string
    answer?: string
  }>
}
```

---

### 5. Submit QA Answers (Legacy Spec)
Submit QA answers and trigger spec generation (legacy endpoint).

**Endpoint:** `POST /api/v1/recipe/spec`

**Request Body:**
```typescript
{
  recipe_id: string  // taskId maps directly to recipe_id
  qa_answers: Array<{
    question_id: string
    answer: string
  }>
}
```

**Response:**
```typescript
{
  spec_id?: string
  status: string
  message?: string
}
```

---

### 6. Get Spec Progress (Legacy)
Get spec generation progress by recipe_id (legacy endpoint).

**Endpoint:** `GET /api/v1/recipe/spec/{recipeId}`

**Response:**
```typescript
{
  recipe_id: string
  status: string
  progress_percentage?: number
  spec_document?: string
  error_message?: string
}
```

---

### 7. Submit Spec Generation
Submit QA answers and trigger spec generation.

**Endpoint:** `POST /api/v1/recipe/codegen/spec`

**Request Body:**
```typescript
{
  recipe_id: string
  qa_answers: Array<{
    question_id: string
    answer: string
  }>
}
```

**Response:**
```typescript
{
  spec_id: string
  status: string
}
```

---

### 8. Get Spec Progress by Spec ID
Get spec generation progress by spec_id.

**Endpoint:** `GET /api/v1/recipe/codegen/spec/{specId}`

**Response:**
```typescript
{
  spec_id: string
  recipe_id: string
  status: string  // e.g., "PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"
  progress_percentage?: number
  spec_document?: string
  created_at: string
  updated_at: string
  error_message?: string
}
```

---

### 9. Get Spec Progress by Recipe ID
Get latest spec generation progress by recipe_id.

**Endpoint:** `GET /api/v1/recipe/codegen/spec/recipe/{recipeId}`

**Response:**
```typescript
{
  spec_id: string
  recipe_id: string
  status: string  // e.g., "PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"
  progress_percentage?: number
  spec_document?: string
  created_at: string
  updated_at: string
  error_message?: string
}
```

---

## Plan Service

### 1. Submit Plan Generation
Submit a plan generation request.

**Endpoint:** `POST /api/v1/recipe/codegen/plan`

**Request Body:**
```typescript
{
  spec_id?: string    // Either spec_id or recipe_id is required
  recipe_id?: string
}
```

**Response:**
```typescript
{
  plan_id: string
  status: string
}
```

---

### 2. Get Plan Status
Get plan generation status by plan_id.

**Endpoint:** `GET /api/v1/recipe/codegen/plan/{planId}`

**Response:**
```typescript
{
  plan_id: string
  spec_id?: string
  recipe_id?: string
  status: string  // e.g., "PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"
  progress_percentage?: number
  created_at: string
  updated_at: string
  error_message?: string
}
```

---

### 3. Get Plan Status by Spec ID
Get latest plan generation status for a spec.

**Endpoint:** `GET /api/v1/recipe/codegen/plan/spec/{specId}`

**Response:**
```typescript
{
  plan_id: string
  spec_id: string
  recipe_id?: string
  status: string  // e.g., "PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"
  progress_percentage?: number
  created_at: string
  updated_at: string
  error_message?: string
}
```

---

### 4. Get Plan Status by Recipe ID
Get latest plan generation status for a recipe.

**Endpoint:** `GET /api/v1/recipe/codegen/plan/recipe/{recipeId}`

**Response:**
```typescript
{
  plan_id: string
  spec_id?: string
  recipe_id: string
  status: string  // e.g., "PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"
  progress_percentage?: number
  created_at: string
  updated_at: string
  error_message?: string
}
```

---

### 5. Get Plan Items
Fetch plan items with pagination.

**Endpoint:** `GET /api/v1/recipe/codegen/plan/{planId}/items`

**Query Parameters:**
```typescript
{
  start: number  // Starting item number (0-indexed, default: 0)
  limit: number  // Maximum items to return (default: 10, max: 100)
}
```

**Response:**
```typescript
{
  plan_id: string
  items: Array<{
    plan_item_id: string
    order: number
    title: string
    description: string
    estimated_effort?: string
    dependencies?: string[]
    status: string
    created_at: string
  }>
  total_items: number
  start: number
  limit: number
  has_more: boolean
}
```

---

## Task Splitting Service

### 1. Submit Task Splitting
Submit task splitting request for a plan item.

**Endpoint:** `POST /codegen/task-splitting`

**Request Body:**
```typescript
{
  plan_item_id: string
}
```

**Response:**
```typescript
{
  task_splitting_id: string
  status: string
}
```

---

### 2. Get Task Splitting Status
Get task splitting status by task_splitting_id.

**Endpoint:** `GET /codegen/task-splitting/{taskSplittingId}/status`

**Response:**
```typescript
{
  task_splitting_id: string
  plan_item_id: string
  status: string  // e.g., "PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"
  progress_percentage?: number
  created_at: string
  updated_at: string
  error_message?: string
}
```

---

### 3. Get Task Splitting Items
Fetch task splitting items (task DAG layers) with pagination.

**Endpoint:** `GET /codegen/task-splitting/{taskSplittingId}/items`

**Query Parameters:**
```typescript
{
  start: number  // Starting layer order (default: 0)
  limit: number  // Maximum layers to return (default: 10, max: 100)
}
```

**Response:**
```typescript
{
  task_splitting_id: string
  items: Array<{
    task_id: string
    layer_order: number
    title: string
    description: string
    file_path?: string
    estimated_complexity?: string
    dependencies?: string[]
    status: string
  }>
  total_items: number
  start: number
  limit: number
  has_more: boolean
}
```

---

## Common Response Patterns

### Error Response
All endpoints may return error responses in the following format:

```typescript
{
  detail: string  // Error message
  status?: number
}
```

### Status Values
Common status values used across services:
- `PENDING` - Request received, not started
- `IN_PROGRESS` - Processing in progress
- `COMPLETED` - Successfully completed
- `FAILED` - Failed with error
- `QUESTIONS_READY` - Questions are ready (recipe-specific)
- `SPEC_IN_PROGRESS` - Spec generation in progress (recipe-specific)
- `ERROR` - Generic error state

---

## Authentication

All endpoints require authentication headers. The `getHeaders()` utility function is used to retrieve the necessary authentication headers for each request.

**Required Headers:**
```typescript
{
  Authorization: string  // Authentication token
  "Content-Type": "application/json"
  // Additional headers as needed
}
```

---

## Notes

1. **Pagination:** Most list endpoints support pagination with `start` and `limit` parameters.
2. **Polling:** Some endpoints (like question generation) may require polling until completion.
3. **IDs:** All IDs (recipe_id, spec_id, plan_id, etc.) are UUID strings.
4. **Base URL:** All endpoints use `NEXT_PUBLIC_WORKFLOWS_URL` environment variable as the base URL.
5. **Error Handling:** The `parseApiError()` utility is used to extract meaningful error messages from API responses.
