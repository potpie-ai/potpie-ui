"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
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
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Step, Stepper } from "@/components/ui/stepper";
import InputField from "./components/InputFields";
import Footer from "./components/Footer";
import { CustomAgentsFormSchema, CustomAgentsFormValues } from "@/lib/Schema";
import { redirect } from "next/navigation";

const CustomAgent: React.FC = () => {
  const form = useForm<CustomAgentsFormValues>({
    resolver: zodResolver(CustomAgentsFormSchema),
    defaultValues: {
      system: "",
      role: "",
      goal: "",
      backstory: "",
      tasks: [
        { description: "", tools: [""], expected_output: { output: "" } },
      ],
    },
  });

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

  const handleToolChange = (taskIndex: number, tools: string[]) => {
    const updatedTools = [...selectedTools];
    updatedTools[taskIndex] = tools;
    setSelectedTools(updatedTools);
    form.setValue(`tasks.${taskIndex}.tools`, tools);
  };

  const submitCustomAgentForm = useMutation({
    mutationFn: async (customAgent: CustomAgentsFormValues) => {
      const header = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      return axios.post(`${baseUrl}/api/v1/agents/`, customAgent, {
        headers: header,
      });
    },
  });

  const onSubmit: SubmitHandler<CustomAgentsFormValues> = async (values) => {
    await submitCustomAgentForm.mutateAsync(values, {
      onSuccess: () => {
        form.reset();
        redirect("/customagents");
      },
    });
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
      >
        {steps.map((stepProps, index) => (
          <Step
            key={stepProps.label}
            {...stepProps}
            onClickStep={(step, setStep) => {
              setStep(step);
            }}
          >
            {index === 0 && (
              <Card className="max-h-[calc(100vh-18rem)] overflow-auto">
                <CardContent className="p-6">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-8"
                    >
                      <InputField
                        name="system"
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
              <Card className="max-h-[calc(100vh-18rem)] overflow-auto">
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
              <Card className="max-h-[calc(100vh-18rem)] overflow-auto">
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
