import { EVENT_TYPES } from "../../src/metrics/events";
import type {
  TaskCreatedEvent,
  TaskTakenEvent,
  TaskCompletedEvent,
  TickEndEvent,
} from "../../src/metrics/types";
import { TASK_KINDS, type Task } from "../../src/tasks/task";
import { Agent } from "../../src/agents/agent";
import { Blackboard } from "../../src/core/blackboard";
import { Orchestrator } from "../../src/core/orchestrator";
import { Simulator } from "../../src/core/simulator";
import { TaskQueue } from "../../src/tasks/task-queue";
import { EventLogger } from "../../src/metrics/event-log";

export function createSimulatorWithDefaultTask(agentOverrides = {}) {
  const agent = new Agent({
    strength: 1,
    dexterity: 1,
    energy: 100,
    ...agentOverrides,
  });

  const task: Task = {
    difficulty: 5,
    id: crypto.randomUUID(),
    kind: TASK_KINDS.COOK,
    status: "pending",
    takenBy: undefined,
    requiredItems: [],
  };

  const queue = new TaskQueue();
  queue.enqueue(task);

  const blackboard = new Blackboard(queue);
  const orchestrator = new Orchestrator();
  const logger = new EventLogger();

  const simulator = new Simulator([agent], orchestrator, blackboard, logger);

  return { simulator, logger, agent, task, queue };
}

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
    agentBest: 0,
    teamBest: 0,
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

export function createTickEndEvent(
  overrides?: Partial<TickEndEvent>,
): TickEndEvent {
  return {
    type: EVENT_TYPES.TICK_END,
    tick: 1,
    energies: {},
    ...overrides,
  };
}
