import { describe, it, expect } from "bun:test";
import { Orchestrator } from "../../src/core/orchestrator";
import { Agent } from "../../src/agents/agent";
import { TASK_KINDS, type Task } from "../../src/tasks/task";
import { TaskQueue } from "../../src/tasks/task-queue";
import { scoreAction } from "../../src/utility/evaluator";
import { Blackboard } from "../../src/core/blackboard";
import { createMixedTasks, createTestAgents } from "../helpers/factories";
import { EventLogger } from "../../src/metrics/event-log";
import { EVENT_TYPES } from "../../src/metrics/events";

describe("Orchestrator", () => {
  it("un agente hace la primera puja sobre una tarea vacía, el método devuelva true y registre la oferta.", () => {
    const agent = new Agent({
      strength: 10,
      dexterity: 2,
      energy: 100,
    });

    const cookTask: Task = {
      id: crypto.randomUUID(),
      kind: TASK_KINDS.COOK,
      difficulty: 10,
      requiredItems: [],
      status: "pending",
    };

    const queue = new TaskQueue();
    queue.enqueue(cookTask);
    const bb = new Blackboard(queue);
    const [task] = queue.getAll();

    const score = scoreAction(agent, task!, bb.getSnapshot());
    const orc = new Orchestrator();

    orc.bid(agent, cookTask.id, score);
    orc.resolve(queue, bb.getTick());
    const resolved = queue.getAll().find((t) => t.task.id === task?.task.id);
    expect(resolved?.task.takenBy).toBe(agent.id);
    expect(resolved?.task.status).toBe("taken");
  });

  it("emite exactamente 1 evento de conflicto si hay dos o más postores para una misma tarea", () => {
    const logger = new EventLogger();
    const orchestrator = new Orchestrator(logger);
    const agent1 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const agent2 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const taskId = crypto.randomUUID();
    const queue = new TaskQueue();

    orchestrator.bid(agent1, taskId, 10);
    orchestrator.bid(agent2, taskId, 8);

    orchestrator.resolve(queue, 0);

    const conflicts = logger
      .getLogs()
      .filter((e) => e.type === EVENT_TYPES.CONFLICT);
    expect(conflicts.length).toBe(1);
  });

  it("no arrastra conflictos de la ronda anterior al llamar a resolve dos veces", () => {
    const logger = new EventLogger();
    const orchestrator = new Orchestrator(logger);
    const agent1 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const agent2 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const taskId = crypto.randomUUID();
    const queue = new TaskQueue();

    orchestrator.bid(agent1, taskId, 10);
    orchestrator.bid(agent2, taskId, 8);
    orchestrator.resolve(queue, 0);

    orchestrator.resolve(queue, 1);

    const conflicts = logger
      .getLogs()
      .filter((e) => e.type === EVENT_TYPES.CONFLICT);
    expect(conflicts.length).toBe(1);
  });

  it("un solo postor da 0 conflictos", () => {
    const logger = new EventLogger();
    const orchestrator = new Orchestrator(logger);
    const agent = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const taskId = crypto.randomUUID();
    const queue = new TaskQueue();

    orchestrator.bid(agent, taskId, 10);
    orchestrator.resolve(queue, 0);

    const conflicts = logger
      .getLogs()
      .filter((e) => e.type === EVENT_TYPES.CONFLICT);
    expect(conflicts.length).toBe(0);
  });

  it("tres postores en la misma tarea emiten exactamente 1 evento de conflicto", () => {
    const logger = new EventLogger();
    const orchestrator = new Orchestrator(logger);
    const agent1 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const agent2 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const agent3 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const taskId = crypto.randomUUID();
    const queue = new TaskQueue();

    orchestrator.bid(agent1, taskId, 10);
    orchestrator.bid(agent2, taskId, 8);
    orchestrator.bid(agent3, taskId, 6);

    orchestrator.resolve(queue, 0);

    const conflicts = logger
      .getLogs()
      .filter((e) => e.type === EVENT_TYPES.CONFLICT);
    expect(conflicts.length).toBe(1);
  });

  it("dos tareas disputadas en la misma ronda emiten 2 eventos de conflicto", () => {
    const logger = new EventLogger();
    const orchestrator = new Orchestrator(logger);
    const agent1 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const agent2 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const task1 = crypto.randomUUID();
    const task2 = crypto.randomUUID();
    const queue = new TaskQueue();

    orchestrator.bid(agent1, task1, 10);
    orchestrator.bid(agent2, task1, 8);

    orchestrator.bid(agent1, task2, 5);
    orchestrator.bid(agent2, task2, 9);

    orchestrator.resolve(queue, 0);

    const conflicts = logger
      .getLogs()
      .filter((e) => e.type === EVENT_TYPES.CONFLICT);
    expect(conflicts.length).toBe(2);
  });

  it("un agente que puja dos veces por la misma tarea no genera conflicto", () => {
    const logger = new EventLogger();
    const orchestrator = new Orchestrator(logger);
    const agent = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const taskId = crypto.randomUUID();
    const queue = new TaskQueue();

    orchestrator.bid(agent, taskId, 5);
    orchestrator.bid(agent, taskId, 10);
    orchestrator.resolve(queue, 0);

    const conflicts = logger
      .getLogs()
      .filter((e) => e.type === EVENT_TYPES.CONFLICT);
    expect(conflicts.length).toBe(0);
  });

  it("no arrastra conflictos y el evento ocurre estrictamente en el tick 0", () => {
    const logger = new EventLogger();
    const orchestrator = new Orchestrator(logger);
    const agent1 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const agent2 = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const taskId = crypto.randomUUID();
    const queue = new TaskQueue();

    orchestrator.bid(agent1, taskId, 10);
    orchestrator.bid(agent2, taskId, 8);
    orchestrator.resolve(queue, 0);

    orchestrator.resolve(queue, 1);

    const conflicts = logger
      .getLogs()
      .filter((e) => e.type === EVENT_TYPES.CONFLICT);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0]?.tick).toBe(0);
  });

  it("dos agentes pujan por la misma tarea, gana el de mayor score, el perdedor no queda asignado.", () => {
    const agentA = new Agent({
      strength: 10,
      dexterity: 2,
      energy: 100,
    });

    const agentB = new Agent({
      strength: 2,
      dexterity: 10,
      energy: 100,
    });

    const cookTask: Task = {
      id: crypto.randomUUID(),
      kind: TASK_KINDS.COOK,
      difficulty: 10,
      requiredItems: [],
      status: "pending",
    };

    const queue = new TaskQueue();
    queue.enqueue(cookTask);

    const [task] = queue.getAll();

    const blackboard = new Blackboard(queue);

    const socoreForFirstAgent = scoreAction(
      agentA,
      task!,
      blackboard.getSnapshot(),
    );
    const scoreForSecondAgent = scoreAction(
      agentB,
      task!,
      blackboard.getSnapshot(),
    );

    const orc = new Orchestrator();

    orc.bid(agentA, cookTask.id, socoreForFirstAgent);
    orc.bid(agentB, cookTask.id, scoreForSecondAgent);

    orc.resolve(queue, blackboard.getTick());
    const resolved = queue.getAll().find((t) => t.task.id === task?.task.id);
    expect(resolved?.task.takenBy).toBe(agentA.id);
    expect(resolved?.task.status).toBe("taken");
  });

  it("Cero tareas tomadas por dos agentes simultáneamente.", () => {
    const agents = createTestAgents();
    const queue = createMixedTasks(50);
    const orchestrator = new Orchestrator();
    const bb = new Blackboard(queue);

    // todos los agentes pujan por todas las tasks
    for (const ag of agents) {
      for (const t of queue.pending()) {
        const score = scoreAction(ag, t, bb.getSnapshot());
        orchestrator.bid(ag, t.task.id, score);
      }
    }
    orchestrator.resolve(queue, bb.getTick());

    // Verificar que ningún agente aparece en más de una task
    const takenTasks = queue.getAll().filter((t) => t.task.status === "taken");

    for (const task of takenTasks) {
      const conflicts = takenTasks.filter(
        (t) => t.task.takenBy === task.task.takenBy,
      );
      expect(conflicts.length).toBe(1);
    }
  });

  it("un agente que gana varias pujas se queda con una sola tarea", () => {
    const agent = new Agent({ strength: 10, dexterity: 10, energy: 100 });
    const queue = new TaskQueue();
    for (let i = 0; i < 3; i++) {
      queue.enqueue({
        id: crypto.randomUUID(),
        kind: "cook",
        difficulty: 5,
        requiredItems: [],
        status: "pending",
      });
    }
    const orc = new Orchestrator();
    for (const t of queue.pending()) orc.bid(agent, t.task.id, 1);
    orc.resolve(queue, 0);

    const taken = queue.getAll().filter((t) => t.task.status === "taken");
    expect(taken.length).toBe(1);
    expect(taken[0]!.task.takenBy).toBe(agent.id);
  });
});
