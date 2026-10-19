import { describe, it, expect, beforeEach } from "bun:test";
import { Agent } from "../../src/agents/agent";
import { TASK_KINDS, type Task } from "../../src/tasks/task";
import { Blackboard } from "../../src/core/blackboard";
import { TaskQueue } from "../../src/tasks/task-queue";
import { scoreAction } from "../../src/utility/evaluator";

describe("Ejecución manual de tareas según estadísticas de agentes", () => {
  it("un agente cansado tarda más en la misma tarea", () => {
    const task: Task = {
      id: crypto.randomUUID(),
      kind: TASK_KINDS.COOK,
      difficulty: 10,
      requiredItems: [],
      status: "pending",
    };
    const rested = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    const tired = new Agent({ strength: 5, dexterity: 5, energy: 0 });
    expect(tired.ticksToComplete(task)).toBeGreaterThan(
      rested.ticksToComplete(task),
    ); // 4 vs 2
  });

  it("El score debe de bajar a 0 si un agente intenta tomar una tarea en el mismo momento en que tomo una.", () => {
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

    const blackboard = new Blackboard(queue);

    cookTask.takenBy = agent.id;
    agent.currentTaskId = cookTask.id;
    agent.taskTakenAtTick = blackboard.getSnapshot().tick + 1;
    blackboard.tick();
    const [task] = queue.getAll();
    const score = scoreAction(agent, task!, blackboard.getSnapshot());

    expect(score).toBe(0);

    blackboard.tick();
    const secondScore = scoreAction(agent, task!, blackboard.getSnapshot());
    expect(secondScore).toBeGreaterThan(0);
  });

  it("calcula el bestAptitude correctamente según las estadísticas del agente", () => {
    const strongAgent = new Agent({ strength: 9, dexterity: 2, energy: 100 });
    expect(strongAgent.bestAptitude()).toBe(0.9); // Cocinar con strength 9 -> 0.9

    const agileAgent = new Agent({ strength: 2, dexterity: 9, energy: 100 });
    expect(agileAgent.bestAptitude()).toBe(0.9); // Lavar/Servir con dexterity 9 -> 0.9 (empate)

    const balancedAgent = new Agent({ strength: 5, dexterity: 5, energy: 100 });
    expect(balancedAgent.bestAptitude()).toBe(0.5); // Prep (5+5)/20 -> 0.5
  });

  it("debe variar el tiempo y el consumo de energía según los stats de cada agente", () => {
    const strongAgent = new Agent({
      strength: 10,
      dexterity: 2,
      energy: 100,
    });

    const nimbleAgent = new Agent({
      strength: 2,
      dexterity: 10,
      energy: 100,
    });

    const cookTask: Task = {
      id: Math.random().toString(36).substring(2, 10),
      kind: TASK_KINDS.COOK,
      difficulty: 10,
      requiredItems: [],
      status: "pending",
    };

    const washTask: Task = {
      id: crypto.randomUUID(),
      kind: TASK_KINDS.WASH,
      difficulty: 10,
      requiredItems: [],
      status: "pending",
    };

    const cookTicksStrong = strongAgent.ticksToComplete(cookTask);
    const cookTicksNimble = nimbleAgent.ticksToComplete(cookTask);

    expect(cookTicksStrong).toBe(1);
    expect(cookTicksNimble).toBe(5);
    expect(cookTicksStrong).toBeLessThan(cookTicksNimble);

    // Tarea de lavado (wash -> usa Destreza):
    // strongAgent (dex 2)   -> 10 / 2  = 5 ticks
    // nimbleAgent (dex 10)  -> 10 / 10 = 1 tick
    const washTicksStrong = strongAgent.ticksToComplete(washTask);
    const washTicksNimble = nimbleAgent.ticksToComplete(washTask);

    expect(washTicksNimble).toBe(1);
    expect(washTicksStrong).toBe(5);
    expect(washTicksNimble).toBeLessThan(washTicksStrong);

    cookTask.takenBy = strongAgent.id;

    strongAgent.consumeEnergy(cookTask); // Toma 1 tick
    nimbleAgent.consumeEnergy(cookTask); // Toma 5 ticks

    expect(strongAgent.stats.energy).toBeGreaterThan(nimbleAgent.stats.energy);
  });
});
