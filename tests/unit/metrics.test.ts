import { describe, it, expect } from "bun:test";
import { totalTicks, avgWaitByKind } from "../../src/metrics/metrics";

import { TASK_KINDS } from "../../src/tasks/task";
import {
  createCompletedEvent,
  createCreatedEvent,
  createTakenEvent,
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
    it("debe calcular el tick de la última tarea completada (tick 9)", () => {
      const result = totalTicks(simulationEvents);
      expect(result).toBe(9);
    });
  });

  describe("avgWaitByKind", () => {
    it("debe calcular los promedios de espera correctos para cook y wash", () => {
      const result = avgWaitByKind(simulationEvents);

      expect(result.get(TASK_KINDS.COOK)).toBe(4);
      expect(result.get(TASK_KINDS.WASH)).toBe(1);
    });
  });
});
