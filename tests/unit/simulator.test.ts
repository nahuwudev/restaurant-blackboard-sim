import { describe, it, expect } from "bun:test";
import { createMixedTasks, createTestAgents } from "../helpers/factories";
import { Blackboard } from "../../src/core/blackboard";
import { Orchestrator } from "../../src/core/orchestrator";
import { Simulator } from "../../src/core/simulator";
import { TaskQueue } from "../../src/tasks/task-queue";
import { Agent } from "../../src/agents/agent";
import { TASK_KINDS, type Task } from "../../src/tasks/task";
import { EventLogger } from "../../src/metrics/event-log";
import { createCompletedEvent } from "../helpers/helper";
import { totalTicks } from "../../src/metrics/metrics";
import { EVENT_TYPES } from "../../src/metrics/events";

describe("Simulator", () => {
  it("registra un evento de tarea completada en el tick en que el agente termina", () => {
    const agent = new Agent({
      strength: 1,
      dexterity: 1,
      energy: 100,
    });

    const task = {
      difficulty: 5,
      id: crypto.randomUUID(),
      kind: TASK_KINDS.COOK,
      status: "pending" as const,
      takenBy: undefined,
      requiredItems: [],
    };

    const queue = new TaskQueue();

    queue.enqueue(task);

    const blackboard = new Blackboard(queue);
    const orchestrator = new Orchestrator();
    const logger = new EventLogger();

    const simulator = new Simulator([agent], orchestrator, blackboard, logger);

    simulator.run(15);

    const logs = logger.getLogs();
    const completedEvents = logs.filter(
      (e) => e.type === EVENT_TYPES.TASK_COMPLETED,
    );

    expect(completedEvents.length).toBe(1);
    expect(totalTicks(logs)).toBe(5);
  });

  it("todas las tasks están: done", () => {
    const agents = createTestAgents();
    const queue = createMixedTasks(10);
    const blackboard = new Blackboard(queue);
    const orchestrator = new Orchestrator();
    const simulator = new Simulator(agents, orchestrator, blackboard);
    simulator.run(100);

    const allTaskAreDone = queue.getAll();
    expect(allTaskAreDone.every((t) => t.task.status === "done")).toBe(true);
  });

  it("una tarea no se completa antes de que el agente termine de trabajarla", () => {
    // aptitud cook = 0.1 → ticksToComplete = 5
    const agent = new Agent({ strength: 1, dexterity: 1, energy: 100 });
    const queue = new TaskQueue();
    queue.enqueue({
      id: crypto.randomUUID(),
      kind: TASK_KINDS.COOK,
      difficulty: 5,
      requiredItems: [],
      status: "pending",
    });
    const sim = new Simulator(
      [agent],
      new Orchestrator(),
      new Blackboard(queue),
    );

    sim.run(3);
    expect(queue.getAll()[0]!.task.status).not.toBe("done");

    sim.run(10);
    expect(queue.getAll()[0]!.task.status).toBe("done");
  });

  it("trabajar gasta energía y estar ocioso la recupera", () => {
    const busy = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const queue = new TaskQueue();
    for (let i = 0; i < 5; i++) {
      queue.enqueue({
        id: crypto.randomUUID(),
        kind: TASK_KINDS.COOK,
        difficulty: 8,
        requiredItems: [],
        status: "pending",
      });
    }
    new Simulator([busy], new Orchestrator(), new Blackboard(queue)).run(5);
    expect(busy.stats.energy).toBeLessThan(100);

    const idle = new Agent({ strength: 5, dexterity: 5, energy: 40 });
    new Simulator(
      [idle],
      new Orchestrator(),
      new Blackboard(new TaskQueue()),
    ).run(3);
    expect(idle.stats.energy).toBe(55);
  });
});
