import { describe, it, expect } from "bun:test";
import { Agent } from "../../src/agents/agent";
import { TaskQueue } from "../../src/tasks/task-queue";
import { TASK_KINDS } from "../../src/tasks/task";
import { Orchestrator } from "../../src/core/orchestrator";
import { createRng } from "../../src/core/helpers/rng";
import { Blackboard } from "../../src/core/blackboard";
import { UtilityDispatcher } from "../../src/core/dispatchers/utility";
import { RandomDispatcher } from "../../src/core/dispatchers/random";
import { RoundRobinDispatcher } from "../../src/core/dispatchers/round-robin";

const MOCK_UUID_1 = crypto.randomUUID();
const MOCK_UUID_2 = crypto.randomUUID();
const MOCK_UUID_3 = crypto.randomUUID();

describe("Dispatchers", () => {
  const createTestAgents = () => [
    new Agent({ strength: 8, dexterity: 2, energy: 100 }, "a1"),
    new Agent({ strength: 2, dexterity: 8, energy: 100 }, "a2"),
  ];

  const createTestTasks = () => {
    const queue = new TaskQueue();
    queue.enqueue({
      id: MOCK_UUID_1,
      kind: TASK_KINDS.COOK,
      difficulty: 5,
      status: "pending",
      requiredItems: [],
    });
    queue.enqueue({
      id: MOCK_UUID_2,
      kind: TASK_KINDS.WASH,
      difficulty: 5,
      status: "pending",
      requiredItems: [],
    });
    return queue;
  };

  describe("UtilityDispatcher", () => {
    it("asigna tareas usando la utilidad y el orquestador sin duplicar agentes ni tareas", () => {
      const agents = createTestAgents();
      const queue = createTestTasks();
      const blackboard = new Blackboard(queue);
      const orchestrator = new Orchestrator();
      const dispatcher = new UtilityDispatcher(orchestrator);

      const assigned = dispatcher.dispatch(
        agents,
        queue.pending().map((qt) => qt.task),
        blackboard,
        0,
      );

      expect(assigned.length).toBe(2);

      const assignedAgentIds = assigned.map((a) => a.agent.id);
      expect(new Set(assignedAgentIds).size).toBe(assigned.length);

      const assignedTaskIds = assigned.map((a) => a.task.id);
      expect(new Set(assignedTaskIds).size).toBe(assigned.length);
    });
  });

  describe("RandomDispatcher", () => {
    it("es determinista si se usa la misma semilla", () => {
      const runWithSeed = (seed: number) => {
        const agents = createTestAgents();
        const queue = createTestTasks(); // Mismas tareas fijas
        const blackboard = new Blackboard(queue);
        const dispatcher = new RandomDispatcher(createRng(seed));

        return dispatcher.dispatch(
          agents,
          queue.pending().map((qt) => qt.task),
          blackboard,
          0,
        );
      };

      const res1 = runWithSeed(42);
      const res2 = runWithSeed(42);

      expect(res1.map((r) => r.task.id)).toEqual(res2.map((r) => r.task.id));
      expect(res1.map((r) => r.agent.id)).toEqual(res2.map((r) => r.agent.id));
    });
  });

  describe("RoundRobinDispatcher", () => {
    it("rota los agentes equitativamente a lo largo de los ticks", () => {
      const agents = createTestAgents(); 
      const queue = new TaskQueue();

      queue.enqueue({
        id: MOCK_UUID_1,
        kind: TASK_KINDS.COOK,
        difficulty: 5,
        status: "pending",
        requiredItems: [],
      });
      queue.enqueue({
        id: MOCK_UUID_2,
        kind: TASK_KINDS.COOK,
        difficulty: 5,
        status: "pending",
        requiredItems: [],
      });

      const blackboard = new Blackboard(queue);
      const dispatcher = new RoundRobinDispatcher();

      const assigned0 = dispatcher.dispatch(
        agents,
        queue.pending().map((qt) => qt.task),
        blackboard,
        0,
      );
      expect(assigned0.length).toBe(2);


      queue.complete(MOCK_UUID_1);
      queue.complete(MOCK_UUID_2);
      agents.forEach((a) => {
        a.ticksRemaining = 0;
        a.currentTaskId = undefined;
      });

      queue.enqueue({
        id: MOCK_UUID_3,
        kind: TASK_KINDS.COOK,
        difficulty: 5,
        status: "pending",
        requiredItems: [],
      });

      const assigned1 = dispatcher.dispatch(
        agents,
        queue.pending().map((qt) => qt.task),
        blackboard,
        1,
      );
      expect(assigned1.length).toBe(1);
      expect(assigned1[0]?.agent.id).toBe("a2");
    });
  });
});
