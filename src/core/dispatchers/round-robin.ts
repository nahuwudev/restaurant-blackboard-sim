import type { Agent } from "../../agents/agent";
import type { Task } from "../../tasks/task";
import type { Blackboard } from "../blackboard";
import type { Dispatcher } from "./dispatcher";

export class RoundRobinDispatcher implements Dispatcher {
  private agentPointer = 0;

  dispatch(
    freeAgents: readonly Agent[],
    pendingTasks: readonly Task[],
    blackboard: Blackboard,
    currentTick: number,
  ): Array<{ agent: Agent; task: Task }> {
    if (freeAgents.length === 0 || pendingTasks.length === 0) {
      return [];
    }

    const assigned: Array<{ agent: Agent; task: Task }> = [];
    const agentsList = [...freeAgents];
    const tasksList = [...pendingTasks]; // Orden de llegada natural de la cola

    for (const task of tasksList) {
      if (agentsList.length === 0) break;

      this.agentPointer = this.agentPointer % agentsList.length;
      const agent = agentsList[this.agentPointer]!;

      const taken = blackboard.getQueue().take(task.id, agent.id);
      if (taken) {
        agent.assignTask(taken.task, currentTick);
        assigned.push({ agent, task: taken.task });
        
        agentsList.splice(this.agentPointer, 1);
      } else {
        this.agentPointer++;
      }
    }

    // Avanzamos el puntero global para el siguiente tick
    if (freeAgents.length > 0) {
      this.agentPointer = (this.agentPointer + 1) % freeAgents.length;
    }

    return assigned;
  }
}