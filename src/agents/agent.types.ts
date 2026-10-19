import { z } from "zod";

export const AGENT_ROLE = {
  COOK: "cook",
  "DISHWASHER": "dishwasher",
  WAITER: "waiter"
} as const

export type agentRole = (typeof AGENT_ROLE)[keyof typeof AGENT_ROLE];

export const agentRoleSchema = z.enum(AGENT_ROLE)

export const AGENT_TOOL = {
  CHEF_KNIFE: "chef_knife",
  BROOM: "broom",
  TRAY: "tray",
} as const;

export type AgentTool = (typeof AGENT_TOOL)[keyof typeof AGENT_TOOL];
export const agentToolSchema = z.enum(AGENT_TOOL);

export const ActionTypeSchema = z.enum([
  "take_task",
  "execute_task",
  "rest",
  "transfer_item",
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

export const AgentStatsSchema = z.object({
  strength: z.number().min(1).max(10),
  dexterity: z.number().min(1).max(10),
  energy: z.number().min(0).max(100),
  preferredRole: agentRoleSchema.optional(),
  tool: agentToolSchema.optional(),
});

export type AgentStats = z.infer<typeof AgentStatsSchema>;

export const ActionSchema = z.object({
  id: z.string(),
  type: ActionTypeSchema,
  agentId: z.string(),
  targetTaskId: z.string().optional(),
  preconditions: z.object({
    minEnergy: z.number().min(0).max(100).optional(),
    requiredItems: z.array(z.string()).optional(),
    requiredRole: agentRoleSchema.optional(),
  }),
});
export type Action = z.infer<typeof ActionSchema>;