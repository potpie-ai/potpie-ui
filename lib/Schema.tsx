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
