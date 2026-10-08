import { EVENT_TYPES } from "../../src/metrics/events";
import type {
  TaskCreatedEvent,
  TaskTakenEvent,
  TaskCompletedEvent,
} from "../../src/metrics/types";
import { TASK_KINDS } from "../../src/tasks/task";


export function createCreatedEvent(
  overrides?: Partial<TaskCreatedEvent>,
): TaskCreatedEvent {
  return {
    type: EVENT_TYPES.TASK_CREATED,
    tick: 1,
    taskId: "task-1",
    kind: TASK_KINDS.COOK,
    ...overrides,
  };
}

export function createTakenEvent(
  overrides?: Partial<TaskTakenEvent>,
): TaskTakenEvent {
  return {
    type: EVENT_TYPES.TASK_TAKEN,
    tick: 3,
    taskId: "task-1",
    kind: TASK_KINDS.COOK,
    agentId: "agent-1",
    aptitude: 0.8,
    agentBest: "agent-1",
    teamBest: ["agent-1"],
    ...overrides,
  };
}

export function createCompletedEvent(
  overrides?: Partial<TaskCompletedEvent>,
): TaskCompletedEvent {
  return {
    type: EVENT_TYPES.TASK_COMPLETED,
    tick: 5,
    taskId: "task-1",
    agentId: "agent-1",
    ...overrides,
  };
}