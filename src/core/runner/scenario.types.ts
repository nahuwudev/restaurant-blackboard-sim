import type { Agent } from "../../agents/agent";
import type { QueueTask, Task } from "../../tasks/task";
import type { SimulationEvent } from "../../metrics/types";

export interface ScenarioConfig {
  name: string;
  agents: Agent[];
  tasks: Task[];
  maxTicks?: number;
}

export interface ScenarioResult {
  scenarioName: string;
  totalTicks: number;
  completedTasks: number;
  pendingTasks: number;
  tasks?: QueueTask[];
  events: SimulationEvent[];
  metrics: {
    alignmentRate: number;
    avgWaitByKind: Record<string, number>;
    conflictCount: number;
    finalEnergies: Record<string, number>;
    starvedTaskIds: string[];
    efficiencyMargin?: number;
  };
}