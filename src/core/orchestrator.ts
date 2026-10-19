import type { Agent } from "../agents/agent";
import type { EventLogger } from "../metrics/event-log";
import { EVENT_TYPES } from "../metrics/events";
import type { Task } from "../tasks/task";
import type { TaskQueue } from "../tasks/task-queue";

export class Orchestrator {
  private bids: Map<string, { agent: Agent; score: number }> = new Map();
  private allBiddersByTask: Map<string, Agent[]> = new Map();
  private disputedTasks = new Set<string>();
  logger?: EventLogger;

  constructor(logger?: EventLogger) {
    this.logger = logger;
  }

  bid(agent: Agent, taskId: string, score: number): boolean {
    const currentBid = this.bids.get(taskId);
    const bidders = this.allBiddersByTask.get(taskId) ?? [];
    if (!bidders.some((b) => b.id === agent.id)) {
      bidders.push(agent);
      this.allBiddersByTask.set(taskId, bidders);
    }

    if (currentBid && currentBid.agent.id !== agent.id) {
      this.disputedTasks.add(taskId);
    }

    if (
      !currentBid ||
      score > currentBid.score ||
      (score === currentBid.score && agent.id < currentBid.agent.id)
    ) {
      this.bids.set(taskId, { agent, score });
      return true;
    }

    return false;
  }

  resolve(
    queue: TaskQueue,
    currentTick: number,
  ): { agent: Agent; task: Task }[] {
    if (this.logger) {
      for (const taskId of this.disputedTasks) {
        this.logger.emit({
          type: EVENT_TYPES.CONFLICT,
          tick: currentTick,
          taskId,
        });
      }
    }

    // Penalización: dos agentes en conflicto -> el perdedor pierde 1 tick de procesamiento
    for (const taskId of this.disputedTasks) {
      const winner = this.bids.get(taskId)?.agent;
      const bidders = this.allBiddersByTask.get(taskId) ?? [];
      for (const bidder of bidders) {
        if (bidder.id !== winner?.id) {
          bidder.stunTicks = 1;
        }
      }
    }

    const assigned: { agent: Agent; task: Task }[] = [];
    for (const [taskId, { agent }] of this.bids) {
      const taken = queue.take(taskId, agent.id);
      if (taken) {
        agent.assignTask(taken.task, currentTick);
        assigned.push({ agent, task: taken.task });
      }
    }

    this.bids.clear();
    this.disputedTasks.clear();
    this.allBiddersByTask.clear();
    return assigned;
  }
}

