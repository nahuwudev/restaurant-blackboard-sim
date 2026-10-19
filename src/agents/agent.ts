import { TASK_KINDS, type Task, type TaskKind } from "../tasks/task";
import {
  AgentStatsSchema,
  type AgentStats,
  type agentRole,
  type AgentTool,
  AGENT_ROLE,
  AGENT_TOOL,
} from "./agent.types";

export class Agent {
  id: string;
  name: string;
  role: agentRole;
  tool?: AgentTool;
  stats: AgentStats;
  ticksRemaining: number = 0;
  currentTaskId?: string;
  taskTakenAtTick?: number;
  completedTasks: string[] = [];

  // Estados de penalizaciones e incentivos
  idleTicks: number = 0;
  forcedRestTicks: number = 0;
  stunTicks: number = 0;
  consecutiveTasks: number = 0;

  constructor(stats: AgentStats, id?: string) {
    this.id = id ?? Math.random().toString(36).substring(2, 10);
    this.name = "Agente " + this.id;
    this.stats = AgentStatsSchema.parse(stats);
    this.role = this.stats.preferredRole ?? this.deduceNaturalRole();
    this.tool = this.stats.tool;
  }

  getRole(): agentRole {
    return this.role;
  }

  equipTool(tool?: AgentTool): void {
    this.tool = tool;
  }

  equipDefaultTool(): void {
    switch (this.role) {
      case AGENT_ROLE.COOK:
        this.tool = AGENT_TOOL.CHEF_KNIFE;
        break;
      case AGENT_ROLE.DISHWASHER:
        this.tool = AGENT_TOOL.BROOM;
        break;
      case AGENT_ROLE.WAITER:
        this.tool = AGENT_TOOL.TRAY;
        break;
    }
  }

  private toolModifier(kind: TaskKind): number {
    if (!this.tool) return 1.0;

    const isAffinitive =
      (this.tool === AGENT_TOOL.CHEF_KNIFE && (kind === TASK_KINDS.COOK || kind === TASK_KINDS.PREP)) ||
      (this.tool === AGENT_TOOL.BROOM && kind === TASK_KINDS.WASH) ||
      (this.tool === AGENT_TOOL.TRAY && kind === TASK_KINDS.SERVE);

    return isAffinitive ? 0.8 : 1.2; // -20% si es afín, +20% penalización si no es afín
  }

  isAvailable(): boolean {
    return (
      this.currentTaskId === undefined &&
      this.forcedRestTicks === 0 &&
      this.stunTicks === 0
    );
  }

  private deduceNaturalRole(): agentRole {
    if (this.stats.strength > this.stats.dexterity) {
      return AGENT_ROLE.COOK;
    }
    if (this.stats.dexterity > this.stats.strength) {
      return AGENT_ROLE.DISHWASHER;
    }
    return AGENT_ROLE.COOK;
  }

aptitudeForKind(kind: TaskKind): number {
    switch (kind) {
      case TASK_KINDS.COOK:
        return this.stats.strength / 10;

      case TASK_KINDS.WASH:
        return this.stats.dexterity / 10;

      case TASK_KINDS.PREP:
        return (this.stats.strength + this.stats.dexterity) / 20;

      case TASK_KINDS.SERVE:
        return this.stats.dexterity / 10;

      default: {
        const _exhaustiveCheck: never = kind;
        return _exhaustiveCheck;
      }
    }
  }

  aptitudeFor(task: Task) {
    return this.aptitudeForKind(task.kind);
  }

  bestAptitude(): number {
    const kinds = Object.values(TASK_KINDS);
    return Math.max(...kinds.map((kind) => this.aptitudeForKind(kind)));
  }

  consumeEnergy(task: Task): void {
    const cost = task.difficulty * (1 - this.aptitudeFor(task) * 0.5);
    this.stats.energy = Math.max(0, this.stats.energy - cost);
    if (this.stats.energy === 0) {
      this.forcedRestTicks = 10; // Penalización: 10 ticks de recuperación forzada
    }
  }

  recoverEnergy(): void {
    this.idleTicks++;
    this.consecutiveTasks = 0; // Se interrumpe la racha consecutiva al descansar
    if (this.stunTicks > 0) {
      this.stunTicks--;
    }
    if (this.forcedRestTicks > 0) {
      this.forcedRestTicks--;
    }

    // Penalización por ineficiencia: >5 ticks sin tarea recupera a menor tasa (+2 en vez de +5)
    const recoveryRate = this.idleTicks > 5 ? 2 : 5;
    this.stats.energy = Math.min(100, this.stats.energy + recoveryRate);
  }

  onTaskCompleted(task: Task): void {
    this.completedTasks.push(task.id);
    this.consecutiveTasks++;

    // Incentivo: agente que completa su tarea más afín recupera 5 puntos de energía extra
    if (this.aptitudeFor(task) >= this.bestAptitude() - 0.0001) {
      this.stats.energy = Math.min(100, this.stats.energy + 5);
    }
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
    this.idleTicks = 0;
  }

  efficiency(): number {
    return 0.5 + 0.5 * (this.stats.energy / 100); // 1.0 descansado, 0.5 agotado
  }

  ticksToComplete(task: Task): number {
    const base = Math.max(
      1,
      Math.ceil(
        task.difficulty / (this.aptitudeFor(task) * 10 * this.efficiency()),
      ),
    );

    // Modificador de herramienta personal
    let modified = base * this.toolModifier(task.kind);

    // Incentivo de racha: cadena de tareas completadas sin interrupciones (+10% velocidad)
    if (this.consecutiveTasks > 0) {
      modified *= 0.9;
    }

    return Math.max(1, Math.ceil(modified));
  }
}

