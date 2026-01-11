"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Play,
  Check,
  Layout,
  ChevronRight,
  Terminal,
  Loader2,
  Code2,
  ShieldCheck,
  GitBranch,
  Maximize2,
  CheckCircle2,
  Circle,
  Pause,
  Lock,
  ArrowRight,
  TerminalSquare,
  Sidebar,
  X,
  FileDiff,
  TestTube,
  ScrollText,
  ChevronDown,
  FileText,
  Copy,
  Clock,
  ExternalLink,
  Hourglass,
  List,
  ArrowLeft,
  Github,
  Sparkles,
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import TaskSplittingService from "@/services/TaskSplittingService";
import PlanService from "@/services/PlanService";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  TaskSplittingStatusResponse,
  TaskSplittingItemsResponse,
  TaskLayer,
  PlanItem,
} from "@/lib/types/spec";

/**
 * VERTICAL TASK EXECUTION ENGINE
 * Uses mock data for plan items with test_diff and codegen_diff support
 * - Displays tasks ordered by plan_item
 * - Shows test_diff first to user
 * - Streams codegen_diff when user presses Code Gen button
 */

// Mock Data Types
interface MockTask {
  title: string;
  file: string;
  test_code: string;
  test_diff: string;
  codegen_diff: string;
  test_results: any[];
  tests_total: number;
  tests_passed: number;
  order: number;
}

interface MockPlanItemPhase {
  title: string;
  order: number;
  tasks: MockTask[];
}

interface MockPlanData {
  [key: string]: MockPlanItemPhase[];
}

