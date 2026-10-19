import type { Agent } from "../../agents/agent";
import type { Task } from "../../tasks/task";
import type { Blackboard } from "../blackboard";


export interface Dispatcher {
  dispatch(
    freeAgents: readonly Agent[],
    pendingTasks: readonly Task[],
    blackboard: Blackboard,
    currentTick: number,
  ): Array<{ agent: Agent; task: Task }>;
}