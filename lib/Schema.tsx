"use client";

import { z } from "zod";

export const DbMockFormSchema = z.object({
  flow: z.string().min(2).max(50),
  mock: z.boolean().optional(),
  databaseUser: z
    .string()
    .min(2, { message: "Username is required" })
    .max(50, {
      message: "Username must be less than 50 characters",
    })
    .optional(),
  databasePassword: z
    .string()
    .min(6, { message: "Password is required" })
    .max(50, {
      message: "Password must be less than 50 characters",
    })
    .optional(),
  databaseHostname: z
    .string()
    .max(50, {
      message: "Hostname must be less than 50 characters",
    })
    .optional(),
  dependency: z.array(z.string(), { required_error: "Dependency is required" }),
  port: z.string().optional(),
});

export const CustomAgentsExpectedOutputSchema = z.object({
  output: z
    .string()
    .min(1, { message: "Expected output is required" })
    .refine(
      (value) => {
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        } finally {
          return true;
        }
      },
      { message: "Expected output must be valid JSON." }
    ),
});

export const CustomAgentsTaskSchema = z.object({
  description: z.string().min(1, { message: "Description is required" }),
  tools: z
    .array(z.string().min(1))
    .min(1, { message: "At least one tool is required" }),
  expected_output: CustomAgentsExpectedOutputSchema,
});

export const CustomAgentsFormSchema = z.object({
  system: z.string().min(1, { message: "System Input is required" }),
  role: z.string().min(1, { message: "Role is required" }),
  goal: z.string().min(1, { message: "Goal is required" }),
  backstory: z.string().min(1, { message: "Backstory is required" }),
  tasks: z
    .array(CustomAgentsTaskSchema)
    .min(1)
    .max(5, { message: "You can add up to 5 tasks" }),
});

export type CustomAgentsFormValues = z.infer<typeof CustomAgentsFormSchema>;
