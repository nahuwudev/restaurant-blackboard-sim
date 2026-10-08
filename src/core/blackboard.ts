import type { Task } from "../tasks/task";
import type { TaskQueue } from "../tasks/task-queue";
import { deepFreeze } from "./helpers/deep-freeze";
import type { AgentSnapshot, BlackboardState } from "./types/blackboard.types";

export class Blackboard {
  private currentTick = 0;
  private inventory: Record<string, number> = {};
  private agents: AgentSnapshot[] = [];
  private taskQueue: TaskQueue;

  constructor(queue: TaskQueue) {
    this.taskQueue = queue;
  }

  tick(): void {
    this.currentTick++;
    this.taskQueue.ageTasks(this.currentTick);
  }

  registerAgent(agent: AgentSnapshot): void {
    const index = this.agents.findIndex((a) => a.id === agent.id);
    const snapshotCopy = { ...agent };

    if (index >= 0) {
      this.agents[index] = snapshotCopy;
    } else {
      this.agents.push(snapshotCopy);
    }
  }

  updateInventory(item: string, quantity: number): void {
    this.inventory[item] = (this.inventory[item] || 0) + quantity;
  }

  private computeWeights(): Record<Task["kind"], number> {
    const dirtyDishes = this.inventory["dirty_dishes"] ?? 0;
    const pendingCount = this.taskQueue.pending().length;

    const weights = { cook: 1, wash: 1, prep: 1, serve: 1 };

    if (dirtyDishes > 10) {
      weights.wash *= 2.0;
      weights.cook *= 0.6;
    }

    if (pendingCount > 30) {
      weights.cook *= 1.8;
    }

    return weights;
  }

  getSnapshot(): BlackboardState {
    const tasks = this.taskQueue.getAll();
    const weights = this.computeWeights();

    const rawState: BlackboardState = {
      tick: this.currentTick,
      tasks: structuredClone(tasks),
      agents: structuredClone(this.agents),
      inventory: structuredClone(this.inventory),
      weights,
      metrics: {
        completedTasksCount: tasks.filter((t) => t.task.status === "done")
          .length,
        failedTasksCount: 0,
      },
    };

    return deepFreeze(rawState);
  }

  getTick(): number {
    return this.currentTick;
  }

  getQueue(): TaskQueue {
    return this.taskQueue
  }
}
