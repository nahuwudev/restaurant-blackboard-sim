// tests/helpers/factories.ts
import { Agent } from "../../src/agents/agent";
import { AGENT_ROLE } from "../../src/agents/agent.types";
import { choice, nextInt } from "../../src/core/helpers/rng";
import type {
  AgentSnapshot,
  BlackboardState,
} from "../../src/core/types/blackboard.types";
import { TASK_KINDS, type QueueTask, type Task } from "../../src/tasks/task";
import { TaskQueue } from "../../src/tasks/task-queue";
import { scoreAction } from "../../src/utility/evaluator";

export function createTestAgents(): Agent[] {
  return [
    new Agent({ strength: 9, dexterity: 2, energy: 100 }), // cocinero natural
    new Agent({ strength: 2, dexterity: 9, energy: 100 }), // lavaplatos natural
    new Agent({ strength: 5, dexterity: 5, energy: 100 }), // neutro
  ];
}

export function createMixedTasks(n: number, rng: () => number = Math.random) {
  const kindTasks = Object.values(TASK_KINDS);
  const queue = new TaskQueue();

  for (let i = 0; i < n; i++) {
    const difficulty = nextInt(1, 10, rng);
    const kind = choice(kindTasks, rng);

    const task: Task = {
      difficulty,
      id: crypto.randomUUID(),
      kind,
      status: "pending",
      takenBy: undefined,
      requiredItems: [],
    };
    queue.enqueue(task);
  }

  return queue;
}

export function selectBestAgentForTask(
  agents: Agent[],
  task: QueueTask,
  bb: BlackboardState,
): Agent {
  const [first] = agents;
  if (!first) throw new Error("Lista vacía");

  let best = first;
  let maxScore = scoreAction(first, task, bb);

  for (const agent of agents) {
    const score = scoreAction(agent, task, bb);
    if (score > maxScore) {
      maxScore = score;
      best = agent;
    }
  }

  return best;
}

export function isTaskAffinedToAgent(
  chosenAgent: Agent,
  task: QueueTask,
): boolean {
  const currentTaskAptitude = chosenAgent.aptitudeFor(task.task);

  const allKinds = Object.values(TASK_KINDS);

  return allKinds.every((kind) => {
    const dummyTask = { ...task.task, kind };
    return currentTaskAptitude >= chosenAgent.aptitudeFor(dummyTask);
  });
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    kind: TASK_KINDS.COOK,
    difficulty: 3,
    requiredItems: ["pan", "oil"],
    status: "pending",
    ...overrides,
  };
}

export function makeAgent(
  overrides: Partial<AgentSnapshot> = {},
): AgentSnapshot {
  return {
    id: crypto.randomUUID(),
    name: "Agente Test",
    role: AGENT_ROLE.COOK,
    stats: {
      strength: 5,
      dexterity: 5,
      energy: 100,
    },
    ...overrides,
  };
}
