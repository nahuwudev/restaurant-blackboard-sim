import type { ScenarioResult } from "./scenario.types";
import { EVENT_TYPES } from "../../metrics/events";

export interface ReporterOptions {
  baselineResult?: ScenarioResult;
  verdict?: "PASS" | "FAIL";
  starvationAvoidedCount?: number;
  agentNames?: Record<string, string>;
}

export class Reporter {
  /**
   * Genera el reporte formateado en texto de una corrida de simulación
   */
  static generate(result: ScenarioResult, options: ReporterOptions = {}): string {
    const lines: string[] = [];
    lines.push("=== RESTAURANT SIMULATOR — RUN REPORT ===");

    // Nombre de escenario
    lines.push(`Escenario:        ${result.scenarioName}`);

    // Cantidad de agentes y tareas
    const agentIds = Object.keys(result.metrics.finalEnergies);
    const totalTasks = result.completedTasks + result.pendingTasks;
    lines.push(
      `Agentes:          ${agentIds.length}  |  Tareas: ${totalTasks}  |  Ticks: ${result.totalTicks}\n`,
    );

    // Tiempo total (con comparación baseline si existe)
    if (options.baselineResult && options.baselineResult.totalTicks > 0) {
      const baselineTicks = options.baselineResult.totalTicks;
      const diff = baselineTicks - result.totalTicks;
      const improvement = (diff / baselineTicks) * 100;
      lines.push(
        `Tiempo total:     ${result.totalTicks} ticks (aleatorio: ${baselineTicks} → mejora: ${improvement.toFixed(1)}%)`,
      );
    } else {
      lines.push(`Tiempo total:     ${result.totalTicks} ticks`);
    }

    // Conflictos resueltos
    lines.push(`Conflictos resueltos: ${result.metrics.conflictCount}`);

    // Starvation evitada
    const starvationAvoided =
      options.starvationAvoidedCount !== undefined
        ? options.starvationAvoidedCount
        : Math.max(0, result.completedTasks - result.metrics.starvedTaskIds.length);
    lines.push(
      `Starvation evitada:   ${starvationAvoided} tareas (priority aging activado)\n`,
    );

    // Desglose por agente
    const taskCountByAgent: Record<string, Record<string, number>> = {};
    for (const agentId of agentIds) {
      taskCountByAgent[agentId] = { cook: 0, wash: 0, prep: 0, serve: 0 };
    }

    for (const event of result.events) {
      if (event.type === EVENT_TYPES.TASK_TAKEN && event.agentId) {
        const agentRecord = (taskCountByAgent[event.agentId] ??= {
          cook: 0,
          wash: 0,
          prep: 0,
          serve: 0,
        });
        const kind = event.kind as "cook" | "wash" | "prep" | "serve";
        if (kind in agentRecord) {
          agentRecord[kind] = (agentRecord[kind] ?? 0) + 1;
        }
      }
    }

    for (const agentId of agentIds) {
      const counts = taskCountByAgent[agentId] ?? {
        cook: 0,
        wash: 0,
        prep: 0,
        serve: 0,
      };
      const energy = Math.round(result.metrics.finalEnergies[agentId] ?? 0);
      const displayName = options.agentNames?.[agentId] ?? `Agente ${agentId}`;

      const prepCount = counts.prep ?? 0;
      const cookCount = counts.cook ?? 0;
      const washCount = counts.wash ?? 0;
      const serveCount = counts.serve ?? 0;

      const taskBreakdown =
        prepCount > 0
          ? `cook:${cookCount}   wash:${washCount}  prep:${prepCount}  serve:${serveCount}`
          : `cook:${cookCount}   wash:${washCount}  serve:${serveCount}`;

      lines.push(`[${displayName}]  ${taskBreakdown}  | energía final: ${energy}%`);
    }

    // Veredicto
    const isPass = options.verdict !== undefined ? options.verdict === "PASS" : result.pendingTasks === 0;
    lines.push(`\nVeredicto:  ${isPass ? "PASS — arquitectura viable" : "FAIL — umbrales no alcanzados"}`);

    return lines.join("\n");
  }

  static print(result: ScenarioResult, options: ReporterOptions = {}): void {
    console.log(this.generate(result, options));
  }
}
