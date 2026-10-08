export const EVENT_TYPES = {
  TASK_CREATED: "task_created",
  TASK_TAKEN: "task_taken",
  TASK_COMPLETED: "task_completed",
  CONFLICT: "conflict",
  TICK_END: "tick_end",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];