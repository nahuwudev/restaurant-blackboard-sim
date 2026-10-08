import { z } from "zod";

export const TASK_KINDS = {
  COOK: "cook",
  WASH: "wash",
  PREP: "prep",
  SERVE: "serve",
} as const;

export type TaskKind = (typeof TASK_KINDS)[keyof typeof TASK_KINDS];

export const TaskKindSchema = z.enum(TASK_KINDS);

export const TaskSchema = z.object({
  id: z.uuid(),
  kind: TaskKindSchema,
  difficulty: z.number().min(1).max(10),
  requiredItems: z.array(z.string()),
  status: z.enum(["pending", "taken", "done"]),
  takenBy: z.string().optional(),
});

export const QueueItemSchema = z.object({
  task: TaskSchema,
  priority: z.number().int().min(1),
  createdAt: z.number().int().nonnegative(),
});

export type QueueTask = z.infer<typeof QueueItemSchema>;
export type Task = z.infer<typeof TaskSchema>;
