import { describe, it, expect } from "bun:test";
import { Agent } from "../../src/agents/agent";
import { AGENT_ROLE, AGENT_TOOL } from "../../src/agents/agent.types";
import { Orchestrator } from "../../src/core/orchestrator";
import { UtilityDispatcher } from "../../src/core/dispatchers/utility";
import { RandomDispatcher } from "../../src/core/dispatchers/random";
import { RoundRobinDispatcher } from "../../src/core/dispatchers/round-robin";
import { Runner } from "../../src/core/runner/runner";
import { Reporter } from "../../src/core/runner/reporter";
import { createRng } from "../../src/core/helpers/rng";
import { TASK_KINDS, type Task } from "../../src/tasks/task";

describe("Runner & Escenarios (Hito 6)", () => {
  const createSimpleTasks = (count: number, difficulty = 3): Task[] => {
    const kinds = [TASK_KINDS.COOK, TASK_KINDS.WASH, TASK_KINDS.PREP, TASK_KINDS.SERVE];
    const tasks: Task[] = [];
    for (let i = 0; i < count; i++) {
      tasks.push({
        id: crypto.randomUUID(),
        kind: kinds[i % kinds.length]!,
        difficulty,
        status: "pending",
        requiredItems: [], // Sin requerimientos para garantizar ejecución directa en tests
      });
    }
    return tasks;
  };

  it("Escenario A: Auto-organización sin roles (>60% de decisiones alineadas con aptitud)", () => {
    const agents = [
      new Agent({ strength: 9, dexterity: 2, energy: 100 }, "cook-specialist"),
      new Agent({ strength: 2, dexterity: 9, energy: 100 }, "washer-specialist"),
      new Agent({ strength: 5, dexterity: 5, energy: 100 }, "generalist"),
    ];

    const tasks = createSimpleTasks(10);
    const dispatcher = new UtilityDispatcher(new Orchestrator());

    const result = Runner.runScenario(
      {
        name: "Escenario A — Auto-organización sin roles",
        agents,
        tasks,
        maxTicks: 200,
      },
      dispatcher,
    );

    expect(result.completedTasks).toBe(10);
    expect(result.pendingTasks).toBe(0);
    // Criterio de éxito formal Hito 6: >60% de decisiones alineadas con aptitud natural
    expect(result.metrics.alignmentRate).toBeGreaterThan(0.6);
  });

  it("Escenario B: Alta carga con roles sugeridos (ningún tipo espera >3x el promedio global)", () => {
    const agents = [
      new Agent(
        { strength: 8, dexterity: 3, energy: 100, preferredRole: AGENT_ROLE.COOK },
        "chef-1",
      ),
      new Agent(
        { strength: 7, dexterity: 4, energy: 100, preferredRole: AGENT_ROLE.COOK },
        "chef-2",
      ),
      new Agent(
        { strength: 2, dexterity: 8, energy: 100, preferredRole: AGENT_ROLE.DISHWASHER },
        "washer-1",
      ),
      new Agent(
        { strength: 3, dexterity: 8, energy: 100, preferredRole: AGENT_ROLE.WAITER },
        "waiter-1",
      ),
    ];

    const tasks = createSimpleTasks(50);
    const dispatcher = new UtilityDispatcher(new Orchestrator());

    const result = Runner.runScenario(
      {
        name: "B — Alta carga",
        agents,
        tasks,
        maxTicks: 500,
      },
      dispatcher,
    );

    expect(result.completedTasks).toBe(50);
    expect(result.totalTicks).toBeLessThanOrEqual(500);

    // Criterio de éxito formal Hito 6: Ningún tipo de tarea espera >3x el promedio global
    const waits = Object.values(result.metrics.avgWaitByKind);
    expect(waits.length).toBeGreaterThan(0);
    const globalAvgWait = waits.reduce((sum, w) => sum + w, 0) / waits.length;

    for (const wait of waits) {
      expect(wait).toBeLessThanOrEqual(3 * globalAvgWait);
    }
  });

  it("Escenario C: Benchmark contra línea base (Utility AI >= 20% mejor que aleatorio)", () => {
    // 6 agentes: 3 cocineros + 2 lavaplatos + 1 mozo
    const createAgents = () => [
      new Agent(
        {
          strength: 9,
          dexterity: 2,
          energy: 100,
          preferredRole: AGENT_ROLE.COOK,
          tool: AGENT_TOOL.CHEF_KNIFE,
        },
        "cook-1",
      ),
      new Agent(
        {
          strength: 8,
          dexterity: 3,
          energy: 100,
          preferredRole: AGENT_ROLE.COOK,
          tool: AGENT_TOOL.CHEF_KNIFE,
        },
        "cook-2",
      ),
      new Agent(
        {
          strength: 9,
          dexterity: 2,
          energy: 100,
          preferredRole: AGENT_ROLE.COOK,
          tool: AGENT_TOOL.CHEF_KNIFE,
        },
        "cook-3",
      ),
      new Agent(
        {
          strength: 2,
          dexterity: 9,
          energy: 100,
          preferredRole: AGENT_ROLE.DISHWASHER,
          tool: AGENT_TOOL.BROOM,
        },
        "washer-1",
      ),
      new Agent(
        {
          strength: 3,
          dexterity: 8,
          energy: 100,
          preferredRole: AGENT_ROLE.DISHWASHER,
          tool: AGENT_TOOL.BROOM,
        },
        "washer-2",
      ),
      new Agent(
        {
          strength: 3,
          dexterity: 8,
          energy: 100,
          preferredRole: AGENT_ROLE.WAITER,
          tool: AGENT_TOOL.TRAY,
        },
        "waiter-1",
      ),
    ];

    const tasks = createSimpleTasks(50, 5);

    // 1. Utility AI
    const resUtility = Runner.runScenario(
      {
        name: "C-Utility",
        agents: createAgents(),
        tasks: tasks.map((t) => ({ ...t, id: crypto.randomUUID() })),
        maxTicks: 500,
      },
      new UtilityDispatcher(new Orchestrator()),
    );

    // 2. Random
    const resRandom = Runner.runScenario(
      {
        name: "C-Random",
        agents: createAgents(),
        tasks: tasks.map((t) => ({ ...t, id: crypto.randomUUID() })),
        maxTicks: 500,
      },
      new RandomDispatcher(createRng(1234)),
    );

    // 3. RoundRobin
    const resRR = Runner.runScenario(
      {
        name: "C-RoundRobin",
        agents: createAgents(),
        tasks: tasks.map((t) => ({ ...t, id: crypto.randomUUID() })),
        maxTicks: 500,
      },
      new RoundRobinDispatcher(),
    );

    expect(resUtility.completedTasks).toBe(50);
    expect(resRandom.completedTasks).toBe(50);
    expect(resRR.completedTasks).toBe(50);

    // Criterio de éxito formal Hito 6: Utility AI >= 20% mejor que aleatorio en tiempo total
    const improvement =
      (resRandom.totalTicks - resUtility.totalTicks) / resRandom.totalTicks;
    expect(improvement).toBeGreaterThanOrEqual(0.2);
  });

  it("Reporter genera el formato de reporte formal requerido para el Hito 6", () => {
    const agents = [
      new Agent({ strength: 8, dexterity: 3, energy: 100 }, "A"),
      new Agent({ strength: 3, dexterity: 8, energy: 100 }, "B"),
    ];
    const tasks = createSimpleTasks(10);
    const dispatcher = new UtilityDispatcher(new Orchestrator());

    const result = Runner.runScenario(
      { name: "B — Alta carga", agents, tasks, maxTicks: 200 },
      dispatcher,
    );

    const baselineResult = {
      ...result,
      totalTicks: Math.round(result.totalTicks * 1.3),
    };

    const report = Reporter.generate(result, {
      baselineResult,
      verdict: "PASS",
    });

    expect(report).toContain("=== RESTAURANT SIMULATOR — RUN REPORT ===");
    expect(report).toContain("Escenario:        B — Alta carga");
    expect(report).toContain("Tiempo total:");
    expect(report).toContain("Conflictos resueltos:");
    expect(report).toContain("Starvation evitada:");
    expect(report).toContain("energía final:");
    expect(report).toContain("Veredicto:  PASS — arquitectura viable");
  });
});