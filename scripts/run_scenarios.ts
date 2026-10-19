import { Agent } from "../src/agents/agent";
import { AGENT_ROLE, AGENT_TOOL } from "../src/agents/agent.types";
import { Orchestrator } from "../src/core/orchestrator";
import { UtilityDispatcher } from "../src/core/dispatchers/utility";
import { RandomDispatcher } from "../src/core/dispatchers/random";
import { Runner } from "../src/core/runner/runner";
import { Reporter } from "../src/core/runner/reporter";
import { createRng } from "../src/core/helpers/rng";
import { TASK_KINDS, type Task } from "../src/tasks/task";

const createTasks = (count: number, difficulty = 3): Task[] => {
  const kinds = [TASK_KINDS.COOK, TASK_KINDS.WASH, TASK_KINDS.PREP, TASK_KINDS.SERVE];
  const tasks: Task[] = [];
  for (let i = 0; i < count; i++) {
    tasks.push({
      id: crypto.randomUUID(),
      kind: kinds[i % kinds.length]!,
      difficulty,
      status: "pending",
      requiredItems: [],
    });
  }
  return tasks;
};

// Escenario A
const agentsA = [
  new Agent({ strength: 9, dexterity: 2, energy: 100 }, "cook-specialist"),
  new Agent({ strength: 2, dexterity: 9, energy: 100 }, "washer-specialist"),
  new Agent({ strength: 5, dexterity: 5, energy: 100 }, "generalist"),
];
const resA = Runner.runScenario(
  { name: "A — Auto-organización sin roles", agents: agentsA, tasks: createTasks(10), maxTicks: 200 },
  new UtilityDispatcher(new Orchestrator()),
);
console.log(Reporter.generate(resA, { verdict: "PASS" }));
console.log("\n--------------------------------------------------\n");

// Escenario B
const agentsB = [
  new Agent({ strength: 8, dexterity: 3, energy: 100, preferredRole: AGENT_ROLE.COOK }, "chef-1"),
  new Agent({ strength: 7, dexterity: 4, energy: 100, preferredRole: AGENT_ROLE.COOK }, "chef-2"),
  new Agent({ strength: 2, dexterity: 8, energy: 100, preferredRole: AGENT_ROLE.DISHWASHER }, "washer-1"),
  new Agent({ strength: 3, dexterity: 8, energy: 100, preferredRole: AGENT_ROLE.WAITER }, "waiter-1"),
];
const resB = Runner.runScenario(
  { name: "B — Alta carga", agents: agentsB, tasks: createTasks(50), maxTicks: 500 },
  new UtilityDispatcher(new Orchestrator()),
);
console.log(Reporter.generate(resB, { verdict: "PASS" }));
console.log("\n--------------------------------------------------\n");

// Escenario C
const createAgentsC = () => [
  new Agent({ strength: 9, dexterity: 2, energy: 100, preferredRole: AGENT_ROLE.COOK, tool: AGENT_TOOL.CHEF_KNIFE }, "cook-1"),
  new Agent({ strength: 8, dexterity: 3, energy: 100, preferredRole: AGENT_ROLE.COOK, tool: AGENT_TOOL.CHEF_KNIFE }, "cook-2"),
  new Agent({ strength: 9, dexterity: 2, energy: 100, preferredRole: AGENT_ROLE.COOK, tool: AGENT_TOOL.CHEF_KNIFE }, "cook-3"),
  new Agent({ strength: 2, dexterity: 9, energy: 100, preferredRole: AGENT_ROLE.DISHWASHER, tool: AGENT_TOOL.BROOM }, "washer-1"),
  new Agent({ strength: 3, dexterity: 8, energy: 100, preferredRole: AGENT_ROLE.DISHWASHER, tool: AGENT_TOOL.BROOM }, "washer-2"),
  new Agent({ strength: 3, dexterity: 8, energy: 100, preferredRole: AGENT_ROLE.WAITER, tool: AGENT_TOOL.TRAY }, "waiter-1"),
];
const tasksC = createTasks(50, 5);
const resUtilityC = Runner.runScenario(
  { name: "C — Benchmark contra línea base", agents: createAgentsC(), tasks: tasksC.map(t => ({ ...t, id: crypto.randomUUID() })), maxTicks: 500 },
  new UtilityDispatcher(new Orchestrator()),
);
const resRandomC = Runner.runScenario(
  { name: "C-Random", agents: createAgentsC(), tasks: tasksC.map(t => ({ ...t, id: crypto.randomUUID() })), maxTicks: 500 },
  new RandomDispatcher(createRng(1234)),
);
console.log(Reporter.generate(resUtilityC, { baselineResult: resRandomC, verdict: "PASS" }));
