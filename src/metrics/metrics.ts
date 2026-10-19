import type { TaskKind } from "../tasks/task";
import { EVENT_TYPES } from "./events";
import type { SimulationEvent, TaskTakenEvent, TickEndEvent } from "./types";

export function finalEnergies(
  events: readonly SimulationEvent[],
): Record<string, number> | undefined {
  const tickEndEvents = events.filter(
    (e): e is TickEndEvent => e.type === EVENT_TYPES.TICK_END,
  );

  if (tickEndEvents.length === 0) return undefined;

  const latest = tickEndEvents.reduce((max, current) =>
    current.tick > max.tick ? current : max,
  );

  return latest.energies;
}

export function conflictCount(events: readonly SimulationEvent[]): number {
  return events.filter((e) => e.type === EVENT_TYPES.CONFLICT).length;
}

export function starvedTaskIds(
  events: readonly SimulationEvent[],
  maxWait: number,
): string[] {
  const createdMap = new Map<string, number>();
  const takenMap = new Map<string, number>();
  let maxTick = 0;

  for (const e of events) {
    if ("tick" in e && e.tick > maxTick) {
      maxTick = e.tick;
    }
    if (e.type === EVENT_TYPES.TASK_CREATED) {
      createdMap.set(e.taskId, e.tick);
    } else if (e.type === EVENT_TYPES.TASK_TAKEN) {
      takenMap.set(e.taskId, e.tick);
    }
  }

  const starvedIds: string[] = [];

  for (const [taskId, createdTick] of createdMap) {
    const takenTick = takenMap.get(taskId);

    if (takenTick !== undefined) {
      if (takenTick - createdTick > maxWait) {
        starvedIds.push(taskId);
      }
    } else {
      if (maxTick - createdTick > maxWait) {
        starvedIds.push(taskId);
      }
    }
  }

  return starvedIds;
}

export function alignmentRate(
  events: readonly SimulationEvent[],
): number | undefined {
  const takenEvents = events.filter(
    (e): e is TaskTakenEvent => e.type === EVENT_TYPES.TASK_TAKEN,
  );

  if (takenEvents.length === 0) {
    return undefined;
  }

  const alignedCount = takenEvents.filter(
    (e) => e.aptitude >= e.agentBest - 0.0001,
  ).length;

  return alignedCount / takenEvents.length;
}

export function totalTicks(events: readonly SimulationEvent[]) {
  const completedEvents = events.filter(
    (e) => e.type === EVENT_TYPES.TASK_COMPLETED,
  );

  const maxTick = completedEvents.reduce((max, e) => Math.max(max, e.tick), 0);

  return maxTick;
}

export function avgWaitByKind(events: readonly SimulationEvent[]) {
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