// Mock Data from the provided JSON
const MOCK_PLAN_DATA: MockPlanData = {
  plan_item_0: [
    {
      title: "Phase 1: Foundation - Database Schema & Core Types",
      order: 0,
      tasks: [
        {
          title:
            "Add AiChatInteractionStatus enum (SUCCESS, ERROR, RATE_LIMITED, TIMEOUT)",
          file: "packages/prisma/schema.prisma",
          test_code:
            "function test_plan_item_0_0() {\n  const fs = require('fs');\n  const schema = fs.readFileSync('packages/prisma/schema.prisma', 'utf8');\n  const hasEnum = schema.includes('enum AiChatInteractionStatus');\n  const hasSuccess = schema.includes('SUCCESS');\n  const hasError = schema.includes('ERROR');\n  const hasRateLimited = schema.includes('RATE_LIMITED');\n  const hasTimeout = schema.includes('TIMEOUT');\n  \n  if (hasEnum && hasSuccess && hasError && hasRateLimited && hasTimeout) {\n    console.log('✅ AiChatInteractionStatus enum added with all required values');\n    return true;\n  }\n  console.log('❌ AiChatInteractionStatus enum not found or incomplete');\n  return false;\n}",
          test_diff:
            '+enum AiChatInteractionStatus {\n+  SUCCESS     @map("success")\n+  ERROR       @map("error")\n+  RATE_LIMITED @map("rate_limited")\n+  TIMEOUT     @map("timeout")\n+}',
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 0,
        },
        {
          title:
            "Add AiChatInteraction model to packages/prisma/schema.prisma with fields for metadata (userId, profileId, teamId, orgId, model, tokens, latency, status, createdAt)",
          file: "packages/prisma/schema.prisma",
          test_code:
            "function test_plan_item_0_1() {\n  const fs = require('fs');\n  const schema = fs.readFileSync('packages/prisma/schema.prisma', 'utf8');\n  const hasModel = schema.includes('model AiChatInteraction');\n  const hasUserId = schema.includes('userId');\n  const hasProfileId = schema.includes('profileId');\n  const hasTeamId = schema.includes('teamId');\n  const hasOrgId = schema.includes('orgId');\n  const hasModelField = schema.includes('model');\n  const hasInputTokens = schema.includes('inputTokens');\n  const hasOutputTokens = schema.includes('outputTokens');\n  const hasTotalTokens = schema.includes('totalTokens');\n  const hasLatency = schema.includes('latency');\n  const hasStatus = schema.includes('status');\n  const hasCreatedAt = schema.includes('createdAt');\n  \n  if (hasModel && hasUserId && hasProfileId && hasTeamId && hasOrgId &&\n      hasModelField && hasInputTokens && hasOutputTokens && hasTotalTokens &&\n      hasLatency && hasStatus && hasCreatedAt) {\n    console.log('✅ AiChatInteraction model added with all required fields');\n    return true;\n  }\n  console.log('❌ AiChatInteraction model not found or incomplete');\n  return false;\n}",
          test_diff:
            "+model AiChatInteraction {\n+  id              Int                          @id @default(autoincrement())\n+  userId          Int?\n+  profileId       Int?\n+  teamId          Int?\n+  orgId           Int?\n+  model           String\n+  inputTokens     Int\n+  outputTokens    Int\n+  totalTokens     Int\n+  latency         Int                          @default(0)\n+  status          AiChatInteractionStatus      @default(SUCCESS)\n+  createdAt       DateTime                    @default(now())\n+",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 1,
        },
        {
          title:
            "Add indexes for efficient querying: [userId], [profileId], [teamId], [orgId], [createdAt]",
          file: "packages/prisma/schema.prisma",
          test_code:
            "function test_plan_item_0_2() {\n  const fs = require('fs');\n  const schema = fs.readFileSync('packages/prisma/schema.prisma', 'utf8');\n  const hasUserIdIndex = schema.includes('@@index([userId])');\n  const hasProfileIdIndex = schema.includes('@@index([profileId])');\n  const hasTeamIdIndex = schema.includes('@@index([teamId])');\n  const hasOrgIdIndex = schema.includes('@@index([orgId])');\n  const hasCreatedAtIndex = schema.includes('@@index([createdAt])');\n  \n  if (hasUserIdIndex && hasProfileIdIndex && hasTeamIdIndex &&\n      hasOrgIdIndex && hasCreatedAtIndex) {\n    console.log('✅ All indexes added for efficient querying');\n    return true;\n  }\n  console.log('❌ Some indexes missing');\n  return false;\n}",
          test_diff:
            "  @@index([userId])\n+  @@index([profileId])\n+  @@index([teamId])\n+  @@index([orgId])\n+  @@index([createdAt])\n+}",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 2,
        },
        {
          title: "Run migration: yarn workspace @calcom/prisma db-migrate",
          file: "packages/prisma/migrations/",
          test_code:
            "function test_plan_item_0_3() {\n  const fs = require('fs');\n  const path = require('path');\n  \n  const migrationsDir = 'packages/prisma/migrations';\n  if (!fs.existsSync(migrationsDir)) {\n    console.log('❌ Migrations directory does not exist yet');\n    return false;\n  }\n  \n  const files = fs.readdirSync(migrationsDir);\n  const aiChatMigrations = files.filter(f => f.includes('ai_chat_interaction') || f.includes('AiChatInteraction'));\n  \n  if (aiChatMigrations.length > 0) {\n    console.log(`✅ Found ${aiChatMigrations.length} AI chat migration(s)`);\n    return true;\n  }\n  console.log('⏳ Migration not yet run - needs user execution');\n  return false;\n}",
          test_diff: "",
          codegen_diff:
            "CREATED: packages/prisma/migrations/[timestamp]_create_ai_chat_interaction.sql\n  -- Execute CREATE TYPE and CREATE TABLE statements for AiChatInteraction model",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 3,
        },
        {
          title: "Generate Prisma types: yarn prisma generate",
          file: "packages/prisma/generated/prisma/client/",
          test_code:
            "function test_plan_item_0_4() {\n  const fs = require('fs');\n  const path = require('path');\n  \n  const generatedPath = 'packages/prisma/generated/prisma/client';\n  if (!fs.existsSync(generatedPath)) {\n    console.log('⏳ Generated Prisma client not yet created - needs user execution');\n    return false;\n  }\n  \n  const indexFile = fs.readFileSync(path.join(generatedPath, 'index.js'), 'utf8');\n  const hasAiChatInteraction = indexFile.includes('AiChatInteraction');\n  const hasAiChatInteractionStatus = indexFile.includes('AiChatInteractionStatus');\n  \n  if (hasAiChatInteraction && hasAiChatInteractionStatus) {\n    console.log('✅ Prisma types generated for AiChatInteraction model');\n    return true;\n  }\n  console.log('⏳ Types not yet generated or incomplete - needs user execution');\n  return false;\n}",
          test_diff:
            "CREATED: packages/prisma/generated/prisma/client/index.d.ts\n  -- Generated TypeScript types for AiChatInteraction model and AiChatInteractionStatus enum\n  -- Exported types can be imported as: import type { AiChatInteraction, AiChatInteractionStatus } from '@calcom/prisma/client'",
          codegen_diff:
            "GENERATED:\n  export type AiChatInteraction = {\n    id: number;\n    userId: number | null;\n    profileId: number | null;\n    teamId: number | null;\n    orgId: number | null;\n    model: string;\n    inputTokens: number;\n    outputTokens: number;\n    totalTokens: number;\n    latency: number;\n    status: AiChatInteractionStatus;\n    createdAt: Date;\n  }\n  \n  export enum AiChatInteractionStatus {\n    SUCCESS = 'success'\n    ERROR = 'error'\n    RATE_LIMITED = 'rate_limited'\n    TIMEOUT = 'timeout'\n  }",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 4,
        },
        {
          title:
            "Create packages/features/ai-chat/lib/types.ts with shared types",
          file: "packages/features/ai-chat/lib/types.ts",
          test_code:
            "function test_plan_item_0_5() {\n  const fs = require('fs');\n  const path = require('path');\n  \n  const typesFile = 'packages/features/ai-chat/lib/types.ts';\n  if (!fs.existsSync(typesFile)) {\n    console.log('❌ types.ts does not exist');\n    return false;\n  }\n  \n  const content = fs.readFileSync(typesFile, 'utf8');\n  \n  const hasChatMessageRole = content.includes('export type ChatMessageRole');\n  const hasChatMessage = content.includes('export interface ChatMessage');\n  const hasTokenUsage = content.includes('export interface TokenUsage');\n  const hasAIProviderResponse = content.includes('export interface AIProviderResponse');\n  const hasAiChatContext = content.includes('export interface AiChatContext');\n  \n  if (hasChatMessageRole && hasChatMessage && hasTokenUsage &&\n      hasAIProviderResponse && hasAiChatContext) {\n    console.log('✅ All core types defined correctly');\n    return true;\n  }\n  console.log('❌ Some types missing from types.ts');\n  return false;\n}",
          test_diff:
            'CREATED: packages/features/ai-chat/lib/types.ts\n\nexport type ChatMessageRole = "user" | "assistant" | "system";\n\nexport interface ChatMessage {\n  role: ChatMessageRole;\n  content: string;\n  timestamp?: Date;\n}\n\nexport interface TokenUsage {\n  inputTokens: number;\n  outputTokens: number;\n  totalTokens: number;\n}\n\nexport interface AIProviderResponse {\n  content: string;\n  model: string;\n  usage: TokenUsage;\n  latency: number;\n}\n\nexport interface AiChatContext {\n  userId?: number | null;\n  profileId?: number | null;\n  teamId?: number | null;\n  orgId?: number | null;\n}',
          codegen_diff:
            "GENERATED:\n  -- Core TypeScript types for AI chat feature\n  -- Framework-agnostic, no Next.js/tRPC dependencies\n  -- Type-safe interfaces for messages, tokens, responses, and multi-tenancy context",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 5,
        },
        {
          title:
            "Create packages/features/ai-chat/lib/dto/ChatMessage.dto.ts, ChatResponse.dto.ts, AiChatInteractionLogDTO.ts",
          file: "packages/features/ai-chat/lib/dto/",
          test_code:
            "function test_plan_item_0_6() {\n  const fs = require('fs');\n  const path = require('path');\n  \n  const dtoDir = 'packages/features/ai-chat/lib/dto';\n  if (!fs.existsSync(dtoDir)) {\n    console.log('❌ DTO directory does not exist');\n    return false;\n  }\n  \n  const dtoFiles = fs.readdirSync(dtoDir);\n  const hasChatMessageDTO = dtoFiles.includes('ChatMessage.dto.ts');\n  const hasChatResponseDTO = dtoFiles.includes('ChatResponse.dto.ts');\n  const hasAiChatInteractionLogDTO = dtoFiles.includes('AiChatInteractionLogDTO.ts');\n  const hasIndex = dtoFiles.includes('index.ts');\n  \n  const chatMessageContent = fs.readFileSync(path.join(dtoDir, 'ChatMessage.dto.ts'), 'utf8');\n  const hasChatMessageImport = chatMessageContent.includes('import type { ChatMessage }');\n  \n  const chatResponseContent = fs.readFileSync(path.join(dtoDir, 'ChatResponse.dto.ts'), 'utf8');\n  const hasTokenUsageExport = chatResponseContent.includes('export interface TokenUsage');\n  \n  const aiChatLogContent = fs.readFileSync(path.join(dtoDir, 'AiChatInteractionLogDTO.ts'), 'utf8');\n  const hasAiChatInteractionStatusImport = aiChatLogContent.includes('import type { AiChatInteractionStatus }');\n  \n  const indexContent = fs.readFileSync(path.join(dtoDir, 'index.ts'), 'utf8');\n  const hasAllExports = indexContent.includes('export * from \"./AiChatInteractionLogDTO\"') &&\n                      indexContent.includes('export * from \"./ChatMessage.dto\"') &&\n                      indexContent.includes('export * from \"./ChatResponse.dto\"');\n  \n  if (hasChatMessageDTO && hasChatResponseDTO && hasAiChatInteractionLogDTO &&\n      hasIndex && hasAllExports && hasChatMessageImport &&\n      hasTokenUsageExport && hasAiChatInteractionStatusImport) {\n    console.log('✅ All DTOs created with proper exports');\n    return true;\n  }\n  console.log('❌ Some DTOs missing or incomplete');\n  return false;\n}",
          test_diff:
            'CREATED: packages/features/ai-chat/lib/dto/ChatMessage.dto.ts\n+import type { ChatMessage } from "../types";\n+\n+export interface ChatMessageDTO {\n+  role: ChatMessage["role"];\n+  content: ChatMessage["content"];\n+}\n\nCREATED: packages/features/ai-chat/lib/dto/ChatResponse.dto.ts\n+import type { TokenUsage } from "../types";\n+\n+export interface ChatResponseDTO {\n+  success: boolean;\n+  data?: {\n+    content: string;\n+    model: string;\n+    usage: TokenUsage;\n+    latency: number;\n+  };\n+  error?: {\n+    code: string;\n+    message: string;\n+  };\n+}\n\nCREATED: packages/features/ai-chat/lib/dto/AiChatInteractionLogDTO.ts\n+import type { AiChatInteractionStatus } from "@calcom/prisma/client";\n+\n+export interface AiChatInteractionLogDTO {\n+  id: number;\n+  userId: number | null;\n+  profileId: number | null;\n+  teamId: number | null;\n+  orgId: number | null;\n+  model: string;\n+  inputTokens: number;\n+  outputTokens: number;\n+  totalTokens: number;\n+  latency: number;\n+  status: AiChatInteractionStatus;\n+  createdAt: Date;\n+}\n\nCREATED: packages/features/ai-chat/lib/dto/index.ts\n+export * from "./AiChatInteractionLogDTO";\n+export * from "./ChatMessage.dto";\n+export * from "./ChatResponse.dto";\n+',
          codegen_diff:
            "GENERATED:\n  -- Data Transfer Objects for API layer\n  -- ChatMessageDTO: Request/response message format\n  -- ChatResponseDTO: API response with success/error handling\n  -- AiChatInteractionLogDTO: Log DTO matching database schema\n  -- All DTOs follow Cal.com patterns",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 6,
        },
        {
          title:
            "Create packages/features/ai-chat/lib/providers/AIProvider.interface.ts defining to provider contract",
          file: "packages/features/ai-chat/lib/providers/AIProvider.interface.ts",
          test_code:
            "function test_plan_item_0_7() {\n  const fs = require('fs');\n  const path = require('path');\n  \n  const providerFile = 'packages/features/ai-chat/lib/providers/AIProvider.interface.ts';\n  if (!fs.existsSync(providerFile)) {\n    console.log('❌ AIProvider.interface.ts does not exist');\n    return false;\n  }\n  \n  const content = fs.readFileSync(providerFile, 'utf8');\n  \n  const hasGenerateResponse = content.includes('generateResponse(');\n  const hasChatMessageParam = content.includes('messages: ChatMessage[]');\n  const hasSystemPromptParam = content.includes('systemPrompt?: string');\n  const hasAIProviderResponse = content.includes('Promise<AIProviderResponse>');\n  const hasInterfaceKeyword = content.includes('export interface AIProvider');\n  \n  if (hasInterfaceKeyword && hasGenerateResponse && hasChatMessageParam &&\n      hasSystemPromptParam && hasAIProviderResponse) {\n    console.log('✅ AIProvider interface defined correctly');\n    return true;\n  }\n  console.log('❌ AIProvider.interface.ts incomplete');\n  return false;\n}",
          test_diff:
            'CREATED: packages/features/ai-chat/lib/providers/AIProvider.interface.ts\n+import type { AIProviderResponse, ChatMessage } from "../types";\n+\n+export interface AIProvider {\n+  generateResponse(messages: ChatMessage[], systemPrompt?: string): Promise<AIProviderResponse>;\n+}\n\nCREATED: packages/features/ai-chat/lib/index.ts\n+export * from "./dto";\n+export * from "./types";\n+',
          codegen_diff:
            "GENERATED:\n  -- Provider abstraction interface for AI implementations\n  -- Framework-agnostic, no Next.js/tRPC dependencies\n  -- Enables provider swapping (OpenAI, Anthropic, custom)\n  -- Single method contract: generateResponse(messages, systemPrompt?)",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 7,
        },
      ],
    },
  ],
  plan_item_1: [
    {
      title: "Phase 2: Provider Infrastructure",
      order: 1,
      tasks: [
        {
          title:
            "Implement OpenAI provider in packages/features/ai-chat/lib/providers/openai.ts with generateResponse() method",
          file: "packages/features/ai-chat/lib/providers/openai.ts",
          test_code: "test_plan_item_1_0()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 0,
        },
        {
          title:
            "Handle OpenAI-specific errors: rate limits (429), provider errors (5xx), timeouts",
          file: "packages/features/ai-chat/lib/providers/NoOpProvider.ts",
          test_code: "test_plan_item_1_1()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 1,
        },
        {
          title: "Calculate and return latency metrics in response",
          file: "packages/features/ai-chat/lib/prompts/systemPrompt.ts",
          test_code: "test_plan_item_1_2()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 2,
        },
        {
          title:
            "Implement NoOp provider in packages/features/ai-chat/lib/providers/NoOpProvider.ts with configurable mock responses",
          file: "packages/features/ai-chat/lib/providers/index.ts",
          test_code: "test_plan_item_1_3()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 3,
        },
        {
          title: "Support throwing configurable errors for testing edge cases",
          file: ".env.example",
          test_code: "test_plan_item_1_4()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 4,
        },
        {
          title:
            "Create system prompt template in packages/features/ai-chat/lib/prompts/systemPrompt.ts",
          file: "TBD",
          test_code: "test_plan_item_1_5()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 5,
        },
        {
          title:
            "Define assistant role, capabilities (setup, integrations, features), constraints (no data access, no resource modification), and safety guidelines",
          file: "TBD",
          test_code: "test_plan_item_1_6()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 6,
        },
        {
          title:
            "Export providers and prompt as getAiChatProvider() factory function (environment-based selection)",
          file: "TBD",
          test_code: "test_plan_item_1_7()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 7,
        },
      ],
    },
  ],
  plan_item_2: [
    {
      title: "Phase 3: Data Access & Rate Limiting",
      order: 2,
      tasks: [
        {
          title:
            "Create packages/features/ai-chat/repositories/IAiChatInteractionRepository.ts interface",
          file: "packages/features/ai-chat/repositories/IAiChatInteractionRepository.ts",
          test_code: "test_plan_item_2_0()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 0,
        },
        {
          title:
            "Implement PrismaAiChatInteractionRepository with logInteraction(), getUsageByUser(), getUsageByTeam(), getUsageByOrg()",
          file: "packages/features/ai-chat/repositories/PrismaAiChatInteractionRepository.ts",
          test_code: "test_plan_item_2_1()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 1,
        },
        {
          title: "Use Prisma select statements (never include) for all queries",
          file: "packages/features/ai-chat/lib/rateLimiter/IRateLimiter.ts",
          test_code: "test_plan_item_2_2()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 2,
        },
        {
          title: "Export DTOs from repository methods",
          file: "packages/features/ai-chat/lib/rateLimiter/PerUserRateLimiter.ts",
          test_code: "test_plan_item_2_3()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 3,
        },
        {
          title: "Handle database errors with ErrorWithCode",
          file: ".env.example",
          test_code: "test_plan_item_2_4()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 4,
        },
        {
          title:
            "Create packages/features/ai-chat/lib/rateLimiter/IRateLimiter.ts interface",
          file: "TBD",
          test_code: "test_plan_item_2_5()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 5,
        },
        {
          title: "Implement PerUserRateLimiter with Redis counters",
          file: "TBD",
          test_code: "test_plan_item_2_6()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 6,
        },
        {
          title: "Implement checkLimit() to throw error when exceeded",
          file: "TBD",
          test_code: "test_plan_item_2_7()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 7,
        },
        {
          title: "Implement recordUsage() to increment counter and set expiry",
          file: "TBD",
          test_code: "test_plan_item_2_8()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 8,
        },
        {
          title:
            "Handle Redis failures gracefully (fail-open to not block users)",
          file: "TBD",
          test_code: "test_plan_item_2_9()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 9,
        },
        {
          title: "Support configurable limits via environment variables",
          file: "TBD",
          test_code: "test_plan_item_2_10()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 10,
        },
      ],
    },
  ],
  plan_item_3: [
    {
      title: "Phase 4: Domain Service Orchestration",
      order: 3,
      tasks: [
        {
          title:
            "Create packages/features/ai-chat/lib/AiChatService.ts implementing IAiChatService",
          file: "packages/features/ai-chat/lib/AiChatService.ts",
          test_code: "test_plan_item_3_0()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 0,
        },
        {
          title:
            "Define sendMessage() method taking userId, profileId, teamId, orgId, and conversation history",
          file: "packages/features/ai-chat/lib/IAiChatService.ts",
          test_code: "test_plan_item_3_1()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 1,
        },
        {
          title:
            "Implement orchestration: rateLimiter.checkLimit() → validateMessages() → prepare conversation with system prompt → provider.generateResponse() → repository.logInteraction()",
          file: "packages/features/ai-chat/di/AiChatService.container.ts",
          test_code: "test_plan_item_3_2()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 2,
        },
        {
          title:
            "Add retry logic with exponential backoff for transient failures (max 3 attempts)",
          file: "packages/features/ai-chat/lib/zod/schemas.ts",
          test_code: "test_plan_item_3_3()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 3,
        },
        {
          title: "Add timeout handling (30 seconds default)",
          file: "TBD",
          test_code: "test_plan_item_3_4()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 4,
        },
        {
          title: "Convert all errors to ErrorWithCode with appropriate codes",
          file: "TBD",
          test_code: "test_plan_item_3_5()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 5,
        },
        {
          title:
            "Add comprehensive logging for request start, success, failures, latency, and token usage",
          file: "TBD",
          test_code: "test_plan_item_3_6()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 6,
        },
        {
          title:
            "Create packages/features/ai-chat/di/AiChatService.container.ts factory function",
          file: "TBD",
          test_code: "test_plan_item_3_7()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 7,
        },
        {
          title: "Resolve provider based on environment (OpenAI or NoOp)",
          file: "TBD",
          test_code: "test_plan_item_3_8()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 8,
        },
        {
          title: "Resolve rate limiter and repository instances",
          file: "TBD",
          test_code: "test_plan_item_3_9()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 9,
        },
        {
          title: "Handle missing environment variables with clear errors",
          file: "TBD",
          test_code: "test_plan_item_3_10()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 10,
        },
      ],
    },
  ],
  plan_item_4: [
    {
      title: "Phase 5: API Layer with tRPC",
      order: 4,
      tasks: [
        {
          title:
            "Create packages/trpc/server/routers/viewer/loggedInViewer/aiChat/_router.ts",
          file: "packages/trpc/server/routers/viewer/loggedInViewer/aiChat/_router.ts",
          test_code: "test_plan_item_4_0()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 0,
        },
        {
          title: "Import router, protectedProcedure from @calcom/trpc/server",
          file: "packages/trpc/server/routers/viewer/loggedInViewer/_router.ts",
          test_code: "test_plan_item_4_1()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 1,
        },
        {
          title: "Import getAiChatService() from @calcom/features/ai-chat",
          file: "TBD",
          test_code: "test_plan_item_4_2()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 2,
        },
        {
          title:
            "Import sendMessageInputSchema and chatResponseSchema from Zod",
          file: "TBD",
          test_code: "test_plan_item_4_3()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 3,
        },
        {
          title: "Define aiChatRouter with sendMessage mutation",
          file: "TBD",
          test_code: "test_plan_item_4_4()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 4,
        },
        {
          title:
            "In mutation handler: extract userId from ctx.user, get profileId/teamId/orgId from user context (nullable), call aiChatService.sendMessage()",
          file: "TBD",
          test_code: "test_plan_item_4_5()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 5,
        },
        {
          title: "Wrap service call in try/catch to handle all error types",
          file: "TBD",
          test_code: "test_plan_item_4_6()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 6,
        },
        {
          title:
            "Convert ErrorWithCode to TRPCError with matching codes and messages",
          file: "TBD",
          test_code: "test_plan_item_4_7()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 7,
        },
        {
          title: "Return ChatResponseDTO with success flag and data structure",
          file: "TBD",
          test_code: "test_plan_item_4_8()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 8,
        },
        {
          title:
            "Integrate aiChatRouter into viewer.loggedInViewer parent router",
          file: "TBD",
          test_code: "test_plan_item_4_9()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 9,
        },
      ],
    },
  ],
  plan_item_5: [
    {
      title: "Phase 6: UI Components - Message, Input, Welcome",
      order: 5,
      tasks: [
        {
          title:
            "Create apps/web/app/(use-page-wrapper)/ai-chat/components/ChatMessage.tsx",
          file: "apps/web/app/(use-page-wrapper)/ai-chat/components/ChatMessage.tsx",
          test_code: "test_plan_item_5_0()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 0,
        },
        {
          title:
            "Implement role-based styling (user: blue background right-aligned, assistant: gray background left-aligned)",
          file: "apps/web/app/(use-page-wrapper)/ai-chat/components/ChatInput.tsx",
          test_code: "test_plan_item_5_1()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 1,
        },
        {
          title: "Integrate react-markdown for assistant content rendering",
          file: "apps/web/app/(use-page-wrapper)/ai-chat/components/WelcomeMessage.tsx",
          test_code: "test_plan_item_5_2()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 2,
        },
        {
          title: "Add syntax highlighting for code blocks",
          file: "apps/web/public/static/locales/en/common.json",
          test_code: "test_plan_item_5_3()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 3,
        },
        {
          title: "Add copy button for code snippets",
          file: "apps/web/app/(use-page-wrapper)/ai-chat/components/*.test.tsx",
          test_code: "test_plan_item_5_4()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 4,
        },
        {
          title:
            "Create apps/web/app/(use-page-wrapper)/ai-chat/components/ChatInput.tsx",
          file: "TBD",
          test_code: "test_plan_item_5_5()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 5,
        },
        {
          title:
            "Implement auto-resize textarea with character counter (X/4000)",
          file: "TBD",
          test_code: "test_plan_item_5_6()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 6,
        },
        {
          title: "Add send button (Enter submits, Shift+Enter for newline)",
          file: "TBD",
          test_code: "test_plan_item_5_7()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 7,
        },
        {
          title: "Add rate limit indicator showing current usage/limit",
          file: "TBD",
          test_code: "test_plan_item_5_8()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 8,
        },
        {
          title: "Handle disabled state and countdown timer",
          file: "TBD",
          test_code: "test_plan_item_5_9()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 9,
        },
        {
          title:
            "Create apps/web/app/(use-page-wrapper)/ai-chat/components/WelcomeMessage.tsx",
          file: "TBD",
          test_code: "test_plan_item_5_10()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 10,
        },
        {
          title: "Display welcome header with capabilities list",
          file: "TBD",
          test_code: "test_plan_item_5_11()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 11,
        },
        {
          title:
            "Add clickable example questions that trigger onExampleClick callback",
          file: "TBD",
          test_code: "test_plan_item_5_12()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 12,
        },
        {
          title: "Add privacy notice about data access limitations",
          file: "TBD",
          test_code: "test_plan_item_5_13()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 13,
        },
        {
          title:
            "Add all i18n strings to apps/web/public/static/locales/en/common.json under ai_chat namespace",
          file: "TBD",
          test_code: "test_plan_item_5_14()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 14,
        },
        {
          title:
            "Write unit tests for each component using React Testing Library",
          file: "TBD",
          test_code: "test_plan_item_5_15()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 15,
        },
      ],
    },
  ],
  plan_item_6: [
    {
      title: "Phase 7: Chat Container & Page Integration",
      order: 6,
      tasks: [
        {
          title:
            "Create apps/web/app/(use-page-wrapper)/ai-chat/components/ChatContainer.tsx",
          file: "apps/web/app/(use-page-wrapper)/ai-chat/components/ChatContainer.tsx",
          test_code: "test_plan_item_6_0()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 0,
        },
        {
          title:
            "Implement React state: messages array, isLoading boolean, error string|null, rateLimit object",
          file: "apps/web/app/(use-page-wrapper)/ai-chat/components/ChatContainer.test.tsx",
          test_code: "test_plan_item_6_1()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 1,
        },
        {
          title:
            "Integrate trpc.viewer.loggedInViewer.aiChat.sendMessage.useMutation()",
          file: "apps/web/app/(use-page-wrapper)/ai-chat/page.tsx",
          test_code: "test_plan_item_6_2()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 2,
        },
        {
          title: "Render WelcomeMessage when messages.length === 0",
          file: "apps/web/app/(use-page-wrapper)/components/Sidebar.tsx or equivalent",
          test_code: "test_plan_item_6_3()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 3,
        },
        {
          title: "Render messages array mapping each to ChatMessage component",
          file: "TBD",
          test_code: "test_plan_item_6_4()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 4,
        },
        {
          title: "Integrate ChatInput at bottom with onSubmit handler",
          file: "TBD",
          test_code: "test_plan_item_6_5()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 5,
        },
        {
          title:
            "Implement handleSendMessage() with validation, state updates, API call, and error handling",
          file: "TBD",
          test_code: "test_plan_item_6_6()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 6,
        },
        {
          title: "Add auto-scroll to bottom on new messages",
          file: "TBD",
          test_code: "test_plan_item_6_7()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 7,
        },
        {
          title: "Show loading indicator and error banner as appropriate",
          file: "TBD",
          test_code: "test_plan_item_6_8()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 8,
        },
        {
          title:
            "Handle rate limit state by disabling input and showing countdown",
          file: "TBD",
          test_code: "test_plan_item_6_9()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 9,
        },
        {
          title: "Create apps/web/app/(use-page-wrapper)/ai-chat/page.tsx",
          file: "TBD",
          test_code: "test_plan_item_6_10()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 10,
        },
        {
          title: "Set page metadata (title, description, OpenGraph tags)",
          file: "TBD",
          test_code: "test_plan_item_6_11()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 11,
        },
        {
          title:
            "Use dashboard layout wrapper (existing (use-page-wrapper) layout)",
          file: "TBD",
          test_code: "test_plan_item_6_12()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 12,
        },
        {
          title: "Render ChatContainer as main content",
          file: "TBD",
          test_code: "test_plan_item_6_13()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 13,
        },
        {
          title: "Import and use useTranslations hook from next-intl",
          file: "TBD",
          test_code: "test_plan_item_6_14()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 14,
        },
        {
          title: "Add page header with title",
          file: "TBD",
          test_code: "test_plan_item_6_15()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 15,
        },
        {
          title:
            "Locate sidebar/navigation component and add 'AI Assistant' link under Help & Support section",
          file: "TBD",
          test_code: "test_plan_item_6_16()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 16,
        },
        {
          title: "Test navigation from sidebar to chat page works",
          file: "TBD",
          test_code: "test_plan_item_6_17()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 17,
        },
      ],
    },
  ],
  plan_item_7: [
    {
      title: "Phase 8: Unit & Integration Testing",
      order: 7,
      tasks: [
        {
          title:
            "Write unit tests for AiChatService covering: happy path, rate limit, invalid input, provider errors (all types), retry logic, and metadata logging",
          file: "packages/features/ai-chat/**/*.test.ts",
          test_code: "test_plan_item_7_0()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 0,
        },
        {
          title:
            "Write unit tests for PrismaAiChatInteractionRepository covering: logInteraction(), usage queries, and error handling",
          file: "packages/features/ai-chat/**/*.integration-test.ts",
          test_code: "test_plan_item_7_1()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 1,
        },
        {
          title:
            "Write unit tests for PerUserRateLimiter covering: checkLimit(), recordUsage(), counter expiry, and Redis failures",
          file: "TBD",
          test_code: "test_plan_item_7_2()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 2,
        },
        {
          title:
            "Write unit tests for OpenAIProvider covering: generateResponse(), error handling, and latency calculation",
          file: "TBD",
          test_code: "test_plan_item_7_3()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 3,
        },
        {
          title:
            "Write unit tests for NoOpProvider covering: mock responses and error throwing",
          file: "TBD",
          test_code: "test_plan_item_7_4()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 4,
        },
        {
          title:
            "Write unit tests for ChatMessage covering: user/assistant rendering, markdown, copy button, and accessibility",
          file: "TBD",
          test_code: "test_plan_item_7_5()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 5,
        },
        {
          title:
            "Write unit tests for ChatInput covering: input validation, character counting, send behavior, and rate limit display",
          file: "TBD",
          test_code: "test_plan_item_7_6()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 6,
        },
        {
          title:
            "Write unit tests for WelcomeMessage covering: rendering and example clicking",
          file: "TBD",
          test_code: "test_plan_item_7_7()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 7,
        },
        {
          title:
            "Write integration tests for AiChatService with test database and test Redis",
          file: "TBD",
          test_code: "test_plan_item_7_8()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 8,
        },
        {
          title:
            "Run vitest with coverage: yarn vitest run packages/features/ai-chat --coverage",
          file: "TBD",
          test_code: "test_plan_item_7_9()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 9,
        },
        {
          title: "Review coverage report and add tests for uncovered code",
          file: "TBD",
          test_code: "test_plan_item_7_10()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 10,
        },
      ],
    },
  ],
  plan_item_8: [
    {
      title: "Phase 9: E2E Testing with Playwright",
      order: 8,
      tasks: [
        {
          title: "Create apps/web/e2e/ai-chat.e2e.ts",
          file: "apps/web/e2e/ai-chat.e2e.ts",
          test_code: "test_plan_item_8_0()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 0,
        },
        {
          title: "Setup test fixture with authenticated user login",
          file: "TBD",
          test_code: "test_plan_item_8_1()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 1,
        },
        {
          title:
            "Write test: 'user navigates to AI chat page and sees welcome message'",
          file: "TBD",
          test_code: "test_plan_item_8_2()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 2,
        },
        {
          title:
            "Write test: 'user clicks example question and it populates input'",
          file: "TBD",
          test_code: "test_plan_item_8_3()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 3,
        },
        {
          title:
            "Write test: 'user sends message and receives assistant response'",
          file: "TBD",
          test_code: "test_plan_item_8_4()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 4,
        },
        {
          title:
            "Write test: 'user sees loading state while waiting for response'",
          file: "TBD",
          test_code: "test_plan_item_8_5()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 5,
        },
        {
          title:
            "Write test: 'user sees error message when provider fails and can retry'",
          file: "TBD",
          test_code: "test_plan_item_8_6()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 6,
        },
        {
          title:
            "Write test: 'user is rate limited after sending too many messages'",
          file: "TBD",
          test_code: "test_plan_item_8_7()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 7,
        },
        {
          title:
            "Write test: 'user can send another message after rate limit expires'",
          file: "TBD",
          test_code: "test_plan_item_8_8()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 8,
        },
        {
          title:
            "Write test: 'accessibility - keyboard navigation works for all interactions'",
          file: "TBD",
          test_code: "test_plan_item_8_9()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 9,
        },
        {
          title:
            "Write test: 'accessibility - screen reader announces new messages'",
          file: "TBD",
          test_code: "test_plan_item_8_10()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 10,
        },
        {
          title: "Add test.describe() to group related tests",
          file: "TBD",
          test_code: "test_plan_item_8_11()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 11,
        },
        {
          title: "Use data-testid attributes for stable selectors",
          file: "TBD",
          test_code: "test_plan_item_8_12()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 12,
        },
        {
          title: "Add cleanup in afterEach() if needed",
          file: "TBD",
          test_code: "test_plan_item_8_13()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 13,
        },
        {
          title: "Configure test to run with PLAYWRIGHT_HEADLESS=1",
          file: "TBD",
          test_code: "test_plan_item_8_14()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 14,
        },
      ],
    },
  ],
  plan_item_9: [
    {
      title: "Phase 10: Infrastructure, Monitoring & Documentation",
      order: 9,
      tasks: [
        {
          title: "Add logging statements in AiChatService using criticalLogger",
          file: "packages/features/ai-chat/lib/AiChatService.ts",
          test_code: "test_plan_item_9_0()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 0,
        },
        {
          title:
            "Log structured JSON: {timestamp, level, service, requestId, userId (hashed), event, data: {...}}",
          file: ".env.example",
          test_code: "test_plan_item_9_1()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 1,
        },
        {
          title: "Ensure all message content is redacted from logs",
          file: "turbo.json",
          test_code: "test_plan_item_9_2()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 2,
        },
        {
          title:
            "Emit metrics for: token usage (input, output, total) and latency on every response",
          file: "packages/features/ai-chat/README.md",
          test_code: "test_plan_item_9_3()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 3,
        },
        {
          title:
            "Configure alert rules: error rate >5% (5 min), p95 latency >12s (10 min), provider outage >50% error rate (2 min), and unusual usage spikes",
          file: "agents/ai-chat-architecture.md",
          test_code: "test_plan_item_9_4()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 4,
        },
        {
          title:
            "Update .env.example with all AI_CHAT_* and OPENAI_* variables with descriptions",
          file: "agents/ai-chat-development.md",
          test_code: "test_plan_item_9_5()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 5,
        },
        {
          title:
            "Update turbo.json globalEnv array with new environment variables",
          file: "agents/ai-chat-operations.md",
          test_code: "test_plan_item_9_6()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 6,
        },
        {
          title:
            "Create packages/features/ai-chat/README.md with: architecture, file structure, usage guide, environment variables, testing, and troubleshooting",
          file: "agents/AGENTS.md",
          test_code: "test_plan_item_9_7()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 7,
        },
        {
          title:
            "Create agents/ai-chat-architecture.md with diagrams and data flow",
          file: "TBD",
          test_code: "test_plan_item_9_8()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 8,
        },
        {
          title: "Create agents/ai-chat-development.md with extension guides",
          file: "TBD",
          test_code: "test_plan_item_9_9()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 9,
        },
        {
          title:
            "Create agents/ai-chat-operations.md with runbooks and alerting procedures",
          file: "TBD",
          test_code: "test_plan_item_9_10()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 10,
        },
        {
          title: "Update AGENTS.md to reference new AI chat documentation",
          file: "TBD",
          test_code: "test_plan_item_9_11()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 11,
        },
      ],
    },
  ],
  plan_item_10: [
    {
      title: "Phase 11: Validation & Launch Preparation",
      order: 10,
      tasks: [
        {
          title:
            "Run type checking: yarn type-check:ci --force packages/features/ai-chat",
          file: "packages/features/ai-chat/**/*",
          test_code: "test_plan_item_10_0()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 0,
        },
        {
          title: "Run type checking: yarn type-check:ci --force packages/trpc",
          file: "packages/trpc/**/*",
          test_code: "test_plan_item_10_1()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 1,
        },
        {
          title: "Run type checking: yarn type-check:ci --force apps/web",
          file: "apps/web/**/*",
          test_code: "test_plan_item_10_2()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 2,
        },
        {
          title: "Fix all type errors before proceeding",
          file: "TBD",
          test_code: "test_plan_item_10_3()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 3,
        },
        {
          title:
            "Run linting: yarn biome check --write packages/features/ai-chat",
          file: "TBD",
          test_code: "test_plan_item_10_4()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 4,
        },
        {
          title:
            "Run linting: yarn biome check --write apps/web/app/(use-page-wrapper)/ai-chat",
          file: "TBD",
          test_code: "test_plan_item_10_5()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 5,
        },
        {
          title: "Fix all linting warnings and errors",
          file: "TBD",
          test_code: "test_plan_item_10_6()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 6,
        },
        {
          title: "Verify Biome formatting applied correctly",
          file: "TBD",
          test_code: "test_plan_item_10_7()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 7,
        },
        {
          title:
            "Run full unit test suite: yarn vitest run packages/features/ai-chat --coverage",
          file: "TBD",
          test_code: "test_plan_item_10_8()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 8,
        },
        {
          title:
            "Run full integration test suite: yarn test packages/features/ai-chat -- --integrationTestsOnly",
          file: "TBD",
          test_code: "test_plan_item_10_9()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 9,
        },
        {
          title:
            "Run full E2E test suite: PLAYWRIGHT_HEADLESS=1 yarn e2e ai-chat.e2e.ts",
          file: "TBD",
          test_code: "test_plan_item_10_10()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 10,
        },
        {
          title:
            "Validate against success criteria: 10% MAU adoption (can't verify yet), median response <3s (can't verify yet), error rate <1% (can't verify yet), tests pass, code quality gates pass",
          file: "TBD",
          test_code: "test_plan_item_10_11()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 11,
        },
        {
          title: "Document any known issues or limitations in README",
          file: "TBD",
          test_code: "test_plan_item_10_12()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 12,
        },
        {
          title: "Prepare deployment notes and rollback plan if needed",
          file: "TBD",
          test_code: "test_plan_item_10_13()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 13,
        },
        {
          title:
            "Confirm all environment variables are set for production environment",
          file: "TBD",
          test_code: "test_plan_item_10_14()",
          test_diff: "",
          codegen_diff: "",
          test_results: [],
          tests_total: 1,
          tests_passed: 1,
          order: 14,
        },
      ],
    },
  ],
};

