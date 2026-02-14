"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import debounce from "debounce";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { setChat } from "@/lib/state/Reducers/chat";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LucideEdit, LucideTrash } from "lucide-react";
import ChatService from "@/services/ChatService";
import RecipeService from "@/services/RecipeService"; 

const AllChats = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const dispatch = useDispatch();
  const [title, setTitle] = useState("");
  const [inputValue, setInputValue] = useState(title);

  const { data, isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ["all-chats"],
    queryFn: () => ChatService.getAllChats(),
  });

  const { data: recipes, isLoading: recipesLoading, error: recipesError, refetch: refetchRecipes } = useQuery<any[]>({
    queryKey: ["all-recipes"],
    queryFn: () => RecipeService.getAllRecipes(0, 100),
  });

  const handleSave = async (chatId: string) => {
    try {
      const result = await ChatService.renameChat(chatId, inputValue);
      if (result.status === "success") {
        refetch();
        toast.success("Title updated successfully");
        dispatch(setChat({ title: inputValue }));
      }
    } catch (err) {
      console.error("Error renaming chat", err);
      toast.error("Unable to rename chat");
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const result = await ChatService.deleteChat(chatId);
      if (result) {
        refetch();
        toast.success("Chat deleted successfully");
      }
    } catch (err) {
      console.error("Error deleting chat", err);
      toast.error("Unable to delete chat");
    }
  };

  useEffect(() => {
    const handler = debounce((value) => {
      setDebouncedSearchTerm(value);
    }, 500);

    handler(searchTerm);

    return () => {
      handler.clear();
    };
  }, [searchTerm]);

  const handleInputChange = (event: any) => {
    setInputValue(event.target.value);
  };

  const handleChatClick = (chat: any) => {
    dispatch(setChat({ agentId: chat.agent_id, temporaryContext: { branch: chat.branch, repo: chat.repository, projectId: chat.project_ids[0] }, selectedNodes: [], title: chat.title, chatFlow: "EXISTING_CHAT" }));
  };

  // Get redirect URL for recipe based on status
  const getRecipeRedirectUrl = (recipe: any): string => {
    const recipeId = recipe.id || recipe.recipe_id;
    const status = (recipe.status || '').toUpperCase();
    
    // Check if status contains "QUESTIONS" (e.g., PENDING_QUESTIONS, QUESTIONS_READY)
    // This matches patterns like "QUESTIONS*" as requested
    if (status.includes('QUESTIONS')) {
      const params = new URLSearchParams();
      if (recipe.project_id) {
        params.set('projectId', recipe.project_id);
      }
      if (recipeId) {
        params.set('recipeId', recipeId);
      }
      return `/repo?${params.toString()}`;
    }
    
    // Check if status contains "SPEC" (e.g., SPEC_IN_PROGRESS, SPEC_READY, ANSWERS_SUBMITTED)
    // This matches patterns like "SPEC*" as requested
    if (status.includes('SPEC') || status === 'ANSWERS_SUBMITTED') {
      return `/task/${recipeId}/spec`;
    }
    
    // Check if status contains "PLAN" (e.g., PLAN_IN_PROGRESS, PLAN_READY)
    // This matches patterns like "PLAN*" as requested
    if (status.includes('PLAN')) {
      return `/task/${recipeId}/plan`;
    }
    
    // Default: redirect to repo page for questions (for initial states)
    const params = new URLSearchParams();
    if (recipe.project_id) {
      params.set('projectId', recipe.project_id);
    }
    if (recipeId) {
      params.set('recipeId', recipeId);
    }
    return `/repo?${params.toString()}`;
  };

  // Combine chats and recipes into a single list
  const allItems = React.useMemo(() => {
    const items: any[] = [];

    // Add chats (excluding those that have a recipe_id, as they're already shown as recipes)
    if (Array.isArray(data) && data.length > 0) {
      data.forEach((chat: any) => {
        // Skip conversations that have a recipe_id - they're already shown as recipes
        // Check for both recipe_id and recipeId field names
        const chatRecipeId = chat.recipe_id || chat.recipeId;
        if (chatRecipeId) {
          return; // Skip this conversation as it's already represented by a recipe
        }
        
        items.push({
          ...chat,
          type: 'chat',
          title: chat.title,
          created_at: chat.created_at,
        });
      });
    }

    // Add recipes
    if (Array.isArray(recipes) && recipes.length > 0) {
      recipes.forEach((recipe: any) => {
        items.push({
          ...recipe,
          id: recipe.id || recipe.recipe_id,
          type: 'recipe',
          title: recipe.user_prompt,
          created_at: recipe.created_at,
          status: recipe.status,
          repository: recipe.repo_name,
          branch: recipe.branch_name,
          project_id: recipe.project_id,
        });
      });
    }

    // Sort by created_at descending
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [data, recipes]);

  // Filter items based on search term
  const filteredItems = React.useMemo(() => {
    if (!debouncedSearchTerm) return allItems;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return allItems.filter((item: any) => {
      const title = item.title?.toLowerCase() || '';
      const repository = item.repository?.toLowerCase() || '';
      const branch = item.branch?.toLowerCase() || '';
      const agentId = item.agent_id?.toLowerCase() || '';
      const status = item.status?.toLowerCase() || '';

      return (
        title.includes(searchLower) ||
        repository.includes(searchLower) ||
        branch.includes(searchLower) ||
        agentId.includes(searchLower) ||
        status.includes(searchLower)
      );
    });
  }, [allItems, debouncedSearchTerm]);

  const isLoadingAll = isLoading || recipesLoading;
  const hasItems = filteredItems && filteredItems.length > 0;

  return (
    <div className="m-10">
      <div className="flex w-full mx-auto items-center space-x-2">
        <Input
          type="text"
          placeholder="Search your chats and builds..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {!isLoadingAll && hasItems ? (
        <Table className="mt-10">
          <TableHeader className="font-semibold text-red">
            <TableRow className="border-b border-border font-semibold text-red">
              <TableHead className="w-[50px]" style={{ color: 'var(--primary-color)' }}>Type</TableHead>
              <TableHead className="w-[200px]" style={{ color: 'var(--primary-color)' }}>Title</TableHead>
              <TableHead className="w-[200px]" style={{ color: 'var(--primary-color)' }}>Agent/Status</TableHead>
              <TableHead className="w-[200px]" style={{ color: 'var(--primary-color)' }}>Repository</TableHead>
              <TableHead className="w-[200px]" style={{ color: 'var(--primary-color)' }}>Branch</TableHead>
              <TableHead className="w-[200px]" style={{ color: 'var(--primary-color)' }}>Created At</TableHead>
              <TableHead className="w-[200px] text-right" style={{ color: 'var(--primary-color)' }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item: any) => (
              <TableRow key={item.id} className="hover:bg-red border-b border-gray-200 text-black">
                <TableCell>
                  <span
                    className="px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: item.type === 'recipe' ? '#dbeafe' : '#f3e8ff',
                      color: item.type === 'recipe' ? '#1e40af' : '#6b21a8',
                    }}
                  >
                    {item.type === 'recipe' ? 'BUILD' : 'CHAT'}
                  </span>
                </TableCell>
                <TableCell>
                  {item.type === 'chat' ? (
                    <Link href={`/chat/${item.id}`} onClick={() => handleChatClick(item)}>
                      {item.title}
                    </Link>
                  ) : (
                    <Link href={getRecipeRedirectUrl(item)}>
                      {item.title.length > 50 ? item.title.substring(0, 50) + '...' : item.title}
                    </Link>
                  )}
                </TableCell>
                <TableCell>
                  {item.type === 'chat' ? (
                    <Link href={`/chat/${item.id}`} onClick={() => handleChatClick(item)}>
                      {item.agent_id ? item.agent_id.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'N/A'}
                    </Link>
                  ) : (
                    <Link href={getRecipeRedirectUrl(item)}>
                      <span className="text-sm">{item.status || 'N/A'}</span>
                    </Link>
                  )}
                </TableCell>
                <TableCell>
                  {item.type === 'chat' ? (
                    <Link href={`/chat/${item.id}`} onClick={() => handleChatClick(item)}>
                      {item?.repository || 'N/A'}
                    </Link>
                  ) : (
                    <Link href={getRecipeRedirectUrl(item)}>
                      {item?.repository || 'N/A'}
                    </Link>
                  )}
                </TableCell>
                <TableCell>
                  {item.type === 'chat' ? (
                    <Link href={`/chat/${item.id}`} onClick={() => handleChatClick(item)}>
                      {item?.branch || 'N/A'}
                    </Link>
                  ) : (
                    <Link href={getRecipeRedirectUrl(item)}>
                      {item?.branch || 'N/A'}
                    </Link>
                  )}
                </TableCell>
                <TableCell>
                  {item.created_at ? (
                    item.type === 'chat' ? (
                      <Link href={`/chat/${item.id}`} onClick={() => handleChatClick(item)}>
                        {new Date(item.created_at).toLocaleString()}
                      </Link>
                    ) : (
                      <Link href={getRecipeRedirectUrl(item)}>
                        {new Date(item.created_at).toLocaleString()}
                      </Link>
                    )
                  ) : (
                    <span className="text-gray-500">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-5">
                    {item.type === 'chat' ? (
                      <>
                        <div className="flex gap-3">
                          <Dialog>
                            <DialogTrigger>
                              <Button
                                onClick={() => {
                                  setTitle(item.title);
                                  setInputValue(item.title);
                                }}
                              >
                                <LucideEdit className="h-4 w-4" style={{ color: 'var(--accent-color)' }} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[487px]" showX={false}>
                              <DialogHeader>
                                <DialogTitle className="text-center">
                                  Edit chat name
                                </DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <Input id="name" value={inputValue} onChange={handleInputChange} className="col-span-3" />
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button type="button">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button type="button" onClick={() => handleSave(item.id)}>Save</Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <Button variant="outline" className="configure-button hover:bg-gray-200" onClick={() => {
                          handleDeleteChat(item.id);
                        }}>
                          <LucideTrash className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Link href={getRecipeRedirectUrl(item)}>
                        <Button variant="outline" className="configure-button hover:bg-gray-200">
                          View Build
                        </Button>
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : isLoadingAll ? (
        <Skeleton className="h-6 mt-4 w-full" />
      ) : error || recipesError ? (
        <div className="flex flex-col items-center h-full w-full mt-10">
          <p className="text-center py-5 w-full text-red-600">
            Error loading data. Please try again later.
          </p>
          <Button onClick={() => { refetch(); refetchRecipes(); }} variant="outline">
            Retry
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start h-full w-full">
          <p className="text-center py-5 w-full" style={{ color: 'var(--primary-color)' }}>
            {debouncedSearchTerm ? 'No chats or builds found matching your search.' : 'No chats or builds found.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AllChats;