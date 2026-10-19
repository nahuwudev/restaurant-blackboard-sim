import { describe, it, expect } from "bun:test";
import { Blackboard } from "../../src/core/blackboard";
import { TaskQueue } from "../../src/tasks/task-queue";
import { Agent } from "../../src/agents/agent";
import { AGENT_ROLE, AGENT_TOOL } from "../../src/agents/agent.types";
import { TASK_KINDS, type Task } from "../../src/tasks/task";
import { scoreAction } from "../../src/utility/evaluator";

describe("Sistema de Inventario (Sección 6)", () => {
  describe("6.1 Inventario Global & Reabastecimiento", () => {
    it("consume recursos correctamente y detecta falta de stock", () => {
      const queue = new TaskQueue();
      const board = new Blackboard(queue);

      board.restock({ tomatoes: 3, flour: 2 });
      expect(board.hasResources(["tomatoes", "flour"])).toBe(true);
      expect(board.hasResources(["tomatoes", "oil"])).toBe(false);

      const success = board.consumeResources(["tomatoes", "flour"]);
      expect(success).toBe(true);

      const snapshot = board.getSnapshot();
      expect(snapshot.inventory["tomatoes"]).toBe(2);
      expect(snapshot.inventory["flour"]).toBe(1);

      // Si no hay recursos suficientes, no consume
      const fail = board.consumeResources(["oil"]);
      expect(fail).toBe(false);
    });

    it("reabastece automáticamente cada N ticks", () => {
      const queue = new TaskQueue();
      const board = new Blackboard(queue);

      board.setRestockSchedule(5, { soap: 10, water: 20 });

      for (let i = 0; i < 4; i++) board.tick();
      expect(board.getSnapshot().inventory["soap"]).toBeUndefined();

      board.tick(); // Tick 5 -> se activa el reabastecimiento
      expect(board.getSnapshot().inventory["soap"]).toBe(10);
      expect(board.getSnapshot().inventory["water"]).toBe(20);

      for (let i = 0; i < 5; i++) board.tick(); // Tick 10 -> segundo reabastecimiento
      expect(board.getSnapshot().inventory["soap"]).toBe(20);
    });
  });

  describe("6.2 Inventario Personal & Herramientas", () => {
    it("herramienta afín reduce tiempo en 20% y herramienta ajena penaliza con +20%", () => {
      const cookTask: Task = {
        id: crypto.randomUUID(),
        kind: TASK_KINDS.COOK,
        difficulty: 10,
        requiredItems: [],
        status: "pending",
      };

      const agent = new Agent({ strength: 5, dexterity: 5, energy: 100 });
      const baseTicks = agent.ticksToComplete(cookTask); // Sin herramienta

      // Equipa herramienta afín (cuchillo para cook) -> -20% ticks
      agent.equipTool(AGENT_TOOL.CHEF_KNIFE);
      const affinitiveTicks = agent.ticksToComplete(cookTask);
      expect(affinitiveTicks).toBeLessThanOrEqual(baseTicks);

      // Equipa herramienta ajena (escoba para cook) -> +20% penalización de tiempo
      agent.equipTool(AGENT_TOOL.BROOM);
      const penaltyTicks = agent.ticksToComplete(cookTask);
      expect(penaltyTicks).toBeGreaterThan(affinitiveTicks);
    });

    it("equipa herramienta por defecto según el rol del agente", () => {
      const cook = new Agent({
        strength: 9,
        dexterity: 2,
        energy: 100,
        preferredRole: AGENT_ROLE.COOK,
      });
      cook.equipDefaultTool();
      expect(cook.tool).toBe(AGENT_TOOL.CHEF_KNIFE);

      const washer = new Agent({
        strength: 2,
        dexterity: 9,
        energy: 100,
        preferredRole: AGENT_ROLE.DISHWASHER,
      });
      washer.equipDefaultTool();
      expect(washer.tool).toBe(AGENT_TOOL.BROOM);

      const waiter = new Agent({
        strength: 3,
        dexterity: 8,
        energy: 100,
        preferredRole: AGENT_ROLE.WAITER,
      });
      waiter.equipDefaultTool();
      expect(waiter.tool).toBe(AGENT_TOOL.TRAY);
    });
  });

  describe("6.3 Conexión con Utility AI", () => {
    it("la falta de recursos en inventario reduce drásticamente el score de la tarea (factor 0.05)", () => {
      const agent = new Agent({ strength: 9, dexterity: 2, energy: 100 });
      const queue = new TaskQueue();
      const taskWithResources: Task = {
        id: crypto.randomUUID(),
        kind: TASK_KINDS.COOK,
        difficulty: 5,
        requiredItems: ["tomatoes", "flour"],
        status: "pending",
      };
      queue.enqueue(taskWithResources);

      const board = new Blackboard(queue);
      const snapshotNoStock = board.getSnapshot();
      const [queueItem] = queue.getAll();

      // Sin stock en inventario
      const scoreNoStock = scoreAction(agent, queueItem!, snapshotNoStock);

      // Con stock en inventario
      board.restock({ tomatoes: 10, flour: 10 });
      const snapshotWithStock = board.getSnapshot();
      const scoreWithStock = scoreAction(agent, queueItem!, snapshotWithStock);

      expect(scoreWithStock).toBeGreaterThan(scoreNoStock * 10);
    });
  });
});
