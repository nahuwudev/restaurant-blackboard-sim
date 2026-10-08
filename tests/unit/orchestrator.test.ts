import { describe, it, expect } from "bun:test";
import { Orchestrator } from "../../src/core/orchestrator";
import { Agent } from "../../src/agents/agent";
import { TASK_KINDS, type Task } from "../../src/tasks/task";
import { TaskQueue } from "../../src/tasks/task-queue";
import { scoreAction } from "../../src/utility/evaluator";
import { Blackboard } from "../../src/core/blackboard";
import { createMixedTasks, createTestAgents } from "../helpers/factories";

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
