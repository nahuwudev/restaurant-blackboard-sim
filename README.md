# 🍽️ Restaurant Simulator — Multi-Agent Utility AI

Simulador de cocina y restaurante basado en un sistema multiagente (MAS) con toma de decisiones autónoma mediante **Utility AI**, coordinación desacoplada por **Blackboard Pattern**, resolución de conflictos por **Subastas y Orquestador**, y un modelo de **inventario, penalizaciones e incentivos**.

---

## 🏗️ Arquitectura del Sistema

```
[ TaskQueue ] ── (Tareas pendientes) ──> [ Blackboard ] <── (Pesos e Inventario)
                                               │
                                 ┌─────────────┴─────────────┐
                                 ▼                           ▼
                           [ Agent A ]                  [ Agent B ]
                           (Utility AI)                 (Utility AI)
                                 │                           │
                                 └─────────────┬─────────────┘
                                               ▼
                                      [ Orchestrator ]
                                   (Resolución de Pujas)
```

1. **Agentes Autónomos (`Agent`)**:
   * Estadísticas: Fuerza, Destreza y Energía (0 a 100).
   * Aptitud matemática por tipo de tarea (`cook`, `wash`, `prep`, `serve`).
   * Herramientas personales (`chef_knife`, `broom`, `tray`) con bonificación de velocidad afín (-20%) o penalización por herramienta ajena (+20%).
2. **Pizarrón Compartido (`Blackboard`)**:
   * Estado inmutable vía `deepFreeze`.
   * Inventario global de ingredientes y limpieza con reabastecimiento programado.
   * Ajuste dinámico de pesos según el estado del restaurante (ej. acumulación de platos sucios o cola saturada).
3. **Función de Utilidad (`Evaluator`)**:
   * Combina energía restante (curva lineal), aptitud ponderada por Blackboard, tiempo de espera / prevención de starvation (curva exponencial) y disponibilidad de recursos de inventario ($0.05$ si faltan ingredientes).
4. **Orquestador (`Orchestrator`)**:
   * Resuelve conflictos y pujas simultáneas. Penaliza con aturdimiento de 1 tick a los postores perdedores.
5. **Penalizaciones e Incentivos**:
   * Penalizaciones: inactividad $>5$ ticks (recuperación ineficiente), abandono de tarea (prioridad reducida), energía 0 (descanso forzado por 10 ticks), inventario vacío (falla y dificultad $+2$).
   * Incentivos: racha consecutiva sin descanso ($+10\%$ velocidad), tarea afín completada ($+5$ energía extra), margen de eficiencia registrado.

---

## 📊 Outputs Oficiales del Reporter (Hito 6)

### Escenario A — Auto-organización sin roles
Valida que la Utility AI produce especialización emergente sin reglas explícitas de asignación. Umbral: $>60\%$ de decisiones alineadas con aptitud natural (obtenido: **80%**).

```text
=== RESTAURANT SIMULATOR — RUN REPORT ===
Escenario:        A — Auto-organización sin roles
Agentes:          3  |  Tareas: 10  |  Ticks: 6

Tiempo total:     6 ticks
Conflictos resueltos: 3
Starvation evitada:   10 tareas (priority aging activado)

[Agente cook-specialist]  cook:3   wash:1  serve:0  | energía final: 97%
[Agente washer-specialist]  cook:0   wash:2  serve:2  | energía final: 100%
[Agente generalist]  cook:0   wash:0  prep:2  serve:0  | energía final: 100%

Veredicto:  PASS — arquitectura viable
```

---

### Escenario B — Alta carga con roles sugeridos
Estresa el Blackboard dinámico con 50 tareas y 4 agentes con `preferredRole`. Umbral: ningún tipo de tarea espera $>3\times$ el promedio global.

```text
=== RESTAURANT SIMULATOR — RUN REPORT ===
Escenario:        B — Alta carga
Agentes:          4  |  Tareas: 50  |  Ticks: 18

Tiempo total:     18 ticks
Conflictos resueltos: 18
Starvation evitada:   50 tareas (priority aging activado)

[Agente chef-1]  cook:9   wash:0  prep:6  serve:0  | energía final: 96%
[Agente chef-2]  cook:4   wash:0  prep:6  serve:0  | energía final: 99%
[Agente washer-1]  cook:0   wash:4  serve:4  | energía final: 100%
[Agente waiter-1]  cook:0   wash:9  serve:8  | energía final: 100%

Veredicto:  PASS — arquitectura viable
```

---

### Escenario C — Benchmark contra línea base
Compara la Utility AI contra asignación aleatoria y round-robin con 6 agentes especialistas y 50 tareas. Umbral: Utility AI $\ge 20\%$ mejor en tiempo total de despacho (obtenido: **21.7%**).

```text
=== RESTAURANT SIMULATOR — RUN REPORT ===
Escenario:        C — Benchmark contra línea base
Agentes:          6  |  Tareas: 50  |  Ticks: 18

Tiempo total:     18 ticks (aleatorio: 23 → mejora: 21.7%)
Conflictos resueltos: 25
Starvation evitada:   50 tareas (priority aging activado)

[Agente cook-1]  cook:7   wash:1  prep:4  serve:0  | energía final: 91%
[Agente cook-2]  cook:3   wash:0  prep:4  serve:1  | energía final: 100%
[Agente cook-3]  cook:3   wash:1  prep:4  serve:0  | energía final: 93%
[Agente washer-1]  cook:0   wash:5  serve:5  | energía final: 100%
[Agente washer-2]  cook:0   wash:1  serve:5  | energía final: 100%
[Agente waiter-1]  cook:0   wash:5  serve:1  | energía final: 100%

Veredicto:  PASS — arquitectura viable
```

---

## 📄 Conclusiones Arquitectónicas

Para un análisis detallado sobre la viabilidad, los cuellos de botella corregidos y la extrapolación al juego real en producción, consulta [CONCLUSIONS.md](./CONCLUSIONS.md).

---

## 🚀 Instalación y Pruebas

Este proyecto utiliza [Bun](https://bun.sh/) como runtime y gestor de paquetes de alto rendimiento.

```bash
# 1. Instalar dependencias
bun install

# 2. Correr la suite completa de tests (97 tests unitarios y de integración)
bun test

# 3. Verificar tipos TypeScript estrictos (0 errores, 0 any)
bun x tsc --noEmit

# 4. Ejecutar los escenarios y ver los reportes estructurados
bun run scripts/run_scenarios.ts
```