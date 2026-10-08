import type { TaskKind } from "../tasks/task";
import { EVENT_TYPES } from "./events";
import type { SimulationEvent } from "./types";

export function totalTicks(events: SimulationEvent[]) {
  const completedEvents = events.filter(
    (e) => e.type === EVENT_TYPES.TASK_COMPLETED,
  );

  const maxTick = completedEvents.reduce((max, e) => Math.max(max, e.tick), 0);

  return maxTick;
}

export function avgWaitByKind(events: SimulationEvent[]) {
  const creationTicks = new Map<string, number>();

  for (const ct of events) {
    if (ct.type === EVENT_TYPES.TASK_CREATED) {
      creationTicks.set(ct.taskId, ct.tick);
    }
  }

  const statsByKind = new Map<TaskKind, { totalWait: number; count: number }>();

  for (const e of events) {
    if (e.type === EVENT_TYPES.TASK_TAKEN) {
      const createdTick = creationTicks.get(e.taskId);
      if (createdTick !== undefined) {
        const waitTime = e.tick - createdTick;

        const currentStats = statsByKind.get(e.kind) ?? {
          totalWait: 0,
          count: 0,
        };

        statsByKind.set(e.kind, {
          totalWait: currentStats.totalWait + waitTime,
          count: currentStats.count + 1,
        });
      }
    }
  }

  const result = new Map<TaskKind, number>();

  for (const [kind, data] of statsByKind) {
    const promedio = data.totalWait / data.count;
    result.set(kind, promedio);
  }

  return result;
}
