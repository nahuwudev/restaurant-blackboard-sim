import { describe, it, expect } from "bun:test";
import { Agent } from "../../src/agents/agent";
import { TaskQueue } from "../../src/tasks/task-queue";
import { Orchestrator } from "../../src/core/orchestrator";
import { Blackboard } from "../../src/core/blackboard";
import { Runner } from "../../src/core/runner/runner";
import { UtilityDispatcher } from "../../src/core/dispatchers/utility";
import { TASK_KINDS, type Task } from "../../src/tasks/task";

describe("Sistema de Evaluación, Penalizaciones e Incentivos (Sección 5)", () => {
  describe("5.2 Penalizaciones del sistema de agentes", () => {
    it("Penalización: agente sin tarea >5 ticks recupera energía de forma ineficiente (+2 en vez de +5)", () => {
      const agent = new Agent({ strength: 5, dexterity: 5, energy: 50 });

      // Ticks 1 a 5: recuperación normal (+5 por tick)
      for (let i = 0; i < 5; i++) {
        agent.recoverEnergy();
      }
      expect(agent.stats.energy).toBe(75); // 50 + 25

      // Tick 6: idleTicks > 5 -> recuperación ineficiente (+2 por tick)
      agent.recoverEnergy();
      expect(agent.stats.energy).toBe(77); // 75 + 2
    });

    it("Penalización: tarea abandonada (release) vuelve a la queue con prioridad reducida", () => {
      const queue = new TaskQueue();
      const task: Task = {
        id: crypto.randomUUID(),
        kind: TASK_KINDS.COOK,
        difficulty: 5,
        requiredItems: [],
        status: "pending",
      };
      queue.enqueue(task, 0); // initial priority = 1

      // Aumentamos prioridad con aging
      queue.ageTasks(10);
      const [itemBefore] = queue.getAll();
      const priorityBefore = itemBefore!.priority;
      expect(priorityBefore).toBe(11);

      queue.take(task.id, "agent-1");
      queue.release(task.id, "agent-1");

      const [itemAfter] = queue.getAll();
      expect(itemAfter!.priority).toBe(priorityBefore - 2); // 9
      expect(itemAfter!.task.status).toBe("pending");
    });

    it("Penalización: dos agentes en conflicto -> el perdedor pierde 1 tick de procesamiento", () => {
      const orchestrator = new Orchestrator();
      const queue = new TaskQueue();
      const agentWinner = new Agent({ strength: 9, dexterity: 2, energy: 100 }, "winner");
      const agentLoser = new Agent({ strength: 5, dexterity: 5, energy: 100 }, "loser");

      const taskId = crypto.randomUUID();
      queue.enqueue({
        id: taskId,
        kind: TASK_KINDS.COOK,
        difficulty: 5,
        requiredItems: [],
        status: "pending",
      });

      orchestrator.bid(agentWinner, taskId, 0.9);
      orchestrator.bid(agentLoser, taskId, 0.5);

      orchestrator.resolve(queue, 0);

      expect(agentWinner.stunTicks).toBe(0);
      expect(agentLoser.stunTicks).toBe(1);
      expect(agentLoser.isAvailable()).toBe(false);

      // Tras descansar/recuperarse un tick, se le pasa el aturdimiento
      agentLoser.recoverEnergy();
      expect(agentLoser.stunTicks).toBe(0);
      expect(agentLoser.isAvailable()).toBe(true);
    });

    it("Penalización: agente con energía 0 queda fuera de juego por 10 ticks de descanso forzado", () => {
      const agent = new Agent({ strength: 5, dexterity: 5, energy: 5 });
      const heavyTask: Task = {
        id: crypto.randomUUID(),
        kind: TASK_KINDS.COOK,
        difficulty: 10,
        requiredItems: [],
        status: "pending",
      };

      agent.consumeEnergy(heavyTask);
      expect(agent.stats.energy).toBe(0);
      expect(agent.forcedRestTicks).toBe(10);
      expect(agent.isAvailable()).toBe(false);

      // Requiere 10 ticks de descanso para estar disponible nuevamente
      for (let i = 0; i < 9; i++) {
        agent.recoverEnergy();
        expect(agent.isAvailable()).toBe(false);
      }
      agent.recoverEnergy(); // Tick 10
      expect(agent.forcedRestTicks).toBe(0);
      expect(agent.isAvailable()).toBe(true);
    });

    it("Penalización: tarea con inventario vacío ignorado falla y vuelve a la cola con dificultad +2", () => {
      const agent = new Agent({ strength: 8, dexterity: 2, energy: 100 });
      const task: Task = {
        id: crypto.randomUUID(),
        kind: TASK_KINDS.COOK,
        difficulty: 4,
        requiredItems: ["rare_spice"],
        status: "pending",
      };

      const result = Runner.runScenario(
        {
          name: "Inventario Vacío",
          agents: [agent],
          tasks: [task],
          maxTicks: 1,
        },
        new UtilityDispatcher(new Orchestrator()),
      );

      // Dado que el inventario nunca tuvo "rare_spice", la tarea falló y regresó con dificultad 6
      expect(task.difficulty).toBe(6);
      expect(result.completedTasks).toBe(0);
    });
  });

  describe("5.3 Incentivos positivos", () => {
    it("Incentivo: racha consecutiva de tareas otorga bonus de velocidad (+10% velocidad)", () => {
      const agent = new Agent({ strength: 5, dexterity: 5, energy: 100 });
      const task: Task = {
        id: crypto.randomUUID(),
        kind: TASK_KINDS.COOK,
        difficulty: 10,
        requiredItems: [],
        status: "pending",
      };

      const initialTicks = agent.ticksToComplete(task);

      // Simula completar una tarea sin descanso intermedio
      agent.onTaskCompleted(task);
      expect(agent.consecutiveTasks).toBe(1);

      // La siguiente tarea recibe el bonus del 10% de velocidad (menos ticks)
      const boostedTicks = agent.ticksToComplete(task);
      expect(boostedTicks).toBeLessThanOrEqual(initialTicks);
    });

    it("Incentivo: completar la tarea más afín recupera 5 puntos de energía extra", () => {
      // Cocinero especialista (su mejor tarea es cook)
      const cook = new Agent({ strength: 9, dexterity: 2, energy: 80 });
      const cookTask: Task = {
        id: crypto.randomUUID(),
        kind: TASK_KINDS.COOK,
        difficulty: 5,
        requiredItems: [],
        status: "pending",
      };

      cook.onTaskCompleted(cookTask);
      expect(cook.stats.energy).toBe(85); // 80 + 5 bonus de energía
    });

    it("Incentivo: queue vacía antes del tick límite registra el margen de eficiencia", () => {
      const agent = new Agent({ strength: 9, dexterity: 9, energy: 100 });
      const simpleTask: Task = {
        id: crypto.randomUUID(),
        kind: TASK_KINDS.COOK,
        difficulty: 1,
        requiredItems: [],
        status: "pending",
      };

      const result = Runner.runScenario(
        {
          name: "Margen de Eficiencia",
          agents: [agent],
          tasks: [simpleTask],
          maxTicks: 100,
        },
        new UtilityDispatcher(new Orchestrator()),
      );

      expect(result.completedTasks).toBe(1);
      expect(result.metrics.efficiencyMargin).toBeGreaterThan(0);
      expect(result.metrics.efficiencyMargin).toBe(100 - result.totalTicks);
    });
  });
});
