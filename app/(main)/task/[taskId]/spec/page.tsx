"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import SpecService from "@/services/SpecService";
import PlanService from "@/services/PlanService";
import { SpecChatPanel, ChatMessage, SpecChatPanelRef } from "./components/SpecChatPanel";
import { SpecContentDisplay } from "./components/SpecContentDisplay";
import { TaskOverview } from "./components/TaskOverview";
import {
  SpecChatRequest,
  SpecChatResponse,
  SpecUndoRequest,
  SpecOutput,
  SpecChatEditHistoryItem,
  SpecStatusResponse,
  SpecEditRequest,
  SpecEditResponse,
  PlanEditRequest,
  PlanEditResponse,
  PlanUndoRequest,
} from "@/lib/types/spec";
import { Button } from "@/components/ui/button";

const MAX_EDIT_HISTORY = 10;

export default function SpecPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const taskId = params.taskId as string; // This is actually recipeId or specId
  const chatPanelRef = useRef<SpecChatPanelRef>(null);

  // State
  const [specId, setSpecId] = useState<string | null>(null);
  const [specOutput, setSpecOutput] = useState<SpecOutput>({
    add: [],
    modify: [],
    fix: [],
  });
  const [specStatus, setSpecStatus] = useState<"IN_PROGRESS" | "COMPLETED" | "FAILED" | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSpec, setIsLoadingSpec] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [undoToken, setUndoToken] = useState<string | null>(null);
  const [editHistory, setEditHistory] = useState<SpecChatEditHistoryItem[]>([]);
  const [recentlyChangedIds, setRecentlyChangedIds] = useState<Set<string>>(new Set());
  const [nextActions, setNextActions] = useState<string[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showTaskOverview, setShowTaskOverview] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [currentScope, setCurrentScope] = useState<"spec" | "plan">("spec");

  // Fetch spec function
  const fetchSpec = useCallback(async () => {
    if (!taskId) return;

    setIsLoadingSpec(true);
    setError(null);

    try {
      // Try to get spec by recipe_id first
      let specData: SpecStatusResponse;
      try {
        specData = await SpecService.getSpecByRecipeId(taskId);
      } catch (recipeError: any) {
        // If that fails, try by spec_id
        if (recipeError.message?.includes("not found")) {
          specData = await SpecService.getSpec(taskId);
        } else {
          throw recipeError;
        }
      }

      setSpecId(specData.spec_id);
      setSpecStatus(specData.spec_gen_status as any);

      // Set spec_output if available
      if (specData.spec_output) {
        setSpecOutput(specData.spec_output);
      }
    } catch (err: any) {
      console.error("Error fetching spec:", err);
      setError(err.message || "Failed to load spec");
      if (err.message?.includes("Access denied")) {
        toast.error("Access denied");
      } else if (err.message?.includes("not found")) {
        toast.error("Spec not found");
      } else {
        toast.error(err.message || "Failed to load spec");
      }
    } finally {
      setIsLoadingSpec(false);
    }
  }, [taskId]);

  // Fetch spec on mount
  useEffect(() => {
    fetchSpec();
  }, [fetchSpec]);

  // Clean up chat history when navigating away
  useEffect(() => {
    return () => {
      // Cleanup function runs when component unmounts or specId changes
      if (specId) {
        SpecService.deleteChatHistory(specId).catch((err) => {
          console.error("Error deleting chat history on unmount:", err);
        });
      }
    };
  }, [specId]);

  // Handle sending a chat message
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!specId || !message.trim()) return;

      setIsLoading(true);
      setError(null);

      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        // Use plan endpoints when in plan mode, spec endpoints otherwise
        // Plan mode should only edit the plan (not the spec)
        let response: SpecEditResponse | PlanEditResponse;
        const isPlanMode = currentScope === "plan";

        if (isPlanMode) {
          if (!planId) {
            throw new Error("Plan ID is required for plan edits");
          }
          const planRequest: PlanEditRequest = {
            plan_id: planId,
            user_message: message.trim(),
          };
          response = await PlanService.editPlan(planRequest);
        } else {
          const specRequest: SpecEditRequest = {
            spec_id: specId,
            user_message: message.trim(),
          };
          response = await SpecService.editSpec(specRequest);
        }

        // Update scope based on response
        if (response.scope) {
          setCurrentScope(response.scope);
        }

        // Update planId if returned from edit response (for plan edits)
        const responsePlanId = 'plan_id' in response ? response.plan_id : null;
        if (responsePlanId) {
          if (!planId || responsePlanId !== planId) {
            setPlanId(responsePlanId);
          }
          // Invalidate plan items query to refresh TaskOverview when plan edits are made
          queryClient.invalidateQueries({ queryKey: ["plan-items", responsePlanId] });
          // Also invalidate plan status to ensure it's up to date
          queryClient.invalidateQueries({ queryKey: ["plan-status", responsePlanId, taskId, specId] });
        } else if (planId) {
          // If we have a planId but response doesn't include it, still invalidate with current planId
          queryClient.invalidateQueries({ queryKey: ["plan-items", planId] });
          queryClient.invalidateQueries({ queryKey: ["plan-status", planId, taskId, specId] });
        }

        // Build assistant message content with explanation and details
        let assistantContent = response.explanation || "";

        // Add applied edits information
        if (response.applied_edits && response.applied_edits.length > 0) {
          assistantContent += "\n\n**Applied Edits:**\n";
          response.applied_edits.forEach((edit) => {
            const editType = edit.type.charAt(0).toUpperCase() + edit.type.slice(1);
            const category = edit.category ? ` (${edit.category})` : "";
            const itemId = edit.item_id ? ` - Item: ${edit.item_id}` : "";
            assistantContent += `- ${editType}${category}${itemId}\n`;
          });
        }

        // Add errors if any
        if (response.errors && response.errors.length > 0) {
          assistantContent += "\n\n**Errors:**\n";
          response.errors.forEach((error) => {
            assistantContent += `- ${error}\n`;
          });
        }

        // Add suggestions if any
        if (response.suggestions && response.suggestions.length > 0) {
          assistantContent += "\n\n**Suggestions:**\n";
          response.suggestions.forEach((suggestion) => {
            assistantContent += `- ${suggestion}\n`;
          });
        }

        // Add warnings if any
        if (response.warnings && response.warnings.length > 0) {
          assistantContent += "\n\n**Warnings:**\n";
          response.warnings.forEach((warning) => {
            assistantContent += `- ${warning}\n`;
          });
        }

        // Add conflicts if any
        if (response.conflicts && response.conflicts.length > 0) {
          assistantContent += "\n\n**Conflicts:**\n";
          response.conflicts.forEach((conflict) => {
            assistantContent += `- [${conflict.severity.toUpperCase()}] ${conflict.description} (Path: ${conflict.path})\n`;
          });
        }

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: assistantContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update edit history
        setEditHistory((prev) => [
          ...prev,
          { message: message.trim(), response: response.explanation },
        ]);

        // Update spec_output
        if (response.spec_output) {
          setSpecOutput(response.spec_output);

          // Track recently changed items from applied_edits
          const newChangedIds = new Set<string>();
          if (response.applied_edits) {
            response.applied_edits.forEach((edit) => {
              if (edit.item_id) {
                newChangedIds.add(edit.item_id);
              }
            });
          }
          // Also track from spec_output items
          [
            ...response.spec_output.add,
            ...response.spec_output.modify,
            ...response.spec_output.fix,
          ].forEach((item) => newChangedIds.add(item.id));

          // Update highlights: replace with new changed items
          // This automatically removes highlights from items not modified in the new change
          setRecentlyChangedIds(newChangedIds);

          // Clear highlight after 3 seconds
          setTimeout(() => {
            setRecentlyChangedIds((prev) => {
              // Only keep items that are still in the current set (weren't modified again)
              const stillHighlighted = new Set<string>();
              prev.forEach((id) => {
                if (newChangedIds.has(id)) {
                  stillHighlighted.add(id);
                }
              });
              return stillHighlighted;
            });
          }, 3000);
        } else {
          // If spec_output is not in response, refetch the spec to get updated data
          // Use a small delay to allow backend to process
          setTimeout(async () => {
            if (specId) {
              try {
                const specData = await SpecService.getSpec(specId);
                if (specData.spec_output) {
                  setSpecOutput(specData.spec_output);
                }
              } catch (err) {
                console.error("Error refetching spec after edit:", err);
              }
            }
          }, 1000);
        }

        // Store undo token
        if (response.undo_token) {
          setUndoToken(response.undo_token);
        }

        // Only show a toast when the edit was applied successfully
        const hasErrors = response.errors && response.errors.length > 0;
        const hasConflicts = response.conflicts && response.conflicts.length > 0;
        const hasAppliedEdits =
          response.applied_edits && response.applied_edits.length > 0;

        // If the agent only clarified/explained without changing the spec,
        // don't show a success toast – the chat message is enough.
        if (hasAppliedEdits && !hasErrors && !hasConflicts) {
          const scopeLabel =
            response.scope === "plan" ? "Plan" : "Spec";
          toast.success(`${scopeLabel} edited successfully`);
        }

        // Note: Warnings, conflicts, errors, and suggestions are displayed in the chat message above
      } catch (err: any) {
        console.error("Error editing spec:", err);
        const errorMessage = err.message || "Failed to edit spec";
        setError(errorMessage);

        // Add error message to chat
        const errorChatMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: `❌ Error: ${errorMessage}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorChatMessage]);

        // Handle specific error cases
        if (err.message?.includes("Access denied") || err.message?.includes("403")) {
          toast.error("Access denied. You don't have permission to edit this spec.");
        } else if (err.message?.includes("not found") || err.message?.includes("404")) {
          toast.error("Spec not found. Please refresh the page.");
        } else if (err.message?.includes("Invalid") || err.message?.includes("400")) {
          toast.error(`Invalid request: ${errorMessage}`);
        } else {
          toast.error(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [specId, editHistory, planId, currentScope, queryClient, taskId]
  );

  // Handle quick actions
  const handleQuickAction = useCallback(
    async (action: "add" | "modify" | "remove" | "undo" | "regenerate") => {
      if (!specId) return;

      switch (action) {
        case "add":
          chatPanelRef.current?.setInput("Add ");
          chatPanelRef.current?.focusInput();
          break;

        case "modify":
          chatPanelRef.current?.setInput("Modify ");
          chatPanelRef.current?.focusInput();
          break;

        case "remove":
          chatPanelRef.current?.setInput("Remove ");
          chatPanelRef.current?.focusInput();
          break;

        case "undo": {
          if (!undoToken) {
            toast.error("No undo available");
            return;
          }

          const isPlanMode = currentScope === "plan";

          if (isPlanMode && !planId) {
            toast.error("Plan ID not available");
            return;
          }

          if (!isPlanMode && !specId) {
            toast.error("Spec ID not available");
            return;
          }

          setIsLoading(true);
          setError(null);

          try {
            const response = isPlanMode
              ? await PlanService.undoPlanEdit({
                  plan_id: planId as string,
                  undo_token: undoToken,
                } as PlanUndoRequest)
              : await SpecService.undoSpecEdit({
                  spec_id: specId,
                  undo_token: undoToken,
                } as SpecUndoRequest);

            // Build undo message content
            let undoMessageContent = `✅ Successfully undone ${response.successful} edit(s).`;
            if (response.undone_edits && response.undone_edits.length > 0) {
              undoMessageContent += "\n\n**Undone Edits:**\n";
              response.undone_edits.forEach((edit) => {
                const editType = edit.type.charAt(0).toUpperCase() + edit.type.slice(1);
                undoMessageContent += `- ${editType} (Item: ${edit.item_id})\n`;
              });
            }
            if (response.errors && response.errors.length > 0) {
              undoMessageContent += "\n\n**Errors:**\n";
              response.errors.forEach((error) => {
                undoMessageContent += `- ${error}\n`;
              });
            }

            // Update spec_output if provided
            if (response.spec_output) {
              setSpecOutput(response.spec_output);

              // Track undone items for highlighting
              const undoneIds = new Set<string>();
              if (response.undone_edits) {
                response.undone_edits.forEach((edit) => {
                  if (edit.item_id) {
                    undoneIds.add(edit.item_id);
                  }
                });
              }
              // Update highlights: replace with undone items (removes previous highlights)
              setRecentlyChangedIds(undoneIds);

              // Clear highlight after 3 seconds
              setTimeout(() => {
                setRecentlyChangedIds((prev) => {
                  // Only keep items that are still in the undone set
                  const stillHighlighted = new Set<string>();
                  prev.forEach((id) => {
                    if (undoneIds.has(id)) {
                      stillHighlighted.add(id);
                    }
                  });
                  return stillHighlighted;
                });
              }, 3000);
            } else if (!isPlanMode) {
              // Refetch spec if spec_output not in response (spec mode only)
              setTimeout(async () => {
                if (specId) {
                  try {
                    const specData = await SpecService.getSpec(specId);
                    if (specData.spec_output) {
                      setSpecOutput(specData.spec_output);
                    }
                  } catch (err) {
                    console.error("Error refetching spec after undo:", err);
                  }
                }
              }, 1000);
            }

            if (isPlanMode && planId) {
              queryClient.invalidateQueries({ queryKey: ["plan-items", planId] });
              queryClient.invalidateQueries({ queryKey: ["plan-status", planId, taskId, specId] });
            }

            // Add undo message to chat
            const undoMessage: ChatMessage = {
              id: `assistant-undo-${Date.now()}`,
              role: "assistant",
              content: undoMessageContent,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, undoMessage]);

            // Show success toast with details
            if (response.failed > 0) {
              toast.warning(`Undone ${response.successful} edit(s), ${response.failed} failed`);
            } else {
              toast.success(`Successfully undone ${response.successful} edit(s)`);
            }

            // Clear undo token since it can only be used once
            setUndoToken(null);
          } catch (err: any) {
            console.error("Error undoing:", err);
            const errorMessage = err.message || "Failed to undo edit";
            setError(errorMessage);

            // Add error message to chat for better visibility
            const errorChatMessage: ChatMessage = {
              id: `assistant-error-undo-${Date.now()}`,
              role: "assistant",
              content: `❌ **Error undoing edit:**\n\n${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorChatMessage]);

            // Show toast with error
            toast.error(errorMessage, {
              duration: 6000,
            });
          } finally {
            setIsLoading(false);
          }
          break;
        }

        case "regenerate":
          await handleSendMessage(
            currentScope === "plan" ? "Regenerate the plan" : "Regenerate the spec"
          );
          break;
      }
    },
    [specId, undoToken, handleSendMessage, currentScope, planId, queryClient, taskId]
  );

  // Handle retry
  const handleRetry = useCallback(() => {
    setError(null);
    // Could implement retry logic here if needed
  }, []);

  // Check if chat should be disabled
  const isChatDisabled = specStatus !== "COMPLETED" || isLoadingSpec || !specId;

  // Handle generate plan
  const handleGeneratePlan = useCallback(async () => {
    if (!specId) {
      toast.error("Spec ID not available");
      return;
    }

    setIsGeneratingPlan(true);
    try {
      const response = await PlanService.submitPlanGeneration({
        spec_id: specId,
      });
      
      toast.success("Plan generation started");
      
      // Set planId and show task overview instead of navigating
      if (response.plan_id) {
        setPlanId(response.plan_id);
      }
      setShowTaskOverview(true);
    } catch (err: any) {
      console.error("Error generating plan:", err);
      toast.error(err.message || "Failed to start plan generation");
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [specId]);

  if (isLoadingSpec) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-color mx-auto mb-4" />
          <p className="text-muted-foreground">Loading spec...</p>
        </div>
      </div>
    );
  }

  if (error && !specOutput) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Chat Panel (LHS) */}
      <div className="w-[600px] shrink-0 border-r border-[#D3E5E5] flex flex-col">
        <SpecChatPanel
          ref={chatPanelRef}
          specId={specId || ""}
          disabled={isChatDisabled}
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
          nextActions={nextActions}
          onQuickAction={handleQuickAction}
          canUndo={!!undoToken}
          scope={currentScope}
          suggestedPrompts={[
            "Add rate limiting to the API",
            "Remove Redis dependency",
            "Add authentication middleware",
            "Simplify the database schema",
          ]}
        />
      </div>

      {/* Spec Content (RHS) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D3E5E5] shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-primary-color">
              {showTaskOverview ? "Task Overview" : "Spec Editor"}
            </h1>
            <div className="flex items-center gap-4">
              {specStatus !== "COMPLETED" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {specStatus === "IN_PROGRESS"
                      ? "Generating spec..."
                      : specStatus === "FAILED"
                        ? "Spec generation failed"
                        : "Pending"}
                  </span>
                </div>
              )}
              {specStatus === "COMPLETED" && specId && !showTaskOverview && (
                <Button
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-medium text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingPlan ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Plan...
                    </>
                  ) : (
                    "Generate Plan"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showTaskOverview && specId ? (
            <TaskOverview
              specId={specId}
              recipeId={taskId}
              planId={planId}
            />
          ) : (
            <SpecContentDisplay
              specOutput={specOutput}
              recentlyChangedIds={recentlyChangedIds}
            />
          )}
        </div>
      </div>
    </div>
  );
}
