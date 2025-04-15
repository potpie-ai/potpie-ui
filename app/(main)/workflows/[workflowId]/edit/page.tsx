"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AgentService from "@/services/AgentService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import WorkflowService, { Trigger, Workflow } from "@/services/WorkflowService";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MultiSelectDropdown } from "../../components/trigger-select";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bot,
  Folder,
  GitBranch,
  Github,
  LucideLoader2,
  Plus,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }),
  description: z.string().optional(),
  repo_name: z.string().nonempty(),
  branch: z.string().nonempty(),
  agent_id: z.string().nonempty(),
  triggers: z.array(z.string()).min(1, {
    message: "Please select at least one trigger.",
  }),
  task: z.string().min(20, {
    message: "must be at least 20 characters.",
  }),
});

interface Agent {
  id: string;
  name: string;
  description: string;
}

export default function UpdateWorkflowPage() {
  const params: { workflowId: string } = useParams();
  const [repoOpen, setRepoOpen] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [isValidLink, setIsValidLink] = useState(false);
  const [linkedRepoName, setLinkedRepoName] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<Workflow | undefined>();

  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const agents: any[] = await AgentService.getAgentTypes();
      setAvailableAgents(
        agents
          .filter((agent: any) => agent.status != "SYSTEM")
          .map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            description: agent.description,
          }))
      );
      const _triggers = await WorkflowService.getAllTriggers();
      setTriggers(_triggers);
      const _workflow = await WorkflowService.getWorkflowById(
        params.workflowId
      );
      if (_workflow) {
        form.setValue("title", _workflow.title);
        form.setValue("description", _workflow.description);
        form.setValue("agent_id", _workflow.agent_id);
        form.setValue("repo_name", _workflow.repo_name);
        setRepoName(_workflow.repo_name);
        setBranchName(_workflow.branch);
        form.setValue("branch", _workflow.branch);
        form.setValue("triggers", _workflow.triggers);
        form.setValue("task", _workflow.task);
      }
      setWorkflow(_workflow);
      setLoading(false);
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.workflowId]);

  const { data: UserRepositorys, isLoading: UserRepositorysLoading } = useQuery(
    {
      queryKey: ["user-repository"],
      queryFn: async () => {
        const repos =
          await BranchAndRepositoryService.getUserRepositories().then(
            (data) => {
              return data;
            }
          );
        return repos;
      },
    }
  );

  const { data: UserBranch, isLoading: UserBranchLoading } = useQuery({
    queryKey: ["user-branch", repoName],
    queryFn: () => {
      const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
      const match = repoName.match(regex);
      if (match) {
        const ownerRepo = `${match[1]}/${match[2]}`;
        return BranchAndRepositoryService.getBranchList(ownerRepo);
      }
      return BranchAndRepositoryService.getBranchList(repoName).then((data) => {
        // Auto-select branch if there's only one
        if (data?.length === 1) {
          setBranchName(data[0]);
        }
        return data;
      });
    },
    enabled: !!repoName && repoName !== "",
  });

  const handleRepoSelect = (repo: string) => {
    setRepoName(repo);
    setInputValue(repo);
    setLinkedRepoName(null);
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  useEffect(() => {
    form.setValue("repo_name", repoName);
    form.setValue("branch", branchName);
  }, [repoName, branchName, form]);

  const router = useRouter();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!workflow) return;
    try {
      const _workflow = await WorkflowService.updateWorkflow(workflow?.id, {
        title: values.title,
        description: values.description || "",
        triggers: values.triggers,
        repo_name: values.repo_name,
        branch: values.branch,
        agent_id: values.agent_id,
        task: values.task,
      });
      if (_workflow) {
        router.push(`/workflows/${workflow.id}`);
      }
    } catch (error) {
      console.error("Error updating workflow:", error);
      toast.error("Error updating workflow. Please try again.");
    }
  }

  return loading ? (
    <div className="flex w-full h-svh items-center justify-center">
      <LucideLoader2 className="w-12 h-12 animate-spin" />
    </div>
  ) : (
    <div className="p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    className="rounded-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0
                    focus:ring-0 focus:ring-offset-0 focus:outline-none w-1/2
                    border-none outline-none text-4xl font-bold placeholder:italic placeholder:text-gray-300"
                    placeholder="Enter workflow title"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-500 italic" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="mt-2">
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter a detailed description..."
                    className="p-0 focus-visible:ring-0 focus-visible:ring-offset-0
                    focus:ring-0 focus:ring-offset-0 focus:outline-none w-1/2
                    border-none outline-none placeholder:italic placeholder:text-gray-300"
                  />
                </FormControl>
                <FormMessage className="text-red-500 italic" />
              </FormItem>
            )}
          />

          <Label className="mt-8">
            Select a repository and a branch ({" "}
            <span className="italic">
              for github triggers, we will use the branch from github
              automatically
            </span>{" "}
            )
          </Label>
          <div className="flex gap-4 w-1/2 mt-2">
            <Popover open={repoOpen} onOpenChange={setRepoOpen}>
              <PopoverTrigger asChild className="flex-1">
                {UserRepositorys?.length === 0 || !repoName ? (
                  <Button
                    className="flex gap-3 items-center font-semibold justify-start"
                    variant="outline"
                  >
                    <Github
                      className="h-4 w-4 text-[#7A7A7A]"
                      strokeWidth={1.5}
                    />
                    Select Repository
                  </Button>
                ) : (
                  <Button
                    className="flex gap-3 items-center font-semibold justify-start"
                    variant="outline"
                  >
                    {repoName.startsWith("/") ||
                    repoName.includes(":\\") ||
                    repoName.includes(":/") ? (
                      <Folder
                        className="h-4 w-4 text-[#7A7A7A]"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <Github
                        className="h-4 w-4 text-[#7A7A7A]"
                        strokeWidth={1.5}
                      />
                    )}
                    <span className="truncate text-ellipsis whitespace-nowrap">
                      {repoName}
                    </span>
                  </Button>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command defaultValue={undefined}>
                  <CommandInput
                    value={searchValue}
                    onValueChange={(e) => {
                      setSearchValue(e);
                    }}
                    placeholder="Search repo.."
                  />
                  <CommandList>
                    <CommandEmpty>
                      {searchValue &&
                      searchValue.trim() !== "" &&
                      (searchValue.startsWith("/") ||
                        searchValue.includes(":\\") ||
                        searchValue.includes(":/")) &&
                      searchValue &&
                      searchValue.trim() !== ""
                        ? "No repositories found."
                        : "No results found."}
                    </CommandEmpty>

                    <CommandGroup>
                      {isValidLink && linkedRepoName && (
                        <CommandItem
                          value={linkedRepoName}
                          onSelect={() => handleRepoSelect(linkedRepoName)}
                        >
                          {linkedRepoName}
                        </CommandItem>
                      )}
                      {UserRepositorys?.map((value: any) => (
                        <CommandItem
                          key={value.id}
                          value={value.full_name}
                          onSelect={(value) => {
                            setRepoName(value);
                            setRepoOpen(false);
                          }}
                        >
                          {value.full_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {UserBranchLoading && !branchName ? (
              <Skeleton className="flex-1 h-10" />
            ) : (
              <Popover open={branchOpen} onOpenChange={setBranchOpen}>
                <PopoverTrigger asChild className="flex-1">
                  {UserBranch?.length === 0 || !branchName ? (
                    <Button
                      className="flex gap-3 items-center font-semibold justify-start"
                      variant="outline"
                    >
                      <GitBranch
                        className="h-4 w-4 text-[#7A7A7A] "
                        strokeWidth={1.5}
                      />
                      Select Branch
                    </Button>
                  ) : (
                    <Button
                      className="flex gap-3 items-center font-semibold w-[220px] justify-start"
                      variant="outline"
                    >
                      <GitBranch
                        className="h-4 w-4 text-[#7A7A7A] "
                        strokeWidth={1.5}
                      />
                      <span className="truncate text-ellipsis whitespace-nowrap">
                        {branchName}
                      </span>
                    </Button>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command defaultValue={undefined}>
                    <CommandInput placeholder="Search branch..." />
                    <CommandList>
                      <CommandEmpty>No branch found.</CommandEmpty>
                      <CommandGroup>
                        {UserBranch?.map((value: any) => (
                          <CommandItem
                            key={value}
                            value={value}
                            onSelect={(value) => {
                              setBranchName(value);
                              setBranchOpen(false);
                            }}
                          >
                            {value}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <FormField
            control={form.control}
            name="triggers"
            render={({ field }) => (
              <FormItem className="mt-8">
                <FormLabel>
                  Triggers <FormMessage className="text-red-500 italic" />
                </FormLabel>
                <FormControl>
                  <MultiSelectDropdown
                    options={triggers.map((trigger) => ({
                      label: trigger.name,
                      value: trigger.id,
                    }))}
                    value={field.value || []}
                    onChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="agent_id"
            render={({ field }) => (
              <FormItem className="mt-8">
                <FormLabel>
                  Choose an agent to use for the trigger:{" "}
                  <FormMessage className="text-red-500 italic" />
                </FormLabel>
                <FormControl>
                  <Carousel
                    opts={{
                      align: "start",
                      slidesToScroll: 1,
                    }}
                    className="flex flex-row w-3/4 ml-12"
                  >
                    <CarouselPrevious type="button" />
                    <CarouselNext type="button" />
                    <CarouselContent className="p-2">
                      {availableAgents.map((agent) => (
                        <CarouselItem key={agent.id} className="basis-1/4 ">
                          <Card
                            className={cn(
                              "h-60 p-2 border rounded-lg cursor-pointer shadow-md",
                              field.value === agent.id
                                ? " bg-green-400/40 "
                                : "border-gray-300 hover:shadow-sm hover:scale-95 transition-all ease-out"
                            )}
                            onClick={() => field.onChange(agent.id)}
                          >
                            <CardHeader className="flex items-center space-x-3 p-2">
                              <Bot className="flex-shrink-0" />
                              <CardTitle className="text-lg font-medium text-center">
                                {agent.name}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-2">
                              <p className="text-sm text-gray-600 text-center">
                                {agent.description}
                              </p>
                            </CardContent>
                          </Card>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="task"
            render={({ field }) => (
              <FormItem className="mt-8">
                <FormLabel>
                  Task <FormMessage className="text-red-500 italic" />
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter a detailed task for agent to perform..."
                    rows={1}
                    className=" min-h-20 max-h-[200px] overflow-y-auto transition-all duration-200 ease-in-out w-1/2 placeholder:text-gray-400"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" className="mt-8">
            Save
          </Button>
          {workflow && (
            <Link href={`/workflows/${workflow?.id}`}>
              <Button className="bg-transparent outline outline-1 ml-4 text-gray-600 hover:bg-slate-100">
                Cancel
              </Button>
            </Link>
          )}
        </form>
      </Form>
    </div>
  );
}
