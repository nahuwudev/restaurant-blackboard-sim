import type { Agent } from "../agents/agent";
import type { Task } from "../tasks/task";
import type { TaskQueue } from "../tasks/task-queue";

export class Orchestrator {
  private bids: Map<string, { agent: Agent; score: number }> = new Map();

  bid(agent: Agent, taskId: string, score: number): boolean {
    const currentBid = this.bids.get(taskId);

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
    const assigned: { agent: Agent; task: Task }[] = [];
    for (const [taskId, { agent }] of this.bids) {
      const taken = queue.take(taskId, agent.id);
      if (taken) {
        agent.assignTask(taken.task, currentTick);
        assigned.push({ agent, task: taken.task });
      }
    }
    this.bids.clear();
    return assigned;
  }
}
