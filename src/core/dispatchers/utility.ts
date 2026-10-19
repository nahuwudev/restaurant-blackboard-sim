import type { Agent } from "../../agents/agent";
import type { Orchestrator } from "../orchestrator";
import type { Task } from "../../tasks/task";
import type { Dispatcher } from "./dispatcher";
import type { Blackboard } from "../blackboard";
import { scoreAction } from "../../utility/evaluator";

export class UtilityDispatcher implements Dispatcher {
  constructor(public orchestrator: Orchestrator) {}

  dispatch(
    freeAgents: readonly Agent[],
    pendingTasks: readonly Task[],
    blackboard: Blackboard,
    currentTick: number,
  ): Array<{ agent: Agent; task: Task }> {
    const queue = blackboard.getQueue();
    const assigned: Array<{ agent: Agent; task: Task }> = [];
    let remainingAgents = [...freeAgents];

    while (remainingAgents.length > 0 && queue.pending().length > 0) {
      const snapshot = blackboard.getSnapshot();
      const pendingItems = queue.pending();
      let bidPlaced = false;

      for (const ag of remainingAgents) {
        let best: { id: string; score: number } | undefined;
        for (const item of pendingItems) {
          const score = scoreAction(ag, item, snapshot);
          if (!best || score > best.score) {
            best = { id: item.task.id, score };
          }
        }
        if (best) {
          this.orchestrator.bid(ag, best.id, best.score);
          bidPlaced = true;
        }
      }

      if (!bidPlaced) break;
      const roundAssigned = this.orchestrator.resolve(queue, currentTick);
      if (roundAssigned.length === 0) break;

      assigned.push(...roundAssigned);
      const assignedIds = new Set(roundAssigned.map((r) => r.agent.id));
      remainingAgents = remainingAgents.filter((a) => !assignedIds.has(a.id));
    }

    return assigned;
  }
}