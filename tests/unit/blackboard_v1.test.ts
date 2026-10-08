import { describe, it, expect, beforeEach } from "bun:test";
import { Blackboard } from "../../src/core/blackboard";
import { TaskQueue } from "../../src/tasks/task-queue";
import { makeAgent, makeTask } from "../helpers/factories";

describe("Blackboard", () => {
  let queue: TaskQueue;
  let board: Blackboard;

  beforeEach(() => {
    queue = new TaskQueue();
    board = new Blackboard(queue);
  });

  describe("getSnapshot", () => {
    it("tick inicial es 0", () => {
      expect(board.getSnapshot().tick).toBe(0);
    });

    it("refleja el tick actual después de llamar tick()", () => {
      board.tick();
      board.tick();
      expect(board.getSnapshot().tick).toBe(2);
    });

    it("el snapshot incluye las tasks de la queue", () => {
      queue.enqueue(makeTask());
      queue.enqueue(makeTask());

      const { tasks } = board.getSnapshot();

      expect(tasks).toHaveLength(2);
    });

    it("el snapshot es una copia — mutar tasks no afecta la queue interna", () => {
      queue.enqueue(makeTask());
      const snapshot = board.getSnapshot();

      expect(snapshot.tasks[0]).not.toBe(queue.getAll()[0]);
    });

    it("el snapshot está frozen (no mutable en runtime)", () => {
      const snapshot = board.getSnapshot();

      expect(() => {
        (snapshot as any).tick = 999;
      }).toThrow();
    });

    it("propiedades anidadas también están frozen", () => {
      queue.enqueue(makeTask());
      const snapshot = board.getSnapshot();

      expect(() => {
        (snapshot.tasks[0] as any).priority = 999;
      }).toThrow();
    });
  });

  describe("registerAgent", () => {
    it("agrega un agente nuevo al snapshot", () => {
      board.registerAgent(makeAgent({ id: "a1", name: "Chef Juan" }));

      const { agents } = board.getSnapshot();
      expect(agents).toHaveLength(1);
      expect(agents[0]!.id).toBe("a1");
    });

    it("actualiza un agente existente sin duplicarlo", () => {
      board.registerAgent(
        makeAgent({
          id: "a1",
          stats: { strength: 3, dexterity: 3, energy: 100 },
        }),
      );
      board.registerAgent(
        makeAgent({
          id: "a1",
          stats: { strength: 8, dexterity: 8, energy: 50 },
        }),
      );

      const { agents } = board.getSnapshot();
      expect(agents).toHaveLength(1);
      expect(agents[0]!.stats.strength).toBe(8);
    });
  });

  describe("updateInventory", () => {
    it("acumula cantidades del mismo item", () => {
      board.updateInventory("tomate", 3);
      board.updateInventory("tomate", 2);

      const { inventory } = board.getSnapshot();
      expect(inventory["tomate"]).toBe(5);
    });

    it("items distintos se guardan por separado", () => {
      board.updateInventory("tomate", 3);
      board.updateInventory("lechuga", 1);

      const { inventory } = board.getSnapshot();
      expect(inventory["tomate"]).toBe(3);
      expect(inventory["lechuga"]).toBe(1);
    });
  });
});

describe("TaskQueue", () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  describe("enqueue / getAll", () => {
    it("encola una task válida", () => {
      queue.enqueue(makeTask());
      expect(queue.getAll()).toHaveLength(1);
    });

    it("rechaza una task con schema inválido", () => {
      expect(() => {
        queue.enqueue({ id: "no-es-uuid" } as any);
      }).toThrow();
    });
  });

  describe("take / release", () => {
    it("take marca la task como taken y la asigna al agente", () => {
      const task = makeTask();
      queue.enqueue(task);

      const taken = queue.take(task.id, "agent-1");

      expect(taken).toBeDefined();
      expect(taken!.task.status).toBe("taken");
      expect(taken!.task.takenBy).toBe("agent-1");
    });

    it("take sobre una task inexistente devuelve undefined", () => {
      const result = queue.take("uuid-falso", "agent-1");
      expect(result).toBeUndefined();
    });

    it("release devuelve la task a pending", () => {
      const task = makeTask();
      queue.enqueue(task);
      queue.take(task.id, "agent-1");

      const released = queue.release(task.id, "agent-1");

      expect(released).toBe(true);
      expect(queue.pending()).toHaveLength(1);
    });

    it("release falla si el agente no es el dueño", () => {
      const task = makeTask();
      queue.enqueue(task);
      queue.take(task.id, "agent-1");

      const released = queue.release(task.id, "agent-intruso");
      expect(released).toBe(false);
    });
  });

  describe("getByPriority", () => {
    it("ordena de mayor a menor prioridad", () => {
      const q = queue as any;
      queue.enqueue(makeTask());
      queue.enqueue(makeTask());

      q.tasks[0].priority = 5;
      q.tasks[1].priority = 10;

      const sorted = queue.getByPriority();

      expect(sorted[0]!.priority).toBeGreaterThan(sorted[1]!.priority);
    });
  });
});
