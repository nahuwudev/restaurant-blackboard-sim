import { describe, it, expect } from "bun:test";
import { createMixedTasks, createTestAgents } from "../helpers/factories";
import { Blackboard } from "../../src/core/blackboard";
import { Orchestrator } from "../../src/core/orchestrator";
import { Simulator } from "../../src/core/simulator";
import { TaskQueue } from "../../src/tasks/task-queue";
import { Agent } from "../../src/agents/agent";
import { TASK_KINDS } from "../../src/tasks/task";
import { totalTicks } from "../../src/metrics/metrics";
import { EVENT_TYPES } from "../../src/metrics/events";
import { createSimulatorWithDefaultTask } from "../helpers/helper";
import { EventLogger } from "../../src/metrics/event-log";
import { createRng } from "../../src/core/helpers/rng";

describe("Simulator", () => {
  it("mantiene el tick original de creación de la tarea", () => {
    const agent = new Agent({ strength: 1, dexterity: 1, energy: 100 });
    const queue = new TaskQueue();

    const task = {
      id: crypto.randomUUID(),
      kind: TASK_KINDS.COOK,
      difficulty: 5,
      status: "pending" as const,
      takenBy: undefined,
      requiredItems: [],
    };

    queue.enqueue(task, 3);

    const logger = new EventLogger();
    const orch = new Orchestrator();
    const bb = new Blackboard(queue);

    const sim = new Simulator([agent], orch, bb, logger);

    sim.run(3);

    const logs = logger.getLogs();
    const taskCreated = logs.find((e) => e.type === EVENT_TYPES.TASK_CREATED);
    expect(taskCreated?.tick).toBe(3);
  });

  it("produce exactamente la misma secuencia de eventos con la misma semilla (ignorando IDs de tarea) y distinta con otra semilla", () => {
    const runSimulationWithSeed = (seed: number) => {
      const agent1 = new Agent({ strength: 8, dexterity: 2, energy: 100 });
      (agent1 as any).id = "agent-1";
      const agent2 = new Agent({ strength: 2, dexterity: 8, energy: 100 });
      (agent2 as any).id = "agent-2";

      const rng = createRng(seed);
      const queue = createMixedTasks(25, rng);

      const logger = new EventLogger();
      const orchestrator = new Orchestrator(logger);
      const simulator = new Simulator(
        [agent1, agent2],
        orchestrator,
        new Blackboard(queue),
        logger,
      );

      simulator.run(15);

      return logger.getLogs().map((e) => {
        const { taskId, ...rest } = e as any;
        return rest;
      });
    };

    const logsSeed42A = runSimulationWithSeed(42);
    const logsSeed42B = runSimulationWithSeed(42);
    const logsSeed100 = runSimulationWithSeed(100);

    expect(logsSeed42A).toEqual(logsSeed42B);

    expect(logsSeed42A).not.toEqual(logsSeed100);
  });

  it("emite exactamente 1 conflicto en el tick 0 con dos agentes compitiendo por tareas cook de alta dificultad", () => {
    const agent1 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const agent2 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const queue = new TaskQueue();

    queue.enqueue({
      id: crypto.randomUUID(),
      kind: TASK_KINDS.COOK,
      difficulty: 10,
      status: "pending",
      requiredItems: [],
    });
    queue.enqueue({
      id: crypto.randomUUID(),
      kind: TASK_KINDS.COOK,
      difficulty: 10,
      status: "pending",
      requiredItems: [],
    });

    const logger = new EventLogger();
    const orchestrator = new Orchestrator(logger);
    const simulator = new Simulator(
      [agent1, agent2],
      orchestrator,
      new Blackboard(queue),
      logger,
    );

    simulator.run(1);

    const conflicts = logger
      .getLogs()
      .filter((e) => e.type === EVENT_TYPES.CONFLICT);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0]?.tick).toBe(0);
  });

  it("registra task_created exactamente una vez aunque se corra run() varias veces", () => {
    const { simulator, logger, task } = createSimulatorWithDefaultTask();

    simulator.run(5);
    simulator.run(5);

    const logs = logger.getLogs();
    const createdEvents = logs.filter(
      (e) => e.type === EVENT_TYPES.TASK_CREATED,
    );

    expect(createdEvents.length).toBe(1);
    expect(createdEvents[0]?.taskId).toBe(task.id);
  });

  it("registra tantas task_created como tareas tenga la cola con sus respectivos tipos", () => {
    const agent = new Agent({ strength: 1, dexterity: 1, energy: 100 });
    const queue = new TaskQueue();

    const task1Id = crypto.randomUUID();
    const task2Id = crypto.randomUUID();

    const task1 = {
      id: task1Id,
      kind: TASK_KINDS.COOK,
      difficulty: 5,
      status: "pending" as const,
      takenBy: undefined,
      requiredItems: [],
    };
    const task2 = {
      id: task2Id,
      kind: TASK_KINDS.WASH,
      difficulty: 3,
      status: "pending" as const,
      takenBy: undefined,
      requiredItems: [],
    };

    queue.enqueue(task1);
    queue.enqueue(task2);

    const logger = new EventLogger();
    const simulator = new Simulator(
      [agent],
      new Orchestrator(),
      new Blackboard(queue),
      logger,
    );

    simulator.run(1);

    const logs = logger.getLogs();
    const createdEvents = logs.filter(
      (e) => e.type === EVENT_TYPES.TASK_CREATED,
    );

    expect(createdEvents.length).toBe(2);
    expect(createdEvents[0]?.taskId).toBe(task1Id);
    expect(createdEvents[0]?.kind).toBe(TASK_KINDS.COOK);
    expect(createdEvents[1]?.taskId).toBe(task2Id);
    expect(createdEvents[1]?.kind).toBe(TASK_KINDS.WASH);
  });

  it("registra eventos tick_end correctamente por cada tick", () => {
    const { simulator, logger, agent } = createSimulatorWithDefaultTask();

    simulator.run(15);

    const logs = logger.getLogs();
    const tickEndEvents = logs.filter((e) => e.type === EVENT_TYPES.TICK_END);

    expect(tickEndEvents.length).toBe(15);

    tickEndEvents.forEach((event, index) => {
      expect(event.tick).toBe(index);

      expect(event.energies[agent.id]).toBeDefined();
      expect(event.energies[agent.id]).toBeGreaterThanOrEqual(0);
      expect(event.energies[agent.id]).toBeLessThanOrEqual(100);
    });

    const firstTickEnergy = tickEndEvents[0]?.energies[agent.id];
    const lastTickEnergy = tickEndEvents[14]?.energies[agent.id];

    expect(firstTickEnergy).toBeLessThan(100);
    expect(lastTickEnergy).toBe(100);
  });

  it("emite task_taken con valores correctos para un agente fuerte con tarea cook", () => {
    const agent = new Agent({ strength: 9, dexterity: 2, energy: 100 });
    const queue = new TaskQueue();
    const task = {
      id: crypto.randomUUID(),
      kind: TASK_KINDS.COOK,
      difficulty: 5,
      status: "pending" as const,
      takenBy: undefined,
      requiredItems: [],
    };
    queue.enqueue(task);

    const logger = new EventLogger();
    const simulator = new Simulator(
      [agent],
      new Orchestrator(),
      new Blackboard(queue),
      logger,
    );

    simulator.run(1);

    const logs = logger.getLogs();
    const takenEvents = logs.filter((e) => e.type === EVENT_TYPES.TASK_TAKEN);

    expect(takenEvents.length).toBe(1);
    expect(takenEvents[0]?.agentId).toBe(agent.id);
    expect(takenEvents[0]?.aptitude).toBe(0.9);
    expect(takenEvents[0]?.agentBest).toBe(0.9);
    expect(takenEvents[0]?.teamBest).toBe(0.9);
  });

  it("emite task_taken reflejando que no está alineado si el agente fuerte toma task wash", () => {
    const agent = new Agent({ strength: 9, dexterity: 2, energy: 100 }); // wash aptitude es 0.2, best es 0.9
    const queue = new TaskQueue();
    const task = {
      id: crypto.randomUUID(),
      kind: TASK_KINDS.WASH,
      difficulty: 5,
      status: "pending" as const,
      takenBy: undefined,
      requiredItems: [],
    };
    queue.enqueue(task);

    const logger = new EventLogger();
    const simulator = new Simulator(
      [agent],
      new Orchestrator(),
      new Blackboard(queue),
      logger,
    );

    simulator.run(1);

    const logs = logger.getLogs();
    const takenEvents = logs.filter((e) => e.type === EVENT_TYPES.TASK_TAKEN);

    expect(takenEvents.length).toBe(1);
    expect(takenEvents[0]?.aptitude).toBe(0.2);
    expect(takenEvents[0]?.agentBest).toBe(0.9);
    expect(takenEvents[0]?.teamBest).toBe(0.2);
  });

  it("calcula teamBest correctamente considerando a todos los agentes del equipo", () => {
    const strongAgent = new Agent({ strength: 9, dexterity: 2, energy: 100 }); // aptitude cook = 0.9
    const weakAgent = new Agent({ strength: 2, dexterity: 2, energy: 100 }); // aptitude cook = 0.2

    const queue = new TaskQueue();
    const task = {
      id: crypto.randomUUID(),
      kind: TASK_KINDS.COOK,
      difficulty: 5,
      status: "pending" as const,
      takenBy: undefined,
      requiredItems: [],
    };
    queue.enqueue(task);

    const logger = new EventLogger();

    const simulator = new Simulator(
      [strongAgent, weakAgent],
      new Orchestrator(),
      new Blackboard(queue),
      logger,
    );

    simulator.run(1);

    const logs = logger.getLogs();
    const takenEvents = logs.filter((e) => e.type === EVENT_TYPES.TASK_TAKEN);

    expect(takenEvents.length).toBe(1);
    expect(takenEvents[0]?.teamBest).toBe(0.9);
  });

  it("registra un evento de tarea completada en el tick en que el agente termina", () => {
    const { simulator, logger } = createSimulatorWithDefaultTask();

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
