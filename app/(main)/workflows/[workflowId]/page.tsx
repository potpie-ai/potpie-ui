"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import AgentService from "@/services/AgentService";
import WorkflowService, { Trigger, Workflow } from "@/services/WorkflowService";
import {
  CopyIcon,
  Github,
  LucideEdit,
  LucideLoader2,
  LucideTrash,
  RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Agent {
  id: string;
  name: string;
}

const WorkflowPage = () => {
  const params: { workflowId: string } = useParams();
  const router = useRouter();

  const [workflow, setWorkflow] = useState<Workflow | undefined>();
  const [loading, setLoading] = useState(true);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [currentTriggers, setCurrentTriggers] = useState<Trigger[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const [webhookURL, setWebhookURL] = useState<string>("");

  useEffect(() => {
    async function fetchWorkflow() {
      setLoading(true);
      const workflow = await WorkflowService.getWorkflowById(params.workflowId);
      if (!workflow) {
        router.push("/workflows");
        return;
      }
      setWorkflow(workflow);
      setWebhookURL(
        `${process.env.NEXT_PUBLIC_WORKFLOWS_WEBHOOK_URL || process.env.NEXT_PUBLIC_WORKFLOWS_URL || "https://stage-workflows.potpie.ai/api/v1"}/api/v1/webhook/${workflow?.hash}`
      );
      const agents = await AgentService.getAgentTypes();
      setAvailableAgents(
        agents.map((agent: any) => ({ id: agent.id, name: agent.name }))
      );
      const _triggers = await WorkflowService.getAllTriggers();
      setTriggers(_triggers);
      setCurrentTriggers(
        _triggers.filter((trigger) => workflow.triggers.includes(trigger.id))
      );

      const logs = await WorkflowService.getWorkflowLogs(params.workflowId);
      console.log("logs:", logs);
      setLogs(logs);

      setLoading(false);
    }
    fetchWorkflow();
  }, [params.workflowId]);

  const handleDeleteWorkflow = async () => {
    if (!workflow) return;
    if (confirm("Are you sure you want to delete this workflow?")) {
      await WorkflowService.deleteWorkflow(workflow.id);
      router.push(`/workflows`);
    }
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookURL);
    setCopied(true);

    // Reset the copied state after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const refreshLogs = async () => {
    if (!workflow) return;
    setRefreshingLogs(true);
    const logs = await WorkflowService.getWorkflowLogs(workflow.id);
    console.log("logs:", logs);
    setLogs(logs);
    setTimeout(() => setRefreshingLogs(false), 2000);
  };

  const [liveRefresh, setLiveRefresh] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLiveRefresh = () => {
    setLiveRefresh(!liveRefresh);
    if (liveRefresh) {
      // Clear the interval if live refresh is being turned off
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Clear the timeout if it exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      // Setup a timer to refresh logs every 5 seconds if live refresh is on
      intervalRef.current = setInterval(() => {
        refreshLogs();
      }, 5000);

      // Set a timeout to turn off live refresh after 5 minutes
      timeoutRef.current = setTimeout(() => {
        setLiveRefresh(false);
      }, 300000); // 5 minutes in milliseconds
    }
  };

  return (
    <div className="p-6">
      {loading ? (
        <div className="flex w-full h-svh items-center justify-center">
          <LucideLoader2 className="w-12 h-12 animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex w-full items-start justify-between">
            <div>
              <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
                {workflow?.title}
              </h1>
              <p>{workflow?.description}</p>
            </div>
            <div className="mt-2 mr-2">
              {/* ACTION BAR */}
              <Link href={`/workflows/${workflow?.id}/edit`}>
                <Button
                  variant="link"
                  className="configure-button hover:bg-gray-200 outline-dashed outline-1"
                >
                  Edit <LucideEdit className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="destructive"
                className="text-red-600 hover:text-red-800 hover:bg-red-100 ml-4 outline-dashed outline-1"
                onClick={handleDeleteWorkflow}
              >
                Delete <LucideTrash className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <Tabs defaultValue="details" className="w-full mt-12">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="p-8 bg-gray-50 rounded-sm">
              <div>
                <p className="text-lg">For project</p>
                <p className="text-xl text-gray-500 font-semibold border-solid">
                  {workflow?.repo_name}
                </p>
                <p className="text-lg">on</p>
                <p className="text-xl text-gray-500 font-semibold flex flex-row gap-2 items-center">
                  {workflow?.triggers.map((triggerId) => (
                    <p key={triggerId}>
                      {triggers.find((trigger) => trigger.id == triggerId)
                        ?.name || "<Unknown Trigger>"}
                    </p>
                  ))}
                  <Github className="h-5 w-5" />
                </p>
                <p className="text-lg">route to</p>
                <p className="text-xl text-gray-500 font-semibold">
                  {availableAgents.find(
                    (agent) => agent.id == workflow?.agent_id
                  )?.name || "<Deleted Agent>"}
                </p>
              </div>
              <div>
                <p className="text-lg mt-8">Task</p>
                <p className="text-xl text-gray-500 font-semibold border-solid">
                  {workflow?.task}
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold mt-8">Webhook URL</h2>
                <div className="flex items-center w-fit p-2 outline-1 rounded-sm outline outline-gray-300 mt-2">
                  <span className="text-sm font-mono">{webhookURL}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4"
                    onClick={handleCopy}
                  >
                    <CopyIcon className="w-4 h-4 mr-2" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <Carousel
                  opts={{
                    align: "start",
                  }}
                  className="w-full max-w-full"
                >
                  {/* <CarouselPrevious />
                  <CarouselNext /> */}
                  <CarouselContent className="max-w-full w-2/3 overflow-x-hidden">
                    {currentTriggers.find(
                      (trigger) => trigger.group === "github"
                    ) && (
                      <CarouselItem className="basis-1/3 w-[350px]">
                        <Card className="w-[350px] p-4">
                          <CardHeader className="p-2 font-semibold flex flex-col items-start gap-2">
                            <div className="w-full flex items-center justify-center">
                              <Github className="h-5 w-5" />
                            </div>
                            <div>
                              To trigger on{" "}
                              {currentTriggers.map(
                                (trigger) => `${trigger.name}`
                              )}
                              {":"}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <ol className="list-decimal">
                              <li key={1}>
                                <h2 className=""> Copy the webhook URL</h2>
                              </li>
                              <li key={2}>
                                {" "}
                                <h2 className="">
                                  {" "}
                                  Go to your repository on Github
                                </h2>
                              </li>
                              <li key={3}>
                                {" "}
                                <h2 className="">
                                  {" "}
                                  Go to Settings {">"} Webhooks
                                </h2>
                              </li>
                              <li key={4}>
                                {" "}
                                <h2 className="">
                                  {" "}
                                  Add Payload URL you just copied
                                </h2>
                              </li>
                              <li key={5}>
                                {" "}
                                <h2 className="">
                                  {" "}
                                  Select Content Type application json
                                </h2>
                              </li>
                              <li key={6}>
                                {" "}
                                <h2 className="">
                                  {" "}
                                  Select appropriate events or just select{" "}
                                  <span className="italic">
                                    `Send me everything`
                                  </span>
                                </h2>
                              </li>
                              <li key={7}>
                                {" "}
                                <h2 className=""> Save the webhook</h2>
                              </li>
                            </ol>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    )}
                  </CarouselContent>
                </Carousel>
              </div>
            </TabsContent>
            <TabsContent value="logs" className="p-8 bg-gray-50 rounded-sm">
              <div className="w-full flex justify-end">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={handleLiveRefresh}
                >
                  <div
                    className={`rounded-full h-[8px] w-[8px] inline-block mr-2  ${liveRefresh ? "bg-green-400" : "bg-yellow-400"}`}
                  />
                  Live{" "}
                </Button>
                <Button variant="outline" onClick={refreshLogs}>
                  Refresh{" "}
                  <RefreshCcw
                    className={`h-5 w-5 ml-2 ${refreshingLogs && "animate-spin"}`}
                  />{" "}
                </Button>
              </div>
              <TableHeader className="font-semibold text-red">
                <TableRow className="border-b border-border font-semibold text-red">
                  <TableHead className="w-[200px] text-primary">
                    Execution ID
                  </TableHead>
                  <TableHead className="w-[350px] text-primary">
                    Event Type
                  </TableHead>
                  <TableHead className="w-[200px] text-primary">
                    Triggered At
                  </TableHead>
                  <TableHead className="w-[200px] text-primary">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length > 0 &&
                  logs
                    .sort(
                      (a: any, b: any) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    ) // Sort by created_at in descending order
                    .map((log) => (
                      <TableRow
                        key={log.id}
                        className="hover:bg-red border-b border-gray-200 text-black"
                      >
                        <TableCell>{log.id}</TableCell>
                        <TableCell>{log.trigger}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger>
                              {formatRelativeTime(new Date(log.created_at))}
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {new Date(log.created_at).toLocaleString()}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`rounded-full h-[8px] w-[8px] inline-block mr-2 ${
                              log.status === "completed"
                                ? "bg-green-400"
                                : log.status === "failed"
                                  ? "bg-red-400"
                                  : "bg-yellow-400"
                            }`}
                          />
                          {log.status}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default WorkflowPage;

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);

  // If the time is within the last minute
  if (diffInSeconds < 60) {
    return "Just now";
  }

  // If the time is within the last 20 minutes
  if (diffInMinutes >= 1 && diffInMinutes < 20) {
    return `${diffInMinutes} minutes ago`;
  }

  // If the time is today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Otherwise, return the full date
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
