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
import { useEffect, useState } from "react";
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

const CustomAgent: React.FC = () => {
  const searchParams = useSearchParams();

  const agentIdParam = searchParams.get("edit");

  const { data: agentDetails, isLoading: agentDetailsLoading } = useQuery({
    queryKey: ["agents", agentIdParam],
    queryFn: async () => {
      const header = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_AGENT_BASE_URL;

      const response = await axios.get(
        `${baseUrl}/custom-agents/agents/${agentIdParam}`,
        {
          headers: header,
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
      const header = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_AGENT_BASE_URL;
      return (await axios.post(`${baseUrl}/custom-agents/agents`, customAgent, {
        headers: header,
      })) as AxiosResponse<CustomAgentType, any>;
    },
  });

  // const deployCustomAgent = useMutation({
  //   mutationFn: async (customAgent: { agent_id: string }) => {
  //     const header = await getHeaders();
  //     const baseUrl = process.env.NEXT_PUBLIC_AGENT_BASE_URL;
  //     return (await axios.post(
  //       `${baseUrl}/deployment/agents/${customAgent.agent_id}/deploy`,
  //       customAgent,
  //       {
  //         headers: header,
  //       }
  //     )) as AxiosResponse<
  //       {
  //         agent_id: "string";
  //         deployment_url: "string";
  //       },
  //       any
  //     >;
  //   },
  // });

  const updateCustomAgentForm = useMutation({
    mutationFn: async (customAgent: CustomAgentsFormValues) => {
      const header = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_AGENT_BASE_URL;
      return (await axios.put(
        `${baseUrl}/custom-agents/agents/${agentIdParam}`,
        customAgent,
        {
          headers: header,
        }
      )) as AxiosResponse<CustomAgentType, any>;
    },
  });

  const onSubmit: SubmitHandler<CustomAgentsFormValues> = async (values) => {
    if (agentIdParam) {
      await updateCustomAgentForm.mutateAsync(values, {
        onSuccess: (response) => {
          toast.success("Agent updated successfully");
          router.push("/agents");
        },
      });
    } else {
      await submitCustomAgentForm.mutateAsync(values, {
        onSuccess: (response) => {
          // alert(JSON.stringify(response.data));
          toast.success("Agent created successfully");
          // deployCustomAgent.mutateAsync(
          //   { agent_id: response.data.id },
          //   {
          //     onSuccess: (res) => {
          //       navigator.clipboard.writeText(res.data.deployment_url);
          //       toast.success("Agent deployed successfully");
          //     },
          //     onError: () => {
          //       toast.error("Failed to deploy agent");
          //     },
          //   }
          // );
          form.reset();
          router.push("/all-agents");
        },
      });
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
              <Card className="max-h-[calc(100vh-18rem)] overflow-auto border-none bg-background">
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
                        form={form}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
            {index === 1 && (
              <Card className="max-h-[calc(100vh-18rem)] overflow-auto border-none bg-background">
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
                      />
                      <InputField
                        name="goal"
                        label="Goal"
                        placeholder="What will be the goal of the agent?"
                        form={form}
                      />
                      <InputField
                        name="backstory"
                        label="Backstory"
                        placeholder="What will be the backstory of the agent?"
                        form={form}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
            {index === 2 && (
              <Card className="max-h-[calc(100vh-18rem)] overflow-auto border-none bg-background">
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
                            form={form}
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
                                      <p>Description about the Input</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                {!toolsLoading && toolsData ? (
                                  <MultiSelect
                                    options={toolsData.map(
                                      (tool: { id: string; name: string }) => ({
                                        value: tool.id,
                                        label: tool.name,
                                      })
                                    )}
                                    defaultValue={field.value || undefined}
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
                                      <p>Description about the Input</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder='{"key": "value", "someotherkey": "value"}'
                                    {...field}
                                    className="resize-y max-h-44"
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
        <Footer form={form} submitForm={form.handleSubmit(onSubmit)} />
      </Stepper>
    </>
  );
};

export default CustomAgent;
