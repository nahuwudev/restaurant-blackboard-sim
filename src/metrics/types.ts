import type { TaskKind } from "../tasks/task";
import { EVENT_TYPES } from "./events";

export interface TaskCreatedEvent {
  type: typeof EVENT_TYPES.TASK_CREATED;
  tick: number;
  taskId: string;
  kind: TaskKind;
}

export interface TaskTakenEvent {
  type: typeof EVENT_TYPES.TASK_TAKEN;
  tick: number;
  taskId: string;
  kind: TaskKind;
  agentId: string;
  aptitude: number;
  agentBest: number;
  teamBest: number;
}

export interface TaskCompletedEvent {
  type: typeof EVENT_TYPES.TASK_COMPLETED;
  tick: number;
  taskId: string;
  agentId: string;
}

export interface ConflictEvent {
  type: typeof EVENT_TYPES.CONFLICT;
  tick: number;
  taskId: string;
}

export interface TickEndEvent {
  type: typeof EVENT_TYPES.TICK_END;
  tick: number;
  energies: Record<string, number>;
}

export type SimulationEvent =
  | TaskCreatedEvent
  | TaskTakenEvent
  | TaskCompletedEvent
  | ConflictEvent
  | TickEndEvent;
