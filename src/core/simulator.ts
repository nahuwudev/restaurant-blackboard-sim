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
  private tasksCreatedLogged = false;

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

    if (this.logger && !this.tasksCreatedLogged) {
      for (const item of queue.getAll()) {
        this.logger.emit({
          type: EVENT_TYPES.TASK_CREATED,
          tick: item.createdAt ?? 0,
          taskId: item.task.id,
          kind: item.task.kind,
        });
      }
      this.tasksCreatedLogged = true;
    }

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
            taskId,
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

      for (const { agent, task } of assigned) {
        agent.consumeEnergy(task);

        const teamBest = Math.max(
          ...this.agents.map((ag) => ag.aptitudeFor(task)),
        );

        this.logger?.emit({
          type: EVENT_TYPES.TASK_TAKEN,
          tick: this.blackboard.getTick(),
          taskId: task.id,
          kind: task.kind,
          agentId: agent.id,
          aptitude: agent.aptitudeFor(task),
          agentBest: agent.bestAptitude(),
          teamBest,
        });
      }

      const energies: Record<string, number> = {};
      for (const ag of this.agents) {
        energies[ag.id] = ag.stats.energy;
      }
      this.logger?.emit({
        type: EVENT_TYPES.TICK_END,
        tick: this.blackboard.getTick(),
        energies,
      });
      this.blackboard.tick();
    }
  }
}
