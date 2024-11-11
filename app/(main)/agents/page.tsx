"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios, { AxiosResponse } from "axios";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { InfoIcon, Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { Skeleton } from "@/components/ui/skeleton";
import getHeaders from "@/app/utils/headers.util";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Step, Stepper } from "@/components/ui/stepper";
import InputField from "./components/InputFields";
import Footer from "./components/Footer";
import { CustomAgentsFormSchema, CustomAgentsFormValues } from "@/lib/Schema";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { auth } from "@/configs/Firebase-config";
import { useFeatureFlagEnabled } from "posthog-js/react";
import AgentService from "@/services/AgentService";
import posthog from 'posthog-js';

const CustomAgent: React.FC = () => {
  const searchParams = useSearchParams();
  const agentIdParam = searchParams.get("edit");
  const userId = auth.currentUser?.uid || "";

  const { data: agentDetails, isLoading: agentDetailsLoading } = useQuery({
    queryKey: ["agents", agentIdParam],
    queryFn: async () => {
      const header = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;

      const response = await axios.get(
        `${baseUrl}/custom-agents/agents/${agentIdParam}`,
        {
          headers: header,
          params: {
            user_id: userId,
          },
        }
      );
      return response.data as CustomAgentType;
    },
    enabled: !!agentIdParam,
  });

  const router = useRouter();
  const form = useForm<CustomAgentsFormValues>({
    resolver: zodResolver(CustomAgentsFormSchema),
    defaultValues: {
      system_prompt: "",
      role: "",
      goal: "",
      backstory: "",
      tasks: [
        { description: "", tools: [""], expected_output: { output: "" } },
      ],
    },
  });

  const [errorStates, setErrorStates] = useState<
    ("error" | "loading" | undefined)[]
  >([undefined, undefined, undefined]);
  const [currentStep, setCurrentStep] = useState(0);

  const validateCurrentStep = async (stepIndex: number) => {
    let isValid = false;

    if (stepIndex === 0) {
      isValid = await form.trigger("system_prompt");
    } else if (stepIndex === 1) {
      isValid = await form.trigger(["role", "goal", "backstory"]);
    } else if (stepIndex === 2) {
      const result = await form.trigger("tasks");
      const taskCount = form.getValues("tasks").length;
      isValid = result && taskCount > 0;
    }

    setErrorStates((prev) => {
      const updatedStates = [...prev];
      updatedStates[stepIndex] = isValid ? undefined : "error";
      return updatedStates;
    });

    return isValid;
  };

  const handleStepClick = async (
    stepIndex: number,
    setStep: (step: number) => void
  ) => {
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
      setStep(stepIndex);
    } else {
      const isValid = await validateCurrentStep(currentStep);
      if (isValid) {
        setCurrentStep(stepIndex);
        setStep(stepIndex);
      }
    }
  };

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tasks",
  });

  const fetchTools = async () => {
    const header = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const response = await axios.get(`${baseUrl}/api/v1/tools/list_tools`, {
      headers: header,
    });
    return response.data;
  };

  const { data: toolsData, isLoading: toolsLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: fetchTools,
  });

  const [selectedTools, setSelectedTools] = useState<string[][]>(
    fields.map(() => [])
  );

  useEffect(() => {
    if (agentDetails && !agentDetailsLoading) {
      form.reset({
        system_prompt: agentDetails.system_prompt || "",
        role: agentDetails.role || "",
        goal: agentDetails.goal || "",
        backstory: agentDetails.backstory || "",
        tasks: (agentDetails.tasks as any) || [
          { description: "", tools: [""], expected_output: { output: "" } },
        ],
      });
      if (agentDetails.tasks.length > 0) {
        setSelectedTools(agentDetails.tasks.map((task) => task.tools));
      }
    }
  }, [agentDetails, agentDetailsLoading, form]);

  const handleToolChange = (taskIndex: number, tools: string[]) => {
    const updatedTools = [...selectedTools];
    updatedTools[taskIndex] = tools;
    setSelectedTools(updatedTools);
    form.setValue(`tasks.${taskIndex}.tools`, tools);
  };

  const submitCustomAgentForm = useMutation({
    mutationFn: async (customAgent: CustomAgentsFormValues) => {
      return await AgentService.createAgent(customAgent);
    },
    onSuccess: () => {
      form.reset();
      toast.success("Agent created successfully");
      router.push("/all-agents");
    },
    onError: (error) => {
      toast.error("Failed to create agent. Please try again.");
      console.error("Creation error:", error);
    },
  });

  const updateCustomAgentForm = useMutation({
    mutationFn: async (customAgent: CustomAgentsFormValues) => {
      return await AgentService.updateAgent(agentIdParam || "", customAgent);
    },
    onSuccess: () => {
      toast.success("Agent updated successfully");
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update agent. Please try again.");
    },
  });

  const redeployCustomAgentForm = useMutation({
    mutationFn: async () => {
      if (!agentIdParam) {
        throw new Error("Agent ID parameter is missing");
      }
      return await AgentService.redeployAgent(agentIdParam);
    },
    onSuccess: () => {
      toast.success("Agent redeployed successfully");
    },
    onError: (error) => {
      console.error("Redeploy error:", error);
      toast.error("Failed to redeploy agent. Please try again.");
    },
  });

  const { data: agentStatus, isLoading: agentStatusLoading } = useQuery({
    queryKey: ["agent-status", agentIdParam],
    queryFn: async () => {
      return await AgentService.getAgentStatus(agentIdParam || "");
    },
    enabled: !!agentIdParam,
  });

  const onSubmit: SubmitHandler<CustomAgentsFormValues> = async (values) => {
    if (agentIdParam) {
      await updateCustomAgentForm.mutateAsync(values);
      if (agentStatus === "RUNNING") {
        await redeployCustomAgentForm.mutateAsync();
      }
      router.push("/all-agents");
    } else {
      await submitCustomAgentForm.mutateAsync(values);
    }
  };

  const steps = [
    {
      id: "0",
      label: "System Input",
      description: "Provide the system input for the agent",
    },
    {
      id: "1",
      label: "Agent Details",
      description: "Provide details about the agent",
    },
    { id: "2", label: "Tasks", description: "Assign tasks to the agent" },
  ];

  useEffect(() => {
    const user = auth.currentUser;
    if (user?.uid) {
      posthog.identify(user.uid);
      posthog.people.set({ id: user.uid });
    }
  }, [auth?.currentUser]);

  const customAgentsFlag = useFeatureFlagEnabled("custom_agents");

  useEffect(() => {
    if (customAgentsFlag === undefined) {
      return;
    }
    if (customAgentsFlag === false) {
      router.push("/");
      setTimeout(() => {
        window.open("https://potpie.ai/pricing", "_blank");
      }, 500);
    }
  }, [router, customAgentsFlag,auth?.currentUser]);

  if (customAgentsFlag === undefined) {
    return <Skeleton className="h-[calc(100vh-5rem)]" />;
  }

  return (
    <>
      <Stepper
        orientation="vertical"
        initialStep={0}
        steps={steps}
        variant="circle"
        size="lg"
      >
        {steps.map((stepProps, index) => (
          <Step
            key={stepProps.label}
            {...stepProps}
            state={errorStates[index]}
            onClickStep={(step, setStep) => handleStepClick(step, setStep)}
          >
            {index === 0 && (
              <Card className="h-[calc(100vh-20rem)] overflow-auto border-none bg-background">
                <CardContent className="p-6">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-8"
                    >
                      <InputField
                        name="system_prompt"
                        label="System Input"
                        placeholder="What will be the system input"
                        InputClassName="min-h-[calc(100vh-25rem)]"
                        form={form}
                        tooltip="set of instructions that the agent"
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
            {index === 1 && (
              <Card className="h-[calc(100vh-20rem)] overflow-auto border-none bg-background">
                <CardContent className="p-6">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-8"
                    >
                      <InputField
                        name="role"
                        label="Role"
                        placeholder="What will be the role of the agent?"
                        form={form}
                        tooltip="Defines the agent's function."
                      />
                      <InputField
                        name="goal"
                        label="Goal"
                        placeholder="What will be the goal of the agent?"
                        form={form}
                        tooltip="The individual objective that the agent aims to achieve."
                      />
                      <InputField
                        name="backstory"
                        label="Backstory"
                        placeholder="What will be the backstory of the agent?"
                        form={form}
                        tooltip="Provides context to the agent's role and goal."
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
            {index === 2 && (
              <Card className="h-[calc(100vh-21.5rem)] overflow-auto border-none bg-background">
                <CardContent className="p-6">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-8"
                    >
                      {fields.map((task, idx) => (
                        <Card
                          key={task.id}
                          className="relative p-4 mb-4 flex flex-col gap-4 border-black/10 shadow-md"
                        >
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => remove(idx)}
                              className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-300 rounded-full"
                            >
                              <X size={16} />
                            </Button>
                          )}
                          <h3 className="font-semibold">Task {idx + 1}</h3>
                          <InputField
                            name={`tasks.${idx}.description`}
                            label="Description"
                            placeholder="Task description"
                            InputClassName="min-h-[calc(100vh-55rem)]"
                            form={form}
                            tooltip="A clear, concise statement of what the task entails."
                          />
                          <FormField
                            control={form.control}
                            name={`tasks.${idx}.tools`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-3">
                                  <p>Tools</p>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <InfoIcon className="size-5" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        The functions or capabilities the agent
                                        can utilize to perform the task.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                {!toolsLoading && toolsData ? (
                                  <MultiSelect
                                    options={toolsData.map(
                                      (tool: { id: string; name: string; description: string }) => ({
                                        value: tool.id,
                                        label: tool.name,
                                        description: tool.description,
                                      })
                                    )}
                                    defaultValue={
                                      Array.isArray(field.value) &&
                                      field.value.length === 1 &&
                                      field.value[0] === ""
                                        ? []
                                        : field.value
                                    }
                                    value={selectedTools[idx] || []}
                                    onValueChange={(tools) =>
                                      handleToolChange(idx, tools)
                                    }
                                    placeholder="Select tools"
                                  />
                                ) : (
                                  <Skeleton className="w-full h-10" />
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`tasks.${idx}.expected_output.output`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-3">
                                  <p>Expected Output (JSON)</p>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <InfoIcon className="size-5" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        The functions or capabilities the agent
                                        can utilize to perform the task.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder='{"key": "value", "someotherkey": "value"}'
                                    {...field}
                                    className="resize-y min-h-[calc(100vh-55rem)]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </Card>
                      ))}
                      {fields.length < 5 && (
                        <div className="flex flex-col gap-2 items-center justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              append({
                                description: "",
                                tools: [""],
                                expected_output: { output: "" },
                              })
                            }
                          >
                            <Plus /> Add Task
                          </Button>
                        </div>
                      )}
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </Step>
        ))}
        <Footer
          form={form}
          submitForm={form.handleSubmit(onSubmit)}
          update={!!agentIdParam}
          primaryBtnLoading={
            updateCustomAgentForm.isPending ||
            submitCustomAgentForm.isPending ||
            redeployCustomAgentForm.isPending 
          }
          redeploy={agentStatus === "RUNNING"}
          statusLoading={agentIdParam !== "" && agentStatusLoading}
        />
      </Stepper>
    </>
  );
};

export default CustomAgent;
