import { describe, it, expect } from "bun:test";
import { totalTicks, avgWaitByKind } from "../../src/metrics/metrics";

import { TASK_KINDS } from "../../src/tasks/task";
import {
  createCompletedEvent,
  createCreatedEvent,
  createTakenEvent,
  createTickEndEvent,
} from "../helpers/helper";

describe("Metrics calculations", () => {
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
});
