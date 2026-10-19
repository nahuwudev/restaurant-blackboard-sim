import { describe, it, expect } from "bun:test";
import {
  totalTicks,
  avgWaitByKind,
  finalEnergies,
  alignmentRate,
  conflictCount,
  starvedTaskIds,
} from "../../src/metrics/metrics";
import { TASK_KINDS } from "../../src/tasks/task";
import {
  createCompletedEvent,
  createCreatedEvent,
  createTakenEvent,
  createTickEndEvent,
} from "../helpers/helper";
import { EVENT_TYPES } from "../../src/metrics/events";

describe("Metrics", () => {
  const simulationEvents = [
    createCreatedEvent({ taskId: "t1", kind: TASK_KINDS.COOK, tick: 0 }),
    createCreatedEvent({ taskId: "t2", kind: TASK_KINDS.COOK, tick: 0 }),
    createCreatedEvent({ taskId: "t3", kind: TASK_KINDS.WASH, tick: 0 }),

    createTakenEvent({ taskId: "t3", kind: TASK_KINDS.WASH, tick: 1 }),
    createTakenEvent({ taskId: "t1", kind: TASK_KINDS.COOK, tick: 2 }),

    createCompletedEvent({ taskId: "t3", tick: 4 }),

    createTakenEvent({ taskId: "t2", kind: TASK_KINDS.COOK, tick: 6 }),

    createCompletedEvent({ taskId: "t1", tick: 7 }),
    createCompletedEvent({ taskId: "t2", tick: 9 }),
  ];

  describe("conflictCount", () => {
    it("devuelve 0 si no hay ningún evento de conflicto", () => {
      const events = [
        createCreatedEvent({ taskId: "t1", kind: TASK_KINDS.COOK, tick: 0 }),
        createTickEndEvent({ tick: 0 }),
      ];
      expect(conflictCount(events)).toBe(0);
    });

    it("cuenta correctamente los eventos de conflicto ignorando los demás", () => {
      const events = [
        createCreatedEvent({ taskId: "t1", kind: TASK_KINDS.COOK, tick: 0 }),
        { type: EVENT_TYPES.CONFLICT, tick: 0, taskId: "t1" },
        { type: EVENT_TYPES.CONFLICT, tick: 1, taskId: "t2" },
        createTickEndEvent({ tick: 1 }),
      ];
      expect(conflictCount(events)).toBe(2);
    });
  });

  describe("starvedTaskIds", () => {
    it("no cuenta tareas que esperan exactamente maxWait (caso límite con >)", () => {
      const events = [
        createCreatedEvent({ taskId: "t1", kind: TASK_KINDS.COOK, tick: 0 }),
        createTakenEvent({ taskId: "t1", kind: TASK_KINDS.COOK, tick: 5 }), // Espera exacta de 5 (maxWait = 5)
        createTickEndEvent({ tick: 5 }),
      ];

      expect(starvedTaskIds(events, 5)).toEqual([]);
    });

    it("no cuenta tareas nunca tomadas pero recientes que no superan el maxWait", () => {
      const events = [
        createCreatedEvent({
          taskId: "recent",
          kind: TASK_KINDS.COOK,
          tick: 8,
        }), // Creada en 8, maxTick 10 -> espera 2 (<= 5)
        createTickEndEvent({ tick: 10 }),
      ];

      expect(starvedTaskIds(events, 5)).toEqual([]);
    });

    it("detecta correctamente tareas tomadas tarde y tareas nunca tomadas y antiguas", () => {
      const events = [
        createCreatedEvent({ taskId: "tarde", kind: TASK_KINDS.COOK, tick: 0 }),
        createTakenEvent({ taskId: "tarde", kind: TASK_KINDS.COOK, tick: 6 }), 

        createCreatedEvent({
          taskId: "antigua_nunca",
          kind: TASK_KINDS.COOK,
          tick: 2,
        }), // Creada en 2, maxTick 10 == espera 8 (> 5) == starves
        createTickEndEvent({ tick: 10 }),
      ];

      expect(starvedTaskIds(events, 5)).toEqual(["tarde", "antigua_nunca"]);
    });
  });

  describe("alignmentRate", () => {
    it("calcula la fracción correcta de tareas alineadas (ej: 3 de 4 da 0.75)", () => {
      const events = [
        createTakenEvent({ aptitude: 0.9, agentBest: 0.9 }), // Alineado
        createTakenEvent({ aptitude: 0.9, agentBest: 0.9 }), // Alineado
        createTakenEvent({ aptitude: 0.9, agentBest: 0.9 }), // Alineado
        createTakenEvent({ aptitude: 0.2, agentBest: 0.9 }), // No alineado
      ];

      expect(alignmentRate(events)).toBe(0.75);
    });

    it("calcula la fracción correcta ignorando eventos de otros tipos (protege el denominador)", () => {
      const events = [
        createCreatedEvent({ taskId: "t1", kind: TASK_KINDS.COOK, tick: 0 }),
        createTakenEvent({ aptitude: 0.9, agentBest: 0.9 }), // Alineado (1)
        createCompletedEvent({ taskId: "t1", tick: 1 }),
        createTakenEvent({ aptitude: 0.2, agentBest: 0.9 }), // No alineado (2)
        createTickEndEvent({ tick: 2 }),
      ];

      expect(alignmentRate(events)).toBe(0.5);
    });

    it("considera un empate exacto como tarea alineada", () => {
      const events = [createTakenEvent({ aptitude: 0.5, agentBest: 0.5 })];

      expect(alignmentRate(events)).toBe(1);
    });

    it("devuelve undefined si no hay ningún evento task_taken", () => {
      const events = [createCompletedEvent({ taskId: "t1", tick: 1 })];

      expect(alignmentRate(events)).toBeUndefined();
    });
  });

  describe("totalTicks", () => {
    it("ignora los eventos de fin de tick al calcular el total", () => {
      const events = [...simulationEvents, createTickEndEvent({ tick: 99 })];

      const result = totalTicks(events);
      expect(result).toBe(9);
    });

    it("debe calcular el tick de la última tarea completada (tick 9)", () => {
      const result = totalTicks(simulationEvents);
      expect(result).toBe(9);
    });

    it("devuelve 0 si no hay tareas completadas", () => {
      const events = [
        createCreatedEvent({ taskId: "t1", kind: TASK_KINDS.COOK, tick: 0 }),
        createCreatedEvent({ taskId: "t2", kind: TASK_KINDS.COOK, tick: 0 }),
        createCreatedEvent({ taskId: "t3", kind: TASK_KINDS.WASH, tick: 0 }),

        createTakenEvent({ taskId: "t3", kind: TASK_KINDS.WASH, tick: 1 }),
        createTakenEvent({ taskId: "t1", kind: TASK_KINDS.COOK, tick: 2 }),
        createTakenEvent({ taskId: "t2", kind: TASK_KINDS.COOK, tick: 6 }),
      ];

      const result = totalTicks(events);
      expect(result).toBe(0);
    });
  });

  describe("avgWaitByKind", () => {
    it("debe calcular los promedios de espera correctos para cook y wash", () => {
      const result = avgWaitByKind(simulationEvents);

      expect(result.get(TASK_KINDS.COOK)).toBe(4);
      expect(result.get(TASK_KINDS.WASH)).toBe(1);
    });

    it("calcula la espera promedio cuando las tareas nacen en ticks mayores a 0", () => {
      const serveEvents = [
        createCreatedEvent({ taskId: "s1", kind: TASK_KINDS.SERVE, tick: 0 }),
        createCreatedEvent({ taskId: "s2", kind: TASK_KINDS.SERVE, tick: 2 }),
        createCreatedEvent({ taskId: "s3", kind: TASK_KINDS.SERVE, tick: 5 }),
        createTakenEvent({ taskId: "s1", kind: TASK_KINDS.SERVE, tick: 3 }),
        createTakenEvent({ taskId: "s2", kind: TASK_KINDS.SERVE, tick: 4 }),
        createTakenEvent({ taskId: "s3", kind: TASK_KINDS.SERVE, tick: 10 }),
      ];

      const result = avgWaitByKind(serveEvents);
      expect(result.get(TASK_KINDS.SERVE)).toBeCloseTo(3.33, 2);
    });

    it("ignora tareas tomadas que no tienen evento de creación", () => {
      const events = [
        ...simulationEvents,
        createTakenEvent({
          taskId: "huerfana",
          kind: TASK_KINDS.PREP,
          tick: 3,
        }),
      ];

      const result = avgWaitByKind(events);
      expect(result.get(TASK_KINDS.COOK)).toBe(4);
      expect(result.get(TASK_KINDS.WASH)).toBe(1);
      expect(result.get(TASK_KINDS.PREP)).toBe(undefined);
    });
  });

  describe("finalEnergies", () => {
    it("devuelve las energías del tick_end con el tick más alto", () => {
      const events = [
        createTickEndEvent({ tick: 1, energies: { a1: 80 } }),
        createTickEndEvent({ tick: 2, energies: { a1: 60 } }),
      ];
      expect(finalEnergies(events)).toEqual({ a1: 60 });
    });

    it("funciona correctamente incluso si los eventos están desordenados en el array", () => {
      const events = [
        createTickEndEvent({ tick: 2, energies: { a1: 60 } }),
        createTickEndEvent({ tick: 1, energies: { a1: 80 } }),
      ];
      expect(finalEnergies(events)).toEqual({ a1: 60 });
    });

    it("ignora eventos de otros tipos mezclados en el array", () => {
      const events = [
        {
          type: EVENT_TYPES.TASK_COMPLETED,
          tick: 1,
          taskId: "t1",
          agentId: "a1",
        },
        createTickEndEvent({ tick: 3, energies: { a1: 50 } }),
      ];
      expect(finalEnergies(events)).toEqual({ a1: 50 });
    });

    it("devuelve undefined si no hay ningún tick_end", () => {
      const events = [
        {
          type: EVENT_TYPES.TASK_COMPLETED,
          tick: 1,
          taskId: "t1",
          agentId: "a1",
        },
      ];
      expect(finalEnergies(events)).toBeUndefined();
    });
  });
});
