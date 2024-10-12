"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Validator } from "jsonschema";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { Skeleton } from "@/components/ui/skeleton";
import getHeaders from "@/app/utils/headers.util";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Step, StepItem, Stepper, useStepper } from "@/components/ui/stepper";

const expectedOutputSchema = z.object({
  output: z
    .string()
    .min(1, { message: "Expected output is required" })
    .refine(
      (value) => {
        const validator = new Validator();
        const jsonSchema = {
          type: "object",
          properties: {
            key: { type: "string" },
            someotherkey: { type: "string" },
          },
          required: ["key", "someotherkey"],
          additionalProperties: false,
        };
        try {
          const json = JSON.parse(value);
          const validationResult = validator.validate(json, jsonSchema);
          return validationResult.valid;
        } catch {
          return false;
        }
      },
      {
        message:
          "Expected output must be valid JSON with 'key' and 'someotherkey'.",
      }
    ),
});

const taskSchema = z.object({
  description: z.string().min(1, { message: "Description is required" }),
  tools: z
    .array(z.string().min(1))
    .min(1, { message: "At least one tool is required" }),
  expected_output: expectedOutputSchema,
});

const formSchema = z.object({
  system: z.string().min(1, { message: "System Input is required" }),
  role: z.string().min(1, { message: "Role is required" }),
  goal: z.string().min(1, { message: "Goal is required" }),
  backstory: z.string().min(1, { message: "Backstory is required" }),
  tasks: z
    .array(taskSchema)
    .min(1)
    .max(5, { message: "You can add up to 5 tasks" }),
});

