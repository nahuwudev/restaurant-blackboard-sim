import { describe, expect, it } from "bun:test";
import { TaskQueue } from "../../src/tasks/task-queue";
import { makeTask } from "../helpers/factories";

describe("TaskQueue > ageTasks", () => {
  it("criterio de cierre: 50 tasks, las más viejas tienen mayor prioridad tras N ticks", () => {
    const queue = new TaskQueue();

    for (let i = 0; i < 25; i++) {
      queue.enqueue(makeTask({ difficulty: Math.ceil(Math.random() * 10) }), 0);
    }
    for (let i = 0; i < 25; i++) {
      queue.enqueue(
        makeTask({ difficulty: Math.ceil(Math.random() * 10) }),
        10,
      );
    }
    expect(queue.getAll()).toHaveLength(50);

    const [firstBatch, secondBatch] = [
      queue.getAll().slice(0, 25),
      queue.getAll().slice(25),
    ];

    queue.ageTasks(20);

    const firstIds = new Set(firstBatch.map((t) => t.task.id));
    const top25 = queue.getByPriority().slice(0, 25);

    expect(top25.every((t) => firstIds.has(t.task.id))).toBe(true);
    expect(firstBatch[0]!.priority).toBe(21); // 1 + (20 - 0)
    expect(secondBatch[0]!.priority).toBe(11); // 1 + (20 - 10)
  });
});
