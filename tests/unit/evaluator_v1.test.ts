import { describe, it, expect } from "bun:test";
import { Agent } from "../../src/agents/agent";
import { TaskQueue } from "../../src/tasks/task-queue";
import { scoreAction } from "../../src/utility/evaluator";
import { Blackboard } from "../../src/core/blackboard";
import { createMixedTasks, createTestAgents, isTaskAffinedToAgent, selectBestAgentForTask } from "../helpers/factories";
import { TASK_KINDS } from "../../src/tasks/task";


describe("Comportamiento emergente de Agentes (Sin Orquestación)", () => {
  it("debe seleccionar tareas afines a sus stats más del 60% del tiempo", () => {
    // 1. Setup: Crear 3 agentes y 20 tareas
    const agents = createTestAgents();
    const tasks = createMixedTasks(100);

    let affinityMatches = 0;
    const totalTasks = tasks.getAll();
    const totalDecisions = totalTasks.length;

    const board = new Blackboard(tasks);
    board.tick();
    const bb = board.getSnapshot();

    // 2. Bucle de ejecución: Correr la simulación dentro del it
    for (const task of totalTasks) {
      // Cada agente evalúa la tarea según su función de utilidad
      const chosenAgent = selectBestAgentForTask(agents, task, bb);

      // Verificar si la tarea coincidía con el stat dominante del agente
      if (isTaskAffinedToAgent(chosenAgent, task)) {
        affinityMatches++;
      }
    }

    // 3. Aserción: Calcular la tasa de afinidad
    const affinityRate = affinityMatches / totalDecisions;

    // Medir si supera el threshold del 60% (0.60)
    expect(affinityRate).toBeGreaterThan(0.6);
  });

  it("no devuelve el mismo score para dos contextos distintos", () => {
    const agent = new Agent({ strength: 8, dexterity: 2, energy: 100 });
    const queue = new TaskQueue();
    queue.enqueue({
      id: crypto.randomUUID(),
      kind: TASK_KINDS.COOK,
      difficulty: 3,
      requiredItems: [],
      status: "pending",
    });

    queue.enqueue({
      id: crypto.randomUUID(),
      kind: "wash",
      difficulty: 8,
      requiredItems: [],
      status: "pending",
    });
    const board = new Blackboard(queue);
    board.tick(); // tick > 0 para que taskAge no sea 0 en todas
    const bb = board.getSnapshot();

    const [task1, task2] = queue.getAll();

    expect(scoreAction(agent, task1!, bb)).not.toBe(
      scoreAction(agent, task2!, bb),
    );
  });
});
