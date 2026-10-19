import type { Agent } from "../agents/agent";
import type { BlackboardState } from "../core/types/blackboard.types";
import type { QueueTask } from "../tasks/task";
import { exponential, linear } from "./curves";

export const MAX_WAIT_TICKS = 100;

export function scoreAction(
  agent: Agent,
  action: QueueTask,
  blackboardState: BlackboardState,
): number {
  const justTookTask =
    agent.currentTaskId !== undefined &&
    agent.taskTakenAtTick === blackboardState.tick;
  if (justTookTask) return 0;

  const energyScore = linear(agent.stats.energy / 100) * 0.3;
  const aptitude =
    agent.aptitudeFor(action.task) *
    0.5 *
    blackboardState.weights[action.task.kind];
  const waitRatio = Math.max(
    0,
    Math.min(1, (blackboardState.tick - action.createdAt) / MAX_WAIT_TICKS),
  );

  const required = action.task.requiredItems;
  const hasResources =
    !required ||
    required.length === 0 ||
    required.every((item) => (blackboardState.inventory[item] ?? 0) > 0);
  const resourceMultiplier = hasResources ? 1.0 : 0.05;

  return (energyScore + aptitude + exponential(waitRatio, 3)) * resourceMultiplier;
}
