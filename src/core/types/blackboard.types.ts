import { z } from "zod";
import { agentRoleSchema, AgentStatsSchema } from "../../agents/agent.types";
import { QueueItemSchema } from "../../tasks/task";

export const AgentSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: agentRoleSchema,
  stats: AgentStatsSchema,
  currentTaskId: z.string().optional(),
});
export type AgentSnapshot = z.infer<typeof AgentSnapshotSchema>;

export const BlackboardStateSchema = z.object({
  tick: z.number().int().nonnegative(),
  tasks: z.array(QueueItemSchema),
  agents: z.array(AgentSnapshotSchema),
  inventory: z.record(z.string(), z.number().int().nonnegative()),
  weights: z.object({
    cook: z.number().positive(),
    wash: z.number().positive(),
    prep: z.number().positive(),
    serve: z.number().positive(),
  }),
  metrics: z.object({
    completedTasksCount: z.number().int().nonnegative(),
    failedTasksCount: z.number().int().nonnegative(),
  }),
});
export type BlackboardState = z.infer<typeof BlackboardStateSchema>;
