import type { Agent } from "../agents/agent";
import type { EventLogger } from "../metrics/event-log";
import { EVENT_TYPES } from "../metrics/events";
import { scoreAction } from "../utility/evaluator";
import type { Blackboard } from "./blackboard";
import type { Orchestrator } from "./orchestrator";

export class Simulator {
  blackboard: Blackboard;
  orchestrator: Orchestrator;
  agents: Agent[];
  logger?: EventLogger;

  constructor(
    agent: Agent[],
    orchestrator: Orchestrator,
    blackboard: Blackboard,
    logger?: EventLogger,
  ) {
    this.blackboard = blackboard;
    this.orchestrator = orchestrator;
    this.agents = agent;
    this.logger = logger;
  }

  run(ticks: number) {
    const queue = this.blackboard.getQueue();

    for (let i = 0; i < ticks; i++) {
      for (const ag of this.agents) {
        const taskId = ag.currentTaskId;
        if (taskId === undefined) {
          ag.recoverEnergy();
          continue;
        }
        ag.work();
        if (ag.currentTaskId === undefined) {
          queue.complete(taskId);
          this.logger?.emit({
            type: EVENT_TYPES.TASK_COMPLETED,
            tick: this.blackboard.getTick(),
            taskId: taskId,
            agentId: ag.id,
          });
        }
      }

      const snapshot = this.blackboard.getSnapshot();
      const pending = queue.pending();
      for (const ag of this.agents) {
        if (ag.currentTaskId !== undefined) continue;
        let best: { id: string; score: number } | undefined;
        for (const t of pending) {
          const score = scoreAction(ag, t, snapshot);
          if (!best || score > best.score) best = { id: t.task.id, score };
        }
        if (best) this.orchestrator.bid(ag, best.id, best.score);
      }

      const assigned = this.orchestrator.resolve(
        queue,
        this.blackboard.getTick(),
      );
      for (const { agent, task } of assigned) agent.consumeEnergy(task);

      this.blackboard.tick();
    }
  }
}
