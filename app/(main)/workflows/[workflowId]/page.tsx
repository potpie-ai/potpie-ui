"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import AgentService from "@/services/AgentService";
import WorkflowService, { Trigger, Workflow } from "@/services/WorkflowService";
import {
  CopyIcon,
  ExternalLink,
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
import WorkflowDiagram from "../components/graph";

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
        `${process.env.NEXT_PUBLIC_WORKFLOWS_WEBHOOK_URL || process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1/webhook/${workflow?.hash}`
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

  const githubAppUrl =
    "https://github.com/apps/" +
    process.env.NEXT_PUBLIC_GITHUB_APP_NAME +
    "/installations/select_target?setup_action=install";
  const popupRef = useRef<Window | null>(null);
  const openPopup = () => {
    popupRef.current = window.open(
      githubAppUrl,
      "_blank",
      "width=1000,height=700"
    );
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
              <div className="grid grid-cols-2 gap-4">
                {workflow && (
                  <WorkflowDiagram
                    workflow={workflow}
                    agent_name={
                      availableAgents.find(
                        (agent) => agent.id == workflow?.agent_id
                      )?.name || "<Deleted Agent>"
                    }
                    triggers={triggers}
                  />
                )}
                <div>
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
                      <CarouselContent className="overflow-y-hidden">
                        {currentTriggers.find(
                          (trigger) => trigger.group === "github"
                        ) && (
                          <CarouselItem className="">
                            <Card className="w-full p-4">
                              <CardHeader className="p-2 font-semibold">
                                <span>
                                  <Github className="h-5 w-5 inline mr-2" />
                                  To trigger on{" "}
                                  {currentTriggers
                                    .map((trigger) => `${trigger.name}`)
                                    .join(" or ")}
                                  {":"}
                                </span>
                              </CardHeader>
                              <CardContent>
                                <ol className="list-decimal">
                                  <li key={1}>
                                    <h2 className=""> Copy the webhook URL</h2>
                                  </li>
                                  <li key={2}>
                                    {" "}
                                    <h2 className="inline">
                                      {" "}
                                      Add a new webhook{" "}
                                      <Link
                                        href={`https://github.com/${workflow?.repo_name}/settings/hooks/new`}
                                        className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700"
                                        target="_blank"
                                      >
                                        {" "}
                                        here{" "}
                                        <ExternalLink className=" h-4 w-4" />
                                      </Link>{" "}
                                      or navigate to your repo{">"}settings{">"}
                                      webhooks
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
                                      Select{" "}
                                      <span className="font-semibold">
                                        Content Type
                                      </span>{" "}
                                      as{" "}
                                      <span className="italic">
                                        `application/json`
                                      </span>
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
                                <h3 className="text-sm inline-flex text-gray-800 mt-4">
                                  Make sure you install the github app if your
                                  agent is taking actions on github (ex:
                                  creating pr, branch, comments etc)
                                  <Button
                                    variant="outline"
                                    className="mr-2"
                                    onClick={openPopup}
                                  >
                                    Install Github App
                                  </Button>{" "}
                                </h3>
                              </CardContent>
                            </Card>
                          </CarouselItem>
                        )}
                      </CarouselContent>
                    </Carousel>
                  </div>
                </div>
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
                  <TableHead className="w-[200px] text-primary">
                    Agent Chat
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-96">
                      No logs available
                    </TableCell>
                  </TableRow>
                )}
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
                        className="hover:bg-red  text-black"
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
                        <TableCell>
                          {/* Check if any log has a conversation_id and display it */}
                          {(() => {
                            // Check if conversation_id exists in any log
                            const conversationLog = log.logs.find(
                              (singleLog: any) => {
                                try {
                                  const parsedLog = JSON.parse(singleLog.log);
                                  return parsedLog && parsedLog.conversation_id;
                                } catch (e) {
                                  return false;
                                }
                              }
                            );

                            if (conversationLog) {
                              try {
                                const parsed = JSON.parse(conversationLog.log);
                                return (
                                  <Link
                                    href={`/chat/${parsed.conversation_id}`}
                                    className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-1"
                                    target="_blank"
                                  >
                                    Open
                                    <ExternalLink className=" h-4 w-4" />
                                  </Link>
                                );
                              } catch (e) {
                                // Not a JSON string, do nothing
                              }
                            }
                          })()}
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
