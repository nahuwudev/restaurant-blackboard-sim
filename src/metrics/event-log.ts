import { EVENT_TYPES } from "./events";
import type { SimulationEvent } from "./types";

export class EventLogger {
  events: SimulationEvent[] = [];

  emit(e: SimulationEvent) {
    this.events.push(e);

    switch (e.type) {
      case EVENT_TYPES.TASK_CREATED:
        break;

      case EVENT_TYPES.TASK_TAKEN:

        break;

      case EVENT_TYPES.TASK_COMPLETED:
        break;

      case EVENT_TYPES.CONFLICT:
        break;

      case EVENT_TYPES.TICK_END:
        break;

      default: {
        const _exhaustiveCheck: never = e;
        return _exhaustiveCheck;
      }
    }
  }

  getLogs(): readonly SimulationEvent[] {
    return this.events;
  }
}
