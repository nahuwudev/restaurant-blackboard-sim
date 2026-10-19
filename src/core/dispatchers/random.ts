import type { Agent } from "../../agents/agent";
import type { Task } from "../../tasks/task";
import type { Blackboard } from "../blackboard";
import { shuffle } from "../helpers/rng";
import type { Dispatcher } from "./dispatcher";

export class RandomDispatcher implements Dispatcher {
  constructor(private rng: () => number = Math.random) {}

  dispatch(
    freeAgents: readonly Agent[],
    pendingTasks: readonly Task[],
    blackboard: Blackboard,
    currentTick: number,
  ): Array<{ agent: Agent; task: Task }> {
    const assigned: Array<{ agent: Agent; task: Task }> = [];
    
    const shuffledAgents = shuffle(freeAgents, this.rng);
    const shuffledTasks = shuffle(pendingTasks, this.rng);

    const limit = Math.min(shuffledAgents.length, shuffledTasks.length);

    for (let i = 0; i < limit; i++) {
      const agent = shuffledAgents[i]!;
      const task = shuffledTasks[i]!;

      const taken = blackboard.getQueue().take(task.id, agent.id);
      if (taken) {
        agent.assignTask(taken.task, currentTick);
        assigned.push({ agent, task: taken.task });
      }
    }

    return assigned;
  }
}