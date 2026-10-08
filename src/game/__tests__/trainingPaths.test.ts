import { describe, expect, it } from "vitest";
import { STAGES, stageById } from "../stages";
import { inTrainingOrder, nextOnPath, pathProgress, pathsWith, READY_STARS, TRAINING_PATHS, trainingPathById } from "../trainingPaths";
import { isStageUnlocked } from "../unlocks";

describe("training paths", () => {
  it("puts every level on a test path and a topic path", () => {
    for (const s of STAGES) {
      const groups = pathsWith(s.id).map((p) => p.group).sort();
      expect(groups, s.id).toEqual(["exam", "topic"]);
    }
  });

  it("orders each path so a level comes after what it builds on", () => {
    for (const path of TRAINING_PATHS) {
      path.stages.forEach((id, i) => {
        for (const r of stageById(id)!.requires) {
          const at = path.stages.indexOf(r);
          if (at >= 0) expect(at, `${path.id}: ${r} before ${id}`).toBeLessThan(i);
        }
      });
    }
  });

  it("keeps younger years first on a topic path", () => {
    const order = inTrainingOrder(STAGES.filter((s) => s.path === "geometri")).map((id) => stageById(id)!.grade);
    expect(order[0]).toBe("ak1-3");
    expect(order.at(-1)).toBe("gy");
  });

  it("starts from nothing at an open level on every path", () => {
    for (const path of TRAINING_PATHS) {
      const next = nextOnPath(path, {});
      expect(next, path.id).not.toBeNull();
      expect(isStageUnlocked(next!, {}), path.id).toBe(true);
    }
    expect(nextOnPath(trainingPathById("exam-ak3")!, {})).toBe("1.1.1");
  });

  it("walks a path to the end, one level at a time", () => {
    for (const path of TRAINING_PATHS) {
      const stars: Partial<Record<string, 1 | 2 | 3>> = {};
      for (let i = 0; i < 300; i++) {
        const next = nextOnPath(path, stars);
        if (!next || (stars[next] ?? 0) >= READY_STARS) break;
        stars[next] = READY_STARS;
      }
      const { ready, total } = pathProgress(path, stars);
      expect(ready, path.id).toBe(total);
    }
  });
});