function CustomAgent() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      system: "",
      role: "",
      goal: "",
      backstory: "",
      tasks: [
        {
          description: "",
          tools: [""],
          expected_output: { output: "" },
        },
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

  const {
    data: toolsData,
    isLoading: toolsLoading,
    error,
  } = useQuery({
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
    mutationFn: async (customAgent: z.infer<typeof formSchema>) => {
      const header = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      return axios.post(`${baseUrl}/api/v1/agents/`, customAgent, {
        headers: header,
      });
    },
  })
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    submitCustomAgentForm.mutateAsync(values);
  }
  const steps = [
    {
      id: "0",
      label: "Agent Info",
      description: "Provide information about the agent",
    },
    { id: "1", label: "Tasks", description: "Assign tasks to the agent" },
    { id: "2", label: "Finish", description: "Use your custom agent" },
  ] satisfies StepItem[];

  return (
    <>
      <Stepper
        orientation={"vertical"}
        initialStep={0}
        steps={steps}
        variant="circle"
        onClickStep={(step, setStep) => {
          setStep(step);
        }}
      >
        {steps.map((stepProps, index) => {
          return (
            <Step key={stepProps.label} {...stepProps}>
              {index === 0 && (
                <Card className="max-h-[calc(100vh-18rem)] overflow-auto">
                  <CardHeader>
                    <CardTitle>Agent</CardTitle>
                    <CardDescription>Agent Description</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-8"
                      >
                        <FormField
                          control={form.control}
                          name="system"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-3   aa">
                                <p>System Input</p>
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
                                  placeholder="What will be the system input"
                                  className="resize-y max-h-44"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-3">
                                <p>Role</p>
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
                                  placeholder="What will be the role of the agent?"
                                  className="resize-y max-h-44"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="goal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-3">
                                <p>Goal</p>
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
                                  placeholder="What will be the goal of the agent?"
                                  className="resize-y max-h-44"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="backstory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-3">
                                <p>Backstory</p>
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
                                  placeholder="What will be the backstory of the agent?"
                                  className="resize-y max-h-44"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
              {index === 1 && (
                <Card className="max-h-[calc(100vh-18rem)] overflow-auto">
                  <CardHeader>
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>Assign Tasks to the Agent</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-8"
                      >
                        {fields.map((task, index) => (
                          <Card
                            key={task.id}
                            className="relative p-4 mb-4 flex flex-col gap-4 border-black/10 shadow-md"
                          >
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => remove(index)}
                                className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-300 rounded-full"
                              >
                                <X size={16} />
                              </Button>
                            )}

                            <h3 className="font-semibold">Task {index + 1}</h3>
                            <FormField
                              control={form.control}
                              name={`tasks.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-3">
                                    <p>Description</p>
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
                                      placeholder="Task description"
                                      {...field}
                                      className="resize-y max-h-44"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`tasks.${index}.tools`}
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
                                      options={toolsData.map((tool:any) => ({
                                        value: tool.id,
                                        label: tool.name,
                                      }))}
                                      value={selectedTools[index] || []}
                                      onValueChange={(tools) =>
                                        handleToolChange(index, tools)
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

                            <div className="flex flex-col gap-2">
                              <h4>Expected Output (JSON)</h4>
                              <Textarea
                                placeholder='{"key": "value", "someotherkey": "value"}'
                                {...form.register(
                                  `tasks.${index}.expected_output.output`
                                )}
                                className="resize-y max-h-44"
                              />
                              {form.formState.errors.tasks?.[index]
                                ?.expected_output?.output && (
                                <p className="text-red-500">
                                  {
                                    form.formState.errors.tasks[index]
                                      .expected_output.output.message
                                  }
                                </p>
                              )}
                            </div>
                          </Card>
                        ))}

                        {fields.length >= 5 && (
                          <p className="text-red-500">
                            You cannot add more than 5 tasks.
                          </p>
                        )}

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
                              <Plus /> Add Task{" "}
                            </Button>
                          </div>
                        )}
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
              {index === 2 && (
                <Card className="h-[calc(100vh-19rem)] overflow-auto">
                  <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                    <CardDescription>
                      You have successfully created an agent.
                    </CardDescription>
                    <CardContent>
                      <h3>{submitCustomAgentForm.isSuccess && (<>success</>)}</h3>
                    </CardContent>
                  </CardHeader>
                </Card>
              )}
            </Step>
          );
        })}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Footer form={form} submitForm={form.handleSubmit(onSubmit)} />
          </form>
        </Form>
      </Stepper>
    </>
  );
}
const Footer = ({
  submitForm,
  form,
}: {
  submitForm: () => void;
  form: any;
}) => {
  const {
    nextStep,
    prevStep,
    resetSteps,
    isDisabledStep,
    hasCompletedAllSteps,
    isLastStep,
    isOptionalStep,
    currentStep,
  } = useStepper();

  const validateCurrentStep = async () => {
    let isValid = false;
    if (currentStep.id === "0") {
      const result = await form.trigger([
        "system",
        "role",
        "goal",
        "backstory",
      ]);
      isValid = result;
    } else if (currentStep.id == "1") {
      const result = await form.trigger("tasks");
      const taskCount = form.getValues("tasks").length;
      isValid = result && taskCount > 0;
    } else {  
      isValid = true;
    }
    return isValid;
  };

  const handleNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      nextStep();
    }
  };

  return (
    <>
      {hasCompletedAllSteps && (
        <div className="h-40 flex items-center justify-center my-2 border bg-secondary text-primary rounded-md">
          <h1 className="text-xl">Woohoo! All steps completed! 🎉</h1>
        </div>
      )}
      <div className="w-full flex justify-end gap-2">
        {hasCompletedAllSteps ? (
          <Button size="sm" onClick={resetSteps}>
            Reset
          </Button>
        ) : (
          <>
            <Button
              type="button"
              disabled={isDisabledStep}
              onClick={prevStep}
              size="sm"
              variant="secondary"
            >
              Prev
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={isLastStep ? submitForm : handleNextStep}
            >
              {isLastStep ? "Finish" : isOptionalStep ? "Skip" : "Next"}
            </Button>
          </>
        )}
      </div>
    </>
  );
};

export default CustomAgent;
