# Conclusiones del Proyecto: Restaurant Simulator

## 1. ¿La arquitectura es viable para el juego?
**Sí, la arquitectura es plenamente viable.**
Los resultados de los tres escenarios del Hito 6 demuestran que la combinación de **Utility AI (evaluación continua)** con un **Blackboard dinámico (estado compartido)** y un **Orquestador de subastas (resolución de conflictos)** ofrece una base sólida para la simulación:

* **Auto-organización emergente (Escenario A):** Con un 80% de alineación natural entre aptitud y tareas (superando el umbral del 60%), los agentes se especializan por conveniencia matemática sin necesidad de imponer reglas rígidas de comportamiento.
* **Resiliencia ante cuellos de botella (Escenario B):** Bajo alta carga (50 tareas), el ajuste dinámico de pesos en el Blackboard y las curvas exponenciales de urgencia evitaron la inanición (*starvation*): ningún tipo de tarea superó 3x el tiempo promedio global.
* **Viabilidad económica y rendimiento (Escenario C):** La Utility AI superó en más del 20% a la asignación aleatoria y round-robin en tiempo total de despacho, demostrando que la complejidad arquitectónica se traduce en un valor medible de optimización.

---

## 2. ¿Qué falló durante el proceso y qué aprendimos?

Durante la implementación y pruebas surgieron puntos ciegos críticos que debieron corregirse:

1. **Acaparamiento en el sistema de subastas:** Inicialmente, el agente con las estadísticas más altas pujaba por todas las tareas de la cola a la vez. Al ser el mejor postor en todas, las ganaba en el mapa del orquestador, pero al solo poder ejecutar una tarea por tick, las demás quedaban desiertas y los otros agentes ociosos. Se corrigió haciendo que cada agente puje iterativamente por su mejor opción disponible (*round-based matching*).
2. **Ciclo de vida y desincronización de tareas:** La condición de finalización de trabajo en el `Runner` dependía de un retorno booleano ambiguo en `work()`, lo que provocaba que las tareas nunca se marcaran como completadas. Se alineó con el patrón del simulador (`agent.currentTaskId === undefined`).
3. **Discrepancia semántica Roles vs. Tareas:** Se confundía el rol estático (`AGENT_ROLE`) con la tarea asignada (`TASK_KINDS`). Los agentes intentaban adoptar un rol fijo en lugar de permitir que el rol sea una propiedad descriptiva/contrato y que la ejecución sea flexible.
4. **Desconexión entre recursos y toma de decisiones:** Evaluar solo la aptitud física provocaba que los agentes eligieran cocinar incluso cuando la despensa estaba vacía. La integración de la disponibilidad de inventario (`resourceMultiplier: 0.05`) fue indispensable para forzar decisiones realistas.

---

## 3. ¿Qué habría que cambiar en la extrapolación al juego final?

Para llevar este prototipo a un videojuego comercial en producción, se deben abordar las siguientes extensiones:

1. **Espacio físico y navegación (Pathfinding & Distancias):**
   * El simulador actual asume coste de desplazamiento cero. En el juego real, la distancia al fogón, a la bacha o a las mesas debe ser un factor clave en la función de utilidad (`costo_distancia`).
2. **Interrupción y cambio de prioridades (Preemption):**
   * Actualmente, un agente no puede abandonar una tarea tomada a menos que falle. En el juego final, eventos críticos (ej. fuego en la cocina, cliente VIP furioso) deben permitir interrumpir tareas de menor prioridad (`preempt`).
3. **Inventario espacializado y estaciones de trabajo con capacidad limitada:**
   * Pasar de un inventario numérico global a estaciones físicas con capacidad (ej. solo 2 sartenes en la hornalla, 1 bacha de lavado). La reserva de estaciones debe ser una precondición en la subasta.
4. **Coordinación multi-agente en tareas compuestas (Assembly & Hand-off):**
   * Platos complejos requieren cadenas de producción secuenciales (picar $\rightarrow$ cocinar $\rightarrow$ emplatar $\rightarrow$ servir). Se debe implementar dependencias entre tareas (*task graphs/DAGs*) para coordinar traspasos (*hand-offs*) entre cocineros y camareros.
5. **Personalidad y fatiga a largo plazo:**
   * Introducir rasgos de personalidad (tolerancia al estrés, afinidad social) y desgaste moral que modulen las curvas sigmoides con el transcurso de la jornada laboral.
