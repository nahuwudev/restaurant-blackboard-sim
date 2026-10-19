import { TaskSchema, type QueueTask, type Task } from "./task";

export class TaskQueue {
  private tasks: QueueTask[] = [];

  enqueue(task: Task, tick: number = 0) {
    const validatedTask = TaskSchema.parse(task);
    this.tasks.push({ task: validatedTask, createdAt: tick, priority: 1 });
  }

  complete(taskId: string): boolean {
    const task = this.tasks.find((t) => t.task.id === taskId);
    if (!task) {
      return false;
    }
    task.task.status = "done";
    return true;
  }

  pending(): QueueTask[] {
    return this.tasks.filter((t) => t.task.status === "pending");
  }

  peek(): QueueTask | undefined {
    return this.getByPriority()[0];
  }

  take(taskId: string, agentId: string): QueueTask | undefined {
    const alreadyTaken = this.tasks.find(
      (t) => t.task.takenBy === agentId && t.task.status === "taken",
    );
    if (alreadyTaken) return undefined;

    const item = this.tasks.find(
      (t) => t.task.id === taskId && t.task.status === "pending",
    );
    if (item) {
      item.task.status = "taken";
      item.task.takenBy = agentId;
      return item;
    }
    return undefined;
  }

  release(taskId: string, agentId: string): boolean {
    const item = this.tasks.find(
      (t) =>
        t.task.id === taskId &&
        t.task.status === "taken" &&
        t.task.takenBy === agentId,
    );

    if (!item) {
      // false = detectar si un agente intentó liberar una tarea que no le pertenecía o que ya cambió de estado
      return false;
    }

    item.task.status = "pending";
    item.task.takenBy = undefined;
    item.priority = Math.max(1, item.priority - 2); // Penalización: prioridad reducida

    return true;
  }

  ageTasks(currentTick: number, delta: number = 1): void {
    for (const item of this.pending()) {
      item.priority = 1 + Math.floor((currentTick - item.createdAt) * delta);
    }
  }

  getByPriority(): QueueTask[] {
    return [...this.pending()].sort((a, b) => b.priority - a.priority);
  }

  getAll(): QueueTask[] {
    return [...this.tasks];
  }
}
