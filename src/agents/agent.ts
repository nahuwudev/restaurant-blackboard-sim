import { TASK_KINDS, type Task } from "../tasks/task";
import { AgentStatsSchema, type AgentStats } from "./agent.types";

export class Agent {
  id: string;
  name: string;
  stats: AgentStats;
  ticksRemaining: number = 0;
  currentTaskId?: string;
  taskTakenAtTick?: number;
  completedTasks: string[] = [];

  constructor(stats: AgentStats, id?: string) {
    this.id = id ?? Math.random().toString(36).substring(2, 10);
    this.name = "Agente " + this.id;
    this.stats = AgentStatsSchema.parse(stats);
  }

  aptitudeFor(task: Task) {
    switch (task.kind) {
      case TASK_KINDS.COOK:
        return this.stats.strength / 10;

      case TASK_KINDS.WASH:
        return this.stats.dexterity / 10;

      case TASK_KINDS.PREP:
        return (this.stats.strength + this.stats.dexterity) / 20;

      case TASK_KINDS.SERVE:
        return this.stats.dexterity / 10;

      default: {
        // Mantiene el check Exhaustivo de TypeScript impecable 👌
        const _exhaustiveCheck: never = task.kind;
        return _exhaustiveCheck;
      }
    }
  }

  consumeEnergy(task: Task): void {
    const cost = task.difficulty * (1 - this.aptitudeFor(task) * 0.5);
    this.stats.energy = Math.max(0, this.stats.energy - cost);
  }

  recoverEnergy(): void {
    this.stats.energy = Math.min(100, this.stats.energy + 5);
  }

  work(): boolean {
    if (this.ticksRemaining === 0 || this.currentTaskId === undefined) {
      return false;
    }
    this.ticksRemaining--;
    if (this.ticksRemaining === 0) {
      this.currentTaskId = undefined;
    }
    return true;
  }

  assignTask(task: Task, currentTick: number): void {
    this.currentTaskId = task.id;
    this.ticksRemaining = this.ticksToComplete(task);
    this.taskTakenAtTick = currentTick;
  }

  efficiency(): number {
    return 0.5 + 0.5 * (this.stats.energy / 100); // 1.0 descansado, 0.5 agotado
  }

  ticksToComplete(task: Task): number {
    return Math.max(
      1,
      Math.ceil(
        task.difficulty / (this.aptitudeFor(task) * 10 * this.efficiency()),
      ),
    );
  }
}