// --- Sub-components ---

const StatusBadge = ({ status, tests }: { status: string; tests: any }) => {
  if (status === "completed") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold border border-emerald-100">
        <CheckCircle2 className="w-3 h-3" />
        <span>PASS</span>
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black text-white rounded text-[9px] font-bold border border-black">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>RUNNING</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-50 text-primary-color rounded text-[9px] font-bold border border-zinc-100">
      <Circle className="w-3 h-3" />
      <span>WAITING</span>
    </div>
  );
};

// Simple Syntax Highlighter
const SimpleCodeBlock = ({ code }: { code: string }) => {
  if (!code)
    return (
      <span className="text-primary-color italic font-mono text-[10px]">
        Waiting for generation...
      </span>
    );

  const KEYWORDS = new Set([
    "import",
    "from",
    "const",
    "let",
    "var",
    "async",
    "await",
    "function",
    "return",
    "if",
    "else",
    "try",
    "catch",
    "describe",
    "test",
    "it",
    "expect",
    "new",
    "export",
    "default",
    "class",
    "interface",
    "type",
  ]);

  const lines = code.split("\n");

  return (
    <div className="font-mono text-[10px] leading-relaxed">
      {lines.map((line: string, i: number) => {
        if (line.trim().startsWith("//")) {
          return (
            <div key={i} className="text-primary-color whitespace-pre">
              {line}
            </div>
          );
        }
        const parts = line.split(/(\s+|[(){}[\].,;:'"`])/);

        return (
          <div key={i} className="whitespace-pre">
            {parts.map((part: string, j: number) => {
              if (KEYWORDS.has(part))
                return (
                  <span key={j} className="text-purple-500 font-semibold">
                    {part}
                  </span>
                );
              if (part.match(/^['"`].*['"`]$/))
                return (
                  <span key={j} className="text-emerald-600">
                    {part}
                  </span>
                );
              if (part.match(/^['"`]/))
                return (
                  <span key={j} className="text-emerald-600">
                    {part}
                  </span>
                );
              if (
                /^\w+$/.test(part) &&
                j < parts.length - 1 &&
                parts[j + 1].trim() === "("
              ) {
                return (
                  <span key={j} className="text-primary-color">
                    {part}
                  </span>
                );
              }
              if (/^\d+$/.test(part))
                return (
                  <span key={j} className="text-orange-500">
                    {part}
                  </span>
                );

              return (
                <span key={j} className="text-primary-color">
                  {part}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// Helper function to map API status to UI status
const mapApiStatusToUI = (apiStatus: string): string => {
  const statusMap: Record<string, string> = {
    PENDING: "pending",
    IN_PROGRESS: "running",
    COMPLETED: "completed",
    FAILED: "failed",
  };
  return statusMap[apiStatus] || apiStatus.toLowerCase();
};

// New MockTaskCard component handling inline expansion with test_diff and codegen_diff
const MockTaskCard = ({
  task,
  isExpanded,
  onToggle,
  taskIndex,
  phaseIndex,
}: {
  task: MockTask;
  isExpanded: boolean;
  onToggle: () => void;
  taskIndex: number;
  phaseIndex: number;
}) => {
  const [activeTab, setActiveTab] = React.useState<
    "test_diff" | "codegen" | "test_code"
  >("test_diff");
  const [isGeneratingCode, setIsGeneratingCode] = React.useState(false);
  const [streamedCode, setStreamedCode] = React.useState("");
  const [codeGenComplete, setCodeGenComplete] = React.useState(false);

  const hasTestDiff = task.test_diff && task.test_diff.length > 0;
  const hasCodegenDiff = task.codegen_diff && task.codegen_diff.length > 0;

  // Streaming code generation simulation
  const handleCodeGen = useCallback(() => {
    if (!hasTestDiff || isGeneratingCode) return;

    setIsGeneratingCode(true);
    setStreamedCode("");
    setActiveTab("codegen");

    // Use codegen_diff if available, otherwise generate placeholder based on test_diff
    const codeToStream = hasCodegenDiff 
      ? task.codegen_diff 
      : `// Generated implementation for:\n// ${task.title}\n// File: ${task.file}\n\n// Implementation based on test requirements:\n${task.test_diff}`;
    
    let currentIndex = 0;
    const charsPerTick = 3; // Characters to add per tick
    const tickInterval = 20; // Milliseconds between ticks

    const streamInterval = setInterval(() => {
      if (currentIndex < codeToStream.length) {
        const nextChunk = codeToStream.slice(
          currentIndex,
          currentIndex + charsPerTick
        );
        setStreamedCode((prev) => prev + nextChunk);
        currentIndex += charsPerTick;
      } else {
        clearInterval(streamInterval);
        setIsGeneratingCode(false);
        setCodeGenComplete(true);
      }
    }, tickInterval);

    return () => clearInterval(streamInterval);
  }, [hasTestDiff, hasCodegenDiff, isGeneratingCode, task.codegen_diff, task.test_diff, task.title, task.file]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div
      className={`
      bg-background border rounded-xl transition-all duration-300 overflow-hidden
      ${isExpanded ? "ring-1 ring-zinc-900 border-zinc-900 shadow-md" : "border-zinc-200 hover:border-zinc-300"}
    `}
    style={{ backgroundColor: "#FFF9F5" }}
    >
      {/* Header (Clickable for toggle) */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer flex flex-col gap-3 relative"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-md ${codeGenComplete ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-primary-color"}`}
            >
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-primary-color">
                {task.title}
              </div>
              <div className="text-[10px] font-mono text-primary-color">
                {task.file}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold border ${
                codeGenComplete
                  ? "bg-emerald-100 text-emerald-700 border-emerald-100"
                  : isGeneratingCode
                    ? "bg-blue-100 text-blue-700 border-blue-100"
                    : "bg-zinc-50 text-primary-color border-zinc-100"
              }`}
            >
              {codeGenComplete ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>COMPLETE</span>
                </>
              ) : isGeneratingCode ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>GENERATING</span>
                </>
              ) : (
                <>
                  <Circle className="w-3 h-3" />
                  <span>
                    {task.tests_passed}/{task.tests_total} TESTS
                  </span>
                </>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-primary-color transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {/* Progress bar when generating */}
        {isGeneratingCode && (
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{
                width: `${(streamedCode.length / (task.codegen_diff?.length || 1)) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 animate-in slide-in-from-top-2 duration-200">
          {/* Tabs */}
          <div className="flex items-center justify-between px-4 border-b border-zinc-100 bg-background">
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("test_diff");
                }}
                className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "test_diff" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
              >
                <TestTube className="w-3 h-3" />
                Test Diff
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("test_code");
                }}
                className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "test_code" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
              >
                <ShieldCheck className="w-3 h-3" />
                Test Code
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("codegen");
                }}
                className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "codegen" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
              >
                <FileDiff className="w-3 h-3" />
                Code Gen
                {codeGenComplete && (
                  <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[9px]">
                    ✓
                  </span>
                )}
              </button>
            </div>

            {/* Code Gen Button */}
            {activeTab === "codegen" && !codeGenComplete && hasTestDiff && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCodeGen();
                }}
                disabled={isGeneratingCode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                  isGeneratingCode
                    ? "bg-blue-100 text-blue-700 cursor-not-allowed"
                    : "bg-accent-color text-primary-color hover:bg-[#006B66] hover:text-accent-color"
                }`}
              >
                {isGeneratingCode ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Generate Code
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tab Views */}
          <div className="p-4 min-h-[200px]">
            {/* Test Diff Tab */}
            {activeTab === "test_diff" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TestTube className="w-3.5 h-3.5 text-primary-color" />
                    <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                      Expected Test Changes
                    </span>
                  </div>
                  {hasTestDiff && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(task.test_diff);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-primary-color hover:bg-zinc-100 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  )}
                </div>

                {hasTestDiff ? (
                  <div className="bg-background rounded-lg border border-zinc-200 overflow-hidden">
                    <div className="px-3 py-2 bg-zinc-50/80 border-b border-zinc-100 flex items-center gap-2">
                      <FileText className="w-3 h-3 text-primary-color" />
                      <span className="text-[10px] font-mono font-medium text-primary-color">
                        {task.file}
                      </span>
                    </div>
                    <pre className="p-3 overflow-x-auto text-[10px] font-mono leading-relaxed bg-background max-h-[300px] overflow-y-auto">
                      {task.test_diff
                        .split("\n")
                        .map((line: string, i: number) => (
                          <div
                            key={i}
                            className={`${
                              line.startsWith("+")
                                ? "bg-emerald-50 text-emerald-900 -mx-3 px-3"
                                : line.startsWith("-")
                                  ? "bg-red-50 text-red-900 -mx-3 px-3"
                                  : "text-primary-color"
                            }`}
                          >
                            <span className="inline-block w-6 text-primary-color select-none text-right mr-3 border-r border-zinc-100 pr-2">
                              {i + 1}
                            </span>
                            {line}
                          </div>
                        ))}
                    </pre>
                  </div>
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-primary-color border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                    <TestTube className="w-6 h-6 mb-3 opacity-50" />
                    <p className="text-xs font-bold">No test diff available</p>
                  </div>
                )}
              </div>
            )}

            {/* Test Code Tab */}
            {activeTab === "test_code" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary-color" />
                    <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                      Test Code Definition
                    </span>
                  </div>
                  {task.test_code && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(task.test_code);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-primary-color hover:bg-zinc-100 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  )}
                </div>

                <div className="bg-background rounded-lg border border-zinc-200 overflow-hidden">
                  <div className="p-4 overflow-x-auto max-h-[300px] overflow-y-auto">
                    <SimpleCodeBlock code={task.test_code || ""} />
                  </div>
                </div>
              </div>
            )}

            {/* Code Gen Tab */}
            {activeTab === "codegen" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileDiff className="w-3.5 h-3.5 text-primary-color" />
                    <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                      Generated Code
                    </span>
                    {isGeneratingCode && (
                      <span className="text-[9px] text-blue-600 animate-pulse">
                        Streaming...
                      </span>
                    )}
                  </div>
                  {(streamedCode || codeGenComplete) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(task.codegen_diff);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-primary-color hover:bg-zinc-100 rounded transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  )}
                </div>

                {!streamedCode && !isGeneratingCode && !codeGenComplete ? (
                  <div className="h-40 flex flex-col items-center justify-center text-primary-color border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                    <Sparkles className="w-8 h-8 mb-3 opacity-50 text-primary-color" />
                    {hasTestDiff ? (
                      <>
                        <p className="text-xs font-bold text-primary-color">
                          Ready to generate code
                        </p>
                        <p className="text-[10px] text-primary-color mt-1">
                          Click "Generate Code" button to start
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-primary-color">
                          No code generation available
                        </p>
                        <p className="text-[10px] text-primary-color mt-1">
                          This task doesn't have test diff defined
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden">
                    <div className="px-3 py-2 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-zinc-400" />
                        <span className="text-[10px] font-mono font-medium text-zinc-300">
                          {task.file}
                        </span>
                      </div>
                      {codeGenComplete && (
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Complete
                        </span>
                      )}
                    </div>
                    <pre className="p-3 overflow-x-auto text-[10px] font-mono leading-relaxed text-zinc-100 max-h-[300px] overflow-y-auto">
                      {(streamedCode || "")
                        .split("\n")
                        .map((line: string, i: number) => (
                          <div key={i} className="text-zinc-100">
                            <span className="inline-block w-6 text-zinc-500 select-none text-right mr-3 border-r border-zinc-700 pr-2">
                              {i + 1}
                            </span>
                            {line}
                          </div>
                        ))}
                      {isGeneratingCode && (
                        <span className="inline-block w-2 h-4 bg-zinc-100 animate-pulse ml-1" />
                      )}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Legacy TaskCard component for API data (kept for backward compatibility)
const TaskCard = ({
  task,
  isExpanded,
  onToggle,
}: {
  task: import("@/lib/types/spec").TaskItem;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const hasChanges = task.changes && task.changes.length > 0;
  // Default to 'logs' if no changes (Verification task), otherwise 'diff'
  const [activeTab, setActiveTab] = React.useState(
    hasChanges ? "diff" : "logs"
  );
  // Map API status to UI status
  const uiStatus = mapApiStatusToUI(task.status);
  const isPending = uiStatus === "pending";

  return (
    <div
      className={`
      bg-background border rounded-xl transition-all duration-300 overflow-hidden
      ${isExpanded ? "ring-1 ring-zinc-900 border-zinc-900 shadow-md" : "border-zinc-200 hover:border-zinc-300"}
      ${uiStatus === "running" && !isExpanded ? "shadow-lg shadow-blue-50 border-blue-200" : ""}
    `}
    >
      {/* Header (Clickable for toggle) */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer flex flex-col gap-3 relative"
      >
        {uiStatus === "running" && !isExpanded && (
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-md ${uiStatus === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-primary-color"}`}
            >
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-primary-color">
                {task.title}
              </div>
              <div className="text-[10px] font-mono text-primary-color">
                {task.file}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={uiStatus} tests={task.tests} />
            <ChevronDown
              className={`w-4 h-4 text-primary-color transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {/* Mini Progress Bar */}
        {uiStatus === "running" && !isExpanded && (
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{
                width: `${(task.tests.passed / (task.tests.total || 1)) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 animate-in slide-in-from-top-2 duration-200">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 border-b border-zinc-100 bg-background">
            {hasChanges && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("diff");
                }}
                className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "diff" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
              >
                <FileDiff className="w-3 h-3" />
                Code Changes{" "}
                <span className="text-primary-color font-normal">
                  ({task.changes?.length || 0})
                </span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("tests");
              }}
              className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "tests" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
            >
              <TestTube className="w-3 h-3" />
              Verification
              {uiStatus === "completed" && (
                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[9px]">
                  {task.tests.passed}/{task.tests.total}
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("logs");
              }}
              className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "logs" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
            >
              <ScrollText className="w-3 h-3" />
              Logs
            </button>
          </div>

          {/* Tab Views */}
          <div className="p-4 min-h-[160px]">
            {activeTab === "diff" &&
              hasChanges &&
              (isPending ? (
                <div className="h-32 flex flex-col items-center justify-center text-primary-color border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <Hourglass className="w-6 h-6 mb-3 opacity-50 animate-pulse text-primary-color" />
                  <p className="text-xs font-bold text-primary-color">
                    Waiting to generate code...
                  </p>
                  <p className="text-[10px] text-primary-color mt-1">
                    Files will appear here when execution starts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {task.changes?.map(
                    (
                      change: { path: string; lang: string; content: string },
                      idx: number
                    ) => (
                      <div
                        key={idx}
                        className="bg-background rounded-lg border border-zinc-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className="px-3 py-2 bg-zinc-50/80 border-b border-zinc-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-primary-color" />
                            <span className="text-[10px] font-mono font-medium text-primary-color">
                              {change.path}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-primary-color uppercase">
                              {change.lang}
                            </span>
                            <Copy className="w-3 h-3 text-primary-color cursor-pointer hover:text-primary-color" />
                          </div>
                        </div>
                        {change.content ? (
                          <pre className="p-3 overflow-x-auto text-[10px] font-mono leading-relaxed bg-background">
                            {change.content
                              .split("\n")
                              .map((line: string, i: number) => (
                                <div
                                  key={i}
                                  className={`${line.startsWith("+") ? "bg-emerald-50 text-emerald-900 w-full block -mx-3 px-3" : "text-primary-color"}`}
                                >
                                  <span className="inline-block w-6 text-primary-color select-none text-right mr-3 border-r border-zinc-100 pr-2">
                                    {i + 1}
                                  </span>
                                  {line}
                                </div>
                              ))}
                          </pre>
                        ) : (
                          <div className="p-4 text-center text-[10px] font-mono text-primary-color italic bg-background flex flex-col items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary-color" />
                            <span className="text-primary-color">
                              Generating diff...
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ))}

            {activeTab === "tests" && (
              <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* 1. Test Definition */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary-color" />
                    <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                      Test Suite Definition
                    </span>
                  </div>
                  <div className="bg-background rounded-lg border border-zinc-200 overflow-hidden relative group">
                    <div className="p-4 overflow-x-auto">
                      <SimpleCodeBlock code={task.testCode || ""} />
                    </div>
                  </div>
                </div>

                {/* 2. Live Results */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-primary-color" />
                    <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                      Live Execution Results
                    </span>
                  </div>
                  <div className="bg-background border border-zinc-200 rounded-lg divide-y divide-zinc-50">
                    {task.testResults && task.testResults.length > 0 ? (
                      task.testResults.map(
                        (
                          test: import("@/lib/types/spec").TaskTestResult,
                          i: number
                        ) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3"
                          >
                            <div className="flex items-center gap-3">
                              {uiStatus === "completed" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-primary-color" />
                              )}
                              <span
                                className={`text-[11px] font-medium ${uiStatus === "completed" ? "text-primary-color" : "text-primary-color"}`}
                              >
                                {test.name}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                uiStatus === "completed"
                                  ? test.status === "PASSED"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                  : "bg-zinc-100 text-primary-color"
                              }`}
                            >
                              {uiStatus === "completed"
                                ? test.status === "PASSED"
                                  ? "PASSED"
                                  : "FAILED"
                                : "PENDING"}
                            </span>
                          </div>
                        )
                      )
                    ) : (
                      <div className="p-3 text-[11px] text-primary-color italic">
                        No test results available yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "logs" && (
              <div className="bg-zinc-900 rounded-lg p-3 font-mono text-[10px] text-zinc-300 space-y-1.5 min-h-[150px] max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                {task.logs && task.logs.length > 0 ? (
                  task.logs.map((log: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-primary-color select-none">
                        {">"}
                      </span>
                      <span>{log}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-primary-color italic">
                    Waiting for logs...
                  </div>
                )}

                {uiStatus === "running" && (
                  <div className="animate-pulse text-primary-color">_</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function VerticalTaskExecution() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Note: taskId in URL is actually recipeId now
  const recipeId = params?.taskId as string;
  const planIdFromUrl = searchParams.get("planId");
  const itemNumberFromUrl = searchParams.get("itemNumber");
  const taskSplittingIdFromUrl = searchParams.get("taskSplittingId");

  // Use mock data mode - set to true to use mock data
  const [useMockData, setUseMockData] = useState(true);
  const [activePlanItemKey, setActivePlanItemKey] = useState("plan_item_0");
  const [expandedMockTaskKey, setExpandedMockTaskKey] = useState<string | null>(
    null
  );

  const [activeSliceId, setActiveSliceId] = useState(
    itemNumberFromUrl ? parseInt(itemNumberFromUrl) : 1
  );
  const [completedSlices, setCompletedSlices] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Task Splitting API State
  const [planId, setPlanId] = useState<string | null>(planIdFromUrl);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isLoadingPlanItems, setIsLoadingPlanItems] = useState(false);
  const [taskSplittingId, setTaskSplittingId] = useState<string | null>(
    taskSplittingIdFromUrl || null
  );
  const [taskSplittingStatus, setTaskSplittingStatus] =
    useState<TaskSplittingStatusResponse | null>(null);
  const [allLayers, setAllLayers] = useState<TaskLayer[]>([]);
  const [nextLayerOrder, setNextLayerOrder] = useState<number | null>(0);
  const [isLoadingLayers, setIsLoadingLayers] = useState(false);

  // Graph Loading & Data State
  const [currentDag, setCurrentDag] = useState<TaskLayer[]>([]); // Array of layers from API
  const [isGraphLoading, setIsGraphLoading] = useState(true); // Start as loading
  const [graphLoadIndex, setGraphLoadIndex] = useState(0); // Tracks how many levels are shown

  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const [showGlobalLogs, setShowGlobalLogs] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Get mock plan items for sidebar
  const mockPlanItemKeys = Object.keys(MOCK_PLAN_DATA).sort((a, b) => {
    const orderA = MOCK_PLAN_DATA[a]?.[0]?.order || 0;
    const orderB = MOCK_PLAN_DATA[b]?.[0]?.order || 0;
    return orderA - orderB;
  });

  const activeMockPhase = MOCK_PLAN_DATA[activePlanItemKey]?.[0];

  // Get plan_id from URL or try to get latest plan for recipe
  useEffect(() => {
    if (!planId && recipeId) {
      // Try to get latest plan for this recipe
      PlanService.getPlanStatusByRecipeId(recipeId)
        .then((status) => {
          if (status.plan_id) {
            setPlanId(status.plan_id);
            const params = new URLSearchParams(searchParams.toString());
            params.set("planId", status.plan_id);
            // Default to item 1 if no itemNumber specified
            if (!params.get("itemNumber")) {
              params.set("itemNumber", "1");
            }
            router.replace(`/task/${recipeId}/code?${params.toString()}`);
          }
        })
        .catch((error) => {
          console.error("Error fetching plan status:", error);
        });
    }
  }, [planId, recipeId]);

  // Submit task splitting when we have planId and itemNumber but no taskSplittingId
  useEffect(() => {
    if (!planId || !activeSliceId || taskSplittingId) return;
    // Wait for plan items to be loaded before submitting
    if (planItems.length === 0 || isLoadingPlanItems) return;

    // Priority 1: Check URL parameter
    if (taskSplittingIdFromUrl) {
      setTaskSplittingId(taskSplittingIdFromUrl);
      localStorage.setItem(
        `task_splitting_${planId}_${activeSliceId}`,
        taskSplittingIdFromUrl
      );
      return;
    }

    // Priority 2: Check localStorage
    const storedTaskSplittingId = localStorage.getItem(
      `task_splitting_${planId}_${activeSliceId}`
    );
    if (storedTaskSplittingId) {
      setTaskSplittingId(storedTaskSplittingId);
      return;
    }

    // Priority 3: Submit new task splitting request
    const submitTaskSplitting = async () => {
      try {
        // Find the plan item by item_number to get its id (plan_item_id)
        const planItem = planItems.find(
          (item) => item.item_number === activeSliceId
        );
        if (!planItem) {
          console.error(
            "[Code Page] Plan item not found for item_number:",
            activeSliceId
          );
          console.error(
            "[Code Page] Available plan items:",
            planItems.map((item) => item.item_number)
          );
          // Don't show error toast - just wait for plan items to load or user to select valid item
          return;
        }

        console.log(
          "[Code Page] Submitting task splitting for plan_item_id:",
          planItem.id
        );
        const response = await TaskSplittingService.submitTaskSplitting({
          plan_item_id: planItem.id,
        });
        console.log("[Code Page] Task splitting submitted:", response);
        setTaskSplittingId(response.task_splitting_id);
        localStorage.setItem(
          `task_splitting_${planId}_${activeSliceId}`,
          response.task_splitting_id
        );

        // Update URL with taskSplittingId
        const params = new URLSearchParams(searchParams.toString());
        params.set("taskSplittingId", response.task_splitting_id);
        router.replace(`/task/${recipeId}/code?${params.toString()}`);

        toast.success("Task splitting started");
      } catch (error: any) {
        console.error("[Code Page] Error submitting task splitting:", error);
        toast.error(error.message || "Failed to start task splitting");
      }
    };

    submitTaskSplitting();
  }, [
    planId,
    activeSliceId,
    taskSplittingId,
    taskSplittingIdFromUrl,
    searchParams,
    recipeId,
    router,
    planItems,
    isLoadingPlanItems,
  ]);

  // Fetch plan items for sidebar display
  useEffect(() => {
    if (!planId || planItems.length > 0) return;

    const fetchPlanItems = async () => {
      setIsLoadingPlanItems(true);
      try {
        console.log("[Code Page] Fetching plan items for planId:", planId);
        let allItems: any[] = [];
        let start = 0;
        let hasMore = true;

        while (hasMore) {
          const response = await PlanService.getPlanItems(planId, start, 20);
          allItems = [...allItems, ...response.plan_items];
          if (response.next_start === null) {
            hasMore = false;
          } else {
            start = response.next_start;
          }
        }

        console.log("[Code Page] Fetched plan items:", allItems.length);
        setPlanItems(allItems);
      } catch (error) {
        console.error("[Code Page] Error fetching plan items:", error);
      } finally {
        setIsLoadingPlanItems(false);
      }
    };

    fetchPlanItems();
  }, [planId, planItems.length]);

  // 1. Reset State when Slice Changes
  useEffect(() => {
    // Only reset if we haven't completed this slice
    if (!completedSlices.includes(activeSliceId)) {
      setCurrentDag([]);
      setAllLayers([]);
      setGlobalLogs([]);
      setGraphLoadIndex(0);
      setIsRunning(false);
      setIsGraphLoading(true); // Start the step-by-step graph loading
      setTaskSplittingId(null); // Reset task splitting ID to trigger new submission
      setTaskSplittingStatus(null); // Reset status
    } else {
      // If revisiting completed slice, show full graph immediately
      // Try to get stored task_splitting_id for this slice
      if (planId) {
        const storedTaskSplittingId = localStorage.getItem(
          `task_splitting_${planId}_${activeSliceId}`
        );
        if (
          storedTaskSplittingId &&
          storedTaskSplittingId !== taskSplittingId
        ) {
          setTaskSplittingId(storedTaskSplittingId);
        }
      }
      setCurrentDag(allLayers);
      setIsGraphLoading(false); // Already loaded
      setGraphLoadIndex(allLayers.length);
    }
  }, [activeSliceId, planId]);

  // 2. Poll for task splitting status and fetch layers
  useEffect(() => {
    if (!taskSplittingId) return;

    let mounted = true;
    let pollInterval: NodeJS.Timeout;

    // Fetch layers with pagination
    const fetchLayersWithPagination = async () => {
      try {
        console.log("[Code Page] Fetching layers with pagination");
        let allLayersData: TaskLayer[] = [];
        let start = 0;
        let hasMore = true;

        while (hasMore) {
          const response = await TaskSplittingService.getTaskSplittingItems(
            taskSplittingId,
            start,
            10
          );
          console.log(
            "[Code Page] Fetched layers:",
            response.layers.length,
            "next_layer_order:",
            response.next_layer_order
          );
          allLayersData = [...allLayersData, ...response.layers];

          if (response.next_layer_order === null) {
            hasMore = false;
          } else {
            start = response.next_layer_order;
          }
        }

        if (!mounted) return;

        setAllLayers(allLayersData);
        setNextLayerOrder(null);

        // Update current DAG for display
        if (allLayersData.length > 0) {
          setCurrentDag(allLayersData);
          setGraphLoadIndex(allLayersData.length);
        }
      } catch (error) {
        console.error("[Code Page] Error fetching layers:", error);
      }
    };

    const fetchStatusAndLayers = async () => {
      try {
        console.log(
          "[Code Page] Polling task splitting status for:",
          taskSplittingId
        );
        const status =
          await TaskSplittingService.getTaskSplittingStatus(taskSplittingId);

        if (!mounted) return;

        console.log("[Code Page] Task splitting status:", status);
        setTaskSplittingStatus(status);

        // Always fetch layers if available (even during IN_PROGRESS)
        if (status.status === "COMPLETED" || status.status === "IN_PROGRESS") {
          await fetchLayersWithPagination();
        }

        // Stop polling if task splitting is done
        if (status.status === "COMPLETED" || status.status === "FAILED") {
          if (pollInterval) clearInterval(pollInterval);

          if (status.status === "COMPLETED") {
            setIsGraphLoading(false);
          }
        }
      } catch (error) {
        console.error(
          "[Code Page] Error polling task splitting status:",
          error
        );
      }
    };

    // Initial fetch
    fetchStatusAndLayers();

    // Set up polling every 2 seconds
    pollInterval = setInterval(fetchStatusAndLayers, 2000);

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [taskSplittingId]);

  // 3. Step-by-Step Graph Discovery (Loading Phase) - progressive reveal
  useEffect(() => {
    if (!isGraphLoading) return;

    // Wait for task splitting to complete and layers to be fetched
    if (taskSplittingStatus?.status !== "COMPLETED" || allLayers.length === 0) {
      return;
    }

    // Load layers progressively
    if (graphLoadIndex < allLayers.length) {
      const timer = setTimeout(() => {
        const nextLayer = allLayers[graphLoadIndex];
        setCurrentDag((prev) => [...prev, nextLayer]);
        setGraphLoadIndex((prev) => prev + 1);
      }, 600); // 600ms delay between levels appearing

      return () => clearTimeout(timer);
    } else {
      // Done loading graph
      setIsGraphLoading(false);
    }
  }, [
    isGraphLoading,
    graphLoadIndex,
    activeSliceId,
    allLayers,
    taskSplittingStatus,
  ]);

  // 4. Poll for codegen updates (when running)
  useEffect(() => {
    if (!taskSplittingId || !isRunning) return;

    let mounted = true;

    const pollCodegenStatus = async () => {
      try {
        const status =
          await TaskSplittingService.getTaskSplittingStatus(taskSplittingId);

        if (!mounted) return;

        setTaskSplittingStatus(status);

        // If codegen is in progress or completed, fetch updated layers
        if (
          status.codegen_status === "IN_PROGRESS" ||
          status.codegen_status === "COMPLETED"
        ) {
          // Fetch all layers to get updated task statuses
          let allLayersData: TaskLayer[] = [];
          let start = 0;
          let hasMore = true;

          try {
            while (hasMore) {
              const response = await TaskSplittingService.getTaskSplittingItems(
                taskSplittingId,
                start,
                10
              );
              allLayersData = [...allLayersData, ...response.layers];
              if (response.next_layer_order === null) {
                hasMore = false;
              } else {
                start = response.next_layer_order;
              }
            }

            if (!mounted) return;

            setAllLayers(allLayersData);
            setCurrentDag(allLayersData);
          } catch (layerError) {
            console.error("[Code Page] Error fetching layers:", layerError);
          }

          // Check if all tasks are completed
          const allCompleted = allLayersData.every((layer) => {
            const layerStatus = mapApiStatusToUI(layer.status);
            return (
              layerStatus === "completed" ||
              layer.tasks.every((task) => {
                const taskStatus = mapApiStatusToUI(task.status);
                return taskStatus === "completed";
              })
            );
          });

          if (allCompleted && !completedSlices.includes(activeSliceId)) {
            setCompletedSlices((prev) => [...prev, activeSliceId]);
            setGlobalLogs((prev) => [
              ...prev,
              `SUCCESS: Vertical Slice ${String(activeSliceId).padStart(2, "0")} verified.`,
            ]);

            // Auto-advance to next slice if available
            const nextSlice = planItems.find(
              (item) => item.item_number > activeSliceId
            );
            if (nextSlice) {
              setTimeout(() => {
                setActiveSliceId(nextSlice.item_number);
              }, 1000);
            } else {
              setIsRunning(false);
            }
          }
        }

        if (
          status.codegen_status === "COMPLETED" ||
          status.codegen_status === "FAILED"
        ) {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("[Code Page] Error polling codegen status:", error);
      }
    };

    const pollInterval = setInterval(pollCodegenStatus, 2000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [taskSplittingId, isRunning, activeSliceId, completedSlices, planItems]);

  // Auto-scroll logic
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [globalLogs, showGlobalLogs]);

  // Auto-scroll sidebar
  useEffect(() => {
    if (sidebarRef.current) {
      const activeEl = sidebarRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeSliceId]);

  const isSliceComplete = completedSlices.includes(activeSliceId);
  const activeSliceMeta = planItems.find(
    (item) => item.item_number === activeSliceId
  );

  // Manual navigation
  const handleManualSliceChange = (id: number) => {
    setActiveSliceId(id);
    // Update URL with itemNumber
    const params = new URLSearchParams(searchParams.toString());
    params.set("itemNumber", id.toString());
    if (planId) {
      params.set("planId", planId);
    }
    router.replace(`/task/${recipeId}/code?${params.toString()}`);
  };

  // Show loading if we don't have planId or recipeId
  if (!planId && !recipeId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
          <p className="text-primary-color">Loading task data...</p>
        </div>
      </div>
    );
  }

  // Show loading if task splitting is being submitted
  // if (planId && !taskSplittingId && !taskSplittingStatus) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <div className="text-center">
  //         <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
  //         <p className="text-primary-color">Starting task splitting...</p>
  //         <p className="text-sm text-primary-color mt-2">Preparing execution plan for Slice {String(activeSliceId).padStart(2, '0')}</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Show loading if task splitting is in progress and no layers yet
  if (taskSplittingStatus?.status === "IN_PROGRESS" && allLayers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
          <p className="text-primary-color">
            Generating task execution plan...
          </p>
          <p className="text-sm text-primary-color mt-2">
            Step {taskSplittingStatus.current_step + 1}/2
          </p>
        </div>
      </div>
    );
  }

  // Show loading if task splitting is submitted and waiting
  if (taskSplittingStatus?.status === "SUBMITTED" && allLayers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
          <p className="text-primary-color">
            Task splitting submitted, waiting to start...
          </p>
        </div>
      </div>
    );
  }

  // Render Mock Data View
  if (useMockData) {
    return (
      <div className="h-screen bg-[#FFF9F5] text-primary-color font-sans flex flex-col md:flex-row overflow-hidden relative">
        {/* --- SIDEBAR: Plan Items Timeline --- */}
        <aside className="w-80 bg-[#FFF9F5] border-r border-zinc-200 flex flex-col z-20 shrink-0">
          <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-100 bg-zinc-50/80 backdrop-blur-sm sticky top-0">
            <h2 className="text-base font-bold text-primary-color">
              Plan Phases
            </h2>
          </div>

          <div ref={sidebarRef} className="flex-1 overflow-y-auto p-6 relative">
            {/* Continuous Vertical Line */}
            <div className="absolute left-[35px] top-6 bottom-6 w-[1px] bg-zinc-200 z-0" />

            <div className="space-y-8 relative z-10">
              {mockPlanItemKeys.map((planItemKey, idx) => {
                const phase = MOCK_PLAN_DATA[planItemKey]?.[0];
                if (!phase) return null;

                const isActive = activePlanItemKey === planItemKey;
                const taskCount = phase.tasks.length;

                return (
                  <div
                    key={planItemKey}
                    data-active={isActive}
                    className="group flex gap-4 cursor-pointer"
                    onClick={() => setActivePlanItemKey(planItemKey)}
                  >
                    {/* Timeline Node */}
                    <div
                      className={`
                        w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 bg-background relative z-10
                        ${
                          isActive
                            ? "border-primary-color text-primary-color scale-110 shadow-sm"
                            : "border-zinc-200 text-primary-color"
                        }
                      `}
                    >
                      <span className="text-[10px] font-bold">
                        {phase.order + 1}
                      </span>
                    </div>

                    {/* Text Content */}
                    <div
                      className={`flex-1 pt-0.5 transition-all duration-300 ${isActive ? "translate-x-1" : ""}`}
                    >
                      <h3
                        className={`text-xs font-bold leading-tight ${isActive ? "text-primary-color" : "text-primary-color group-hover:text-primary-color"}`}
                      >
                        {phase.title}
                      </h3>
                      <p className="text-[10px] text-primary-color leading-relaxed mt-1">
                        {taskCount} task{taskCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* --- MAIN CONTENT: Tasks --- */}
        <main className="flex-1 flex flex-col h-full min-w-0 bg-background">
          {/* Header */}
          <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-100">
            <div>
              <h1 className="text-lg font-bold text-primary-color tracking-tight">
                {activeMockPhase?.title || "Select a Phase"}
              </h1>
              <p className="text-[10px] text-primary-color font-medium uppercase tracking-widest">
                {activeMockPhase?.tasks.length || 0} Tasks in this phase
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowGlobalLogs(!showGlobalLogs)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border
                  ${
                    showGlobalLogs
                      ? "bg-zinc-100 border-zinc-200 text-primary-color"
                      : "bg-background border-zinc-200 text-primary-color hover:bg-[#006B66] hover:text-accent-color"
                  }
                `}
              >
                <TerminalSquare className="w-3.5 h-3.5" />
                {showGlobalLogs ? "Hide Logs" : "Show Logs"}
              </button>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/30">
              {activeMockPhase ? (
                <div className="max-w-2xl mx-auto space-y-4 pb-12">
                  {activeMockPhase.tasks.map((task, taskIdx) => {
                    const taskKey = `${activePlanItemKey}_task_${taskIdx}`;
                    return (
                      <MockTaskCard
                        key={taskKey}
                        task={task}
                        isExpanded={expandedMockTaskKey === taskKey}
                        onToggle={() =>
                          setExpandedMockTaskKey(
                            expandedMockTaskKey === taskKey ? null : taskKey
                          )
                        }
                        taskIndex={taskIdx}
                        phaseIndex={activeMockPhase.order}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <List className="w-12 h-12 mb-4 text-primary-color" />
                  <p className="text-sm text-primary-color font-medium">
                    Select a phase to view tasks
                  </p>
                </div>
              )}
            </div>

            {/* Terminal */}
            {showGlobalLogs && (
              <div className="w-80 border-l border-zinc-200 bg-background flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
                <div className="h-10 border-b border-zinc-100 flex items-center justify-between px-4 bg-zinc-50/50">
                  <div className="flex items-center gap-2">
                    <TerminalSquare className="w-3.5 h-3.5 text-primary-color" />
                    <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                      Activity Log
                    </span>
                  </div>
                </div>

                <div
                  ref={terminalRef}
                  className="flex-1 p-4 overflow-y-auto font-mono text-[10px] space-y-2 bg-background"
                >
                  <div className="text-primary-color">
                    <span className="text-zinc-400 select-none">{">"}</span>{" "}
                    Mock data mode active
                  </div>
                  <div className="text-primary-color">
                    <span className="text-zinc-400 select-none">{">"}</span>{" "}
                    Viewing: {activeMockPhase?.title || "No phase selected"}
                  </div>
                  <div className="text-emerald-600">
                    <span className="text-zinc-400 select-none">{">"}</span>{" "}
                    Tasks loaded: {activeMockPhase?.tasks.length || 0}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Original API-based view
  return (
    <div className="h-screen bg-[#FFF9F5] text-primary-color font-sans flex flex-col md:flex-row overflow-hidden relative">
      {/* --- SIDEBAR: Timeline --- */}
      <aside className="w-80 bg-[#FFF9F5] border-r border-zinc-200 flex flex-col z-20 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-zinc-100 bg-zinc-50/80 backdrop-blur-sm sticky top-0">
          <h2 className="text-base font-bold text-primary-color">Slices</h2>
        </div>

        <div ref={sidebarRef} className="flex-1 overflow-y-auto p-6 relative">
          {/* Continuous Vertical Line */}
          <div className="absolute left-[35px] top-6 bottom-6 w-[1px] bg-zinc-200 z-0" />

          <div className="space-y-8 relative z-10">
            {planItems.length > 0 ? (
              planItems.map((slice: PlanItem, idx: number) => {
                const sliceId = slice.item_number;
                const isCompleted = completedSlices.includes(sliceId);
                const isLocked =
                  idx > 0 &&
                  !completedSlices.includes(planItems[idx - 1]?.item_number);
                const isActive = activeSliceId === sliceId;

                return (
                  <div
                    key={slice.id}
                    data-active={isActive}
                    className={`group flex gap-4 ${isLocked ? " pointer-events-none" : "cursor-pointer"}`}
                    onClick={() =>
                      !isLocked && handleManualSliceChange(sliceId)
                    }
                  >
                    {/* Timeline Node */}
                    <div
                      className={`
                      w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 bg-background relative z-10
                      ${
                        isCompleted
                          ? "border-emerald-500 text-emerald-500"
                          : isActive
                            ? "border-primary-color text-primary-color scale-110 shadow-sm"
                            : "border-zinc-200 text-primary-color"
                      }
                    `}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-[10px] font-bold">
                          {slice.item_number}
                        </span>
                      )}
                    </div>

                    {/* Text Content */}
                    <div
                      className={`flex-1 pt-0.5 transition-all duration-300 ${isActive ? "translate-x-1" : ""}`}
                    >
                      <h3
                        className={`text-xs font-bold leading-tight ${isActive ? "text-primary-color" : "text-primary-color group-hover:text-primary-color"}`}
                      >
                        {slice.title}
                      </h3>
                      <p className="text-[10px] text-primary-color leading-relaxed mt-1 line-clamp-2">
                        {slice.description}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-primary-color text-sm">
                {isLoadingPlanItems
                  ? "Loading plan items..."
                  : "No plan items available"}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT: Right Part --- */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-background">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-100">
          <div>
            <h1 className="text-lg font-bold text-primary-color tracking-tight">
              {activeSliceMeta?.title || `Slice ${activeSliceId}`}
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-primary-color font-medium uppercase tracking-widest">
                Execution Graph
              </p>
              {isGraphLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-primary-color" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGlobalLogs(!showGlobalLogs)}
              className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border
                  ${
                    showGlobalLogs
                      ? "bg-zinc-100 border-zinc-200 text-primary-color"
                      : "bg-background border-zinc-200 text-primary-color hover:bg-[#006B66] hover:text-accent-color"
                  }
                `}
            >
              <TerminalSquare className="w-3.5 h-3.5" />
              {showGlobalLogs ? "Hide Logs" : "Show Logs"}
            </button>

            {isSliceComplete ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 text-primary-color rounded-md border border-zinc-100 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified
              </div>
            ) : (
              <button
                onClick={() => setIsRunning(!isRunning)}
                disabled={isGraphLoading}
                className={`
                   flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all
                   ${
                     isGraphLoading
                       ? "bg-zinc-100 text-primary-color cursor-not-allowed"
                       : isRunning
                         ? "bg-background border border-zinc-200 text-primary-color hover:bg-[#006B66] hover:text-accent-color"
                         : "bg-accent-color text-primary-color hover:bg-[#006B66] hover:text-accent-color shadow-sm"
                   }
                 `}
              >
                {isGraphLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-color" />{" "}
                    Loading Plan...
                  </>
                ) : isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Start Codegen
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* DAG Visualization (Fills available space) */}
          <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/30">
            {/* If loading graph, show simple indicator */}
            {currentDag.length === 0 && isGraphLoading && (
              <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-primary-color rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-primary-color rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-primary-color rounded-full animate-bounce"></div>
                </div>
                <p className="text-xs text-primary-color font-mono">
                  Discovering dependencies...
                </p>
              </div>
            )}

            {currentDag.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-8 pb-12">
                {currentDag.map((level, idx) => {
                  // Map API status to UI status
                  const levelStatus = mapApiStatusToUI(level.status);
                  const isActive =
                    levelStatus === "running" || level.status === "IN_PROGRESS";
                  const isDone =
                    levelStatus === "completed" || level.status === "COMPLETED";

                  return (
                    <div
                      key={idx}
                      className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
                    >
                      {/* Level Connector */}
                      {idx !== currentDag.length - 1 && (
                        <div className="absolute left-[19px] top-10 bottom-[-32px] w-[2px] bg-zinc-100" />
                      )}

                      <div className="flex items-start gap-6">
                        {/* Level Icon */}
                        <div
                          className={`
                              w-10 h-10 rounded-xl flex items-center justify-center border-2 shrink-0 z-10 bg-background transition-colors duration-300
                              ${isActive ? "border-primary-color text-primary-color shadow-md" : isDone ? "border-emerald-500 text-emerald-600" : "border-zinc-200 text-primary-color"}
                            `}
                        >
                          {isDone ? (
                            <Check className="w-5 h-5" />
                          ) : isActive ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary-color" />
                          ) : (
                            <GitBranch className="w-5 h-5" />
                          )}
                        </div>

                        {/* Level Content */}
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between mb-3">
                            <h3
                              className={`text-sm font-bold ${isActive ? "text-primary-color" : "text-primary-color"}`}
                            >
                              {level.title}
                            </h3>
                            <span className="text-[9px] uppercase font-bold text-primary-color">
                              {isDone
                                ? "Completed"
                                : isActive
                                  ? "Processing..."
                                  : "Pending"}
                            </span>
                          </div>

                          {/* Tasks Grid */}
                          <div className="grid grid-cols-1 gap-3">
                            {level.tasks.map((task) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                isExpanded={expandedTaskId === task.id}
                                onToggle={() =>
                                  setExpandedTaskId(
                                    expandedTaskId === task.id ? null : task.id
                                  )
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Completion Banner */}
                {isSliceComplete && activeSliceMeta && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pl-16">
                    <div className="bg-background rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
                      <div className="bg-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-full">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-emerald-900">
                            Slice Verified
                          </h3>
                          <p className="text-xs text-emerald-700">
                            Ready for integration
                          </p>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <h4 className="text-[10px] font-bold text-primary-color uppercase tracking-wider mb-2">
                            What was done
                          </h4>
                          <p className="text-sm text-primary-color leading-relaxed">
                            {activeSliceMeta?.detailed_objective ||
                              "Slice completed successfully"}
                          </p>
                        </div>
                        <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                          <h4 className="text-[10px] font-bold text-primary-color uppercase tracking-wider mb-2 flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5" />
                            How to Verify
                          </h4>
                          <p className="text-xs font-mono text-primary-color">
                            {activeSliceMeta?.verification_criteria ||
                              "All tests passed"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Terminal */}
          {showGlobalLogs && (
            <div className="w-80 border-l border-zinc-200 bg-background flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
              <div className="h-10 border-b border-zinc-100 flex items-center justify-between px-4 bg-zinc-50/50">
                <div className="flex items-center gap-2">
                  <TerminalSquare className="w-3.5 h-3.5 text-primary-color" />
                  <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                    Live Logs
                  </span>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"}`}
                />
              </div>

              <div
                ref={terminalRef}
                className="flex-1 p-4 overflow-y-auto font-mono text-[10px] space-y-2 bg-background"
              >
                {globalLogs.length === 0 && (
                  <div className="text-primary-color italic text-center mt-10">
                    Ready to execute.
                    <br />
                    Logs will appear here.
                  </div>
                )}
                {globalLogs.map((log, i) => (
                  <div
                    key={i}
                    className="flex gap-2 animate-in slide-in-from-left-1 duration-200"
                  >
                    <span className="text-primary-color select-none">
                      {">"}
                    </span>
                    <span
                      className={`break-words leading-relaxed ${
                        log.includes("SUCCESS")
                          ? "text-emerald-600 font-bold"
                          : log.includes("Starting")
                            ? "text-blue-600"
                            : "text-primary-color"
                      }`}
                    >
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
