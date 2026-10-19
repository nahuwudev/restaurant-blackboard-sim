import type { Agent } from "../../agents/agent";
import { EventLogger } from "../../metrics/event-log";
import { EVENT_TYPES } from "../../metrics/events";
import { TaskQueue } from "../../tasks/task-queue";
import { Blackboard } from "../blackboard";
import type { Dispatcher } from "../dispatchers/dispatcher";

import * as Metrics from "../../metrics/metrics";
import type { ScenarioConfig, ScenarioResult } from "./scenario.types";
import { AGENT_ROLE } from "../../agents/agent.types";

export class Runner {
  /**
   * Ejecuta un solo tick de la simulación
   */
  static step(
    currentTick: number,
    agents: readonly Agent[],
    blackboard: Blackboard,
    dispatcher: Dispatcher,
    logger: EventLogger,
  ): void {
    const queue = blackboard.getQueue();

    for (const agent of agents) {
      blackboard.registerAgent({
        id: agent.id,
        name: agent.name ?? agent.id,
        role: agent.role,
        stats: agent.stats,
        currentTaskId: agent.currentTaskId,
      });

      if (agent.currentTaskId !== undefined) {
        const taskIdBeforeWork = agent.currentTaskId;
        agent.work();

        if (agent.currentTaskId === undefined) {
          const success = queue.complete(taskIdBeforeWork);
          if (success) {
            const taskObj = queue.getAll().find((t) => t.task.id === taskIdBeforeWork)?.task;
            if (taskObj) {
              agent.onTaskCompleted(taskObj);
            }
            logger.emit({
              type: EVENT_TYPES.TASK_COMPLETED,
              tick: currentTick,
              taskId: taskIdBeforeWork,
              agentId: agent.id,
            });
          }
        }
      } else {
        agent.recoverEnergy();
      }
    }

    const freeAgents = agents.filter((a) => a.isAvailable());
    const pendingTasks = queue.pending().map((qt) => qt.task);

    if (freeAgents.length > 0 && pendingTasks.length > 0) {
      const assignments = dispatcher.dispatch(
        freeAgents,
        pendingTasks,
        blackboard,
        currentTick,
      );

      for (const { agent, task } of assignments) {
        // Penalización inventario: si falta stock de requiredItems, la tarea falla y vuelve con dificultad +2
        if (
          task.requiredItems &&
          task.requiredItems.length > 0 &&
          !blackboard.hasResources(task.requiredItems)
        ) {
          task.difficulty = Math.min(10, task.difficulty + 2);
          const queueItem = queue.getAll().find((t) => t.task.id === task.id);
          if (queueItem) {
            queueItem.task.difficulty = task.difficulty;
          }
          queue.release(task.id, agent.id);
          agent.currentTaskId = undefined;
          continue;
        }

        if (task.requiredItems && task.requiredItems.length > 0) {
          blackboard.consumeResources(task.requiredItems);
        }

        agent.consumeEnergy(task);

        const allAptitudes = agents.map((a) => a.aptitudeFor(task));
        const teamBestVal =
          allAptitudes.length > 0
            ? Math.max(...allAptitudes)
            : agent.bestAptitude();

        logger.emit({
          type: EVENT_TYPES.TASK_TAKEN,
          tick: currentTick,
          taskId: task.id,
          agentId: agent.id,
          kind: task.kind,
          aptitude: agent.aptitudeFor(task),
          agentBest: agent.bestAptitude(),
          teamBest: teamBestVal,
        });
      }
    }

    const energies: Record<string, number> = {};
    for (const ag of agents) {
      energies[ag.id] = ag.stats.energy;
    }
    logger.emit({
      type: EVENT_TYPES.TICK_END,
      tick: currentTick,
      energies,
    });
  }

  /**
   * Ejecuta un escenario completo hasta vaciar la cola o llegar a maxTicks
   */
  static runScenario(
    config: ScenarioConfig,
    dispatcher: Dispatcher,
  ): ScenarioResult {
    const queue = new TaskQueue();
    for (const task of config.tasks) {
      queue.enqueue(task);
    }

    const blackboard = new Blackboard(queue);

    for (const agent of config.agents) {
      blackboard.registerAgent({
        id: agent.id,
        name: agent.name ?? agent.id,
        role: agent.role,
        stats: agent.stats,
        currentTaskId: agent.currentTaskId,
      });
    }

    const logger = new EventLogger();

    if ("orchestrator" in dispatcher) {
      const maybeWithOrchestrator = dispatcher as { orchestrator?: { logger?: EventLogger } };
      if (maybeWithOrchestrator.orchestrator) {
        maybeWithOrchestrator.orchestrator.logger = logger;
      }
    }

    for (const item of queue.getAll()) {
      logger.emit({
        type: EVENT_TYPES.TASK_CREATED,
        tick: item.createdAt ?? 0,
        taskId: item.task.id,
        kind: item.task.kind,
      });
    }

    const maxTicks = config.maxTicks ?? 1000;
    let tick = 0;

    while (tick < maxTicks) {
      const activeOrPending = queue
        .getAll()
        .some((t) => t.task.status === "pending" || t.task.status === "taken");
      if (!activeOrPending) break;

      tick++;
      blackboard.tick();
      this.step(tick, config.agents, blackboard, dispatcher, logger);
    }

    const events = logger.getLogs();
    const allTasks = queue.getAll();
    const completedTasks = allTasks.filter(
      (t) => t.task.status === "done",
    ).length;
    const pendingTasks = allTasks.filter(
      (t) => t.task.status === "pending" || t.task.status === "taken",
    ).length;

    const finalEnergies: Record<string, number> = {};
    for (const agent of config.agents) {
      finalEnergies[agent.id] = agent.stats.energy;
    }

    for (const item of allTasks) {
      const configTask = config.tasks.find((t) => t.id === item.task.id);
      if (configTask) {
        configTask.difficulty = item.task.difficulty;
        configTask.status = item.task.status;
      }
    }

    const alignmentRateVal = Metrics.alignmentRate(events) ?? 0;
    const avgWaitMap = Metrics.avgWaitByKind(events);
    const avgWaitByKindObj: Record<string, number> = {};
    for (const [kind, val] of avgWaitMap.entries()) {
      avgWaitByKindObj[kind] = val;
    }
    const conflictCountVal = Metrics.conflictCount(events);
    const starvedIds = Metrics.starvedTaskIds(events, 100);

    return {
      scenarioName: config.name,
      totalTicks: tick,
      completedTasks,
      pendingTasks,
      tasks: allTasks,
      events: [...events],
      metrics: {
        alignmentRate: alignmentRateVal,
        avgWaitByKind: avgWaitByKindObj,
        conflictCount: conflictCountVal,
        finalEnergies,
        starvedTaskIds: starvedIds,
        efficiencyMargin: Math.max(0, maxTicks - tick),
      },
    };
  }
}

