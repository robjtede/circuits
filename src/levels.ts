import type { Level, LevelBoard, LevelGroup, NodePair, Point } from "./types";
import level_5_01 from "./levels/5x5/5-01.json";
import level_5_02 from "./levels/5x5/5-02.json";
import level_5_03 from "./levels/5x5/5-03.json";
import level_5_04 from "./levels/5x5/5-04.json";
import level_5_05 from "./levels/5x5/5-05.json";
import level_5_06 from "./levels/5x5/5-06.json";
import level_5_07 from "./levels/5x5/5-07.json";
import level_5_08 from "./levels/5x5/5-08.json";
import level_5_09 from "./levels/5x5/5-09.json";
import level_5_10 from "./levels/5x5/5-10.json";
import level_6_01 from "./levels/6x6/6-01.json";
import level_6_02 from "./levels/6x6/6-02.json";
import level_6_03 from "./levels/6x6/6-03.json";
import level_6_04 from "./levels/6x6/6-04.json";
import level_6_05 from "./levels/6x6/6-05.json";
import level_6_06 from "./levels/6x6/6-06.json";
import level_6_07 from "./levels/6x6/6-07.json";
import level_6_08 from "./levels/6x6/6-08.json";
import level_6_09 from "./levels/6x6/6-09.json";
import level_6_10 from "./levels/6x6/6-10.json";
import level_7_01 from "./levels/7x7/7-01.json";
import level_7_02 from "./levels/7x7/7-02.json";
import level_7_03 from "./levels/7x7/7-03.json";
import level_7_04 from "./levels/7x7/7-04.json";
import level_7_05 from "./levels/7x7/7-05.json";
import level_7_06 from "./levels/7x7/7-06.json";
import level_7_07 from "./levels/7x7/7-07.json";
import level_7_08 from "./levels/7x7/7-08.json";
import level_7_09 from "./levels/7x7/7-09.json";
import level_7_10 from "./levels/7x7/7-10.json";
import level_8_01 from "./levels/8x8/8-01.json";
import level_8_02 from "./levels/8x8/8-02.json";
import level_8_03 from "./levels/8x8/8-03.json";
import level_8_04 from "./levels/8x8/8-04.json";
import level_8_05 from "./levels/8x8/8-05.json";
import level_8_06 from "./levels/8x8/8-06.json";
import level_8_07 from "./levels/8x8/8-07.json";
import level_8_08 from "./levels/8x8/8-08.json";
import level_8_09 from "./levels/8x8/8-09.json";
import level_8_10 from "./levels/8x8/8-10.json";
import level_9_01 from "./levels/9x9/9-01.json";
import level_9_02 from "./levels/9x9/9-02.json";
import level_9_03 from "./levels/9x9/9-03.json";
import level_9_04 from "./levels/9x9/9-04.json";
import level_9_05 from "./levels/9x9/9-05.json";
import level_9_06 from "./levels/9x9/9-06.json";
import level_9_07 from "./levels/9x9/9-07.json";
import level_9_08 from "./levels/9x9/9-08.json";
import level_9_09 from "./levels/9x9/9-09.json";
import level_9_10 from "./levels/9x9/9-10.json";
import level_10_01 from "./levels/10x10/10-01.json";
import level_10_02 from "./levels/10x10/10-02.json";
import level_10_03 from "./levels/10x10/10-03.json";
import level_10_04 from "./levels/10x10/10-04.json";
import level_10_05 from "./levels/10x10/10-05.json";
import level_10_06 from "./levels/10x10/10-06.json";
import level_10_07 from "./levels/10x10/10-07.json";
import level_10_08 from "./levels/10x10/10-08.json";
import level_10_09 from "./levels/10x10/10-09.json";
import level_10_10 from "./levels/10x10/10-10.json";
import level_11_01 from "./levels/11x11/11-01.json";
import level_11_02 from "./levels/11x11/11-02.json";
import level_11_03 from "./levels/11x11/11-03.json";
import level_11_04 from "./levels/11x11/11-04.json";
import level_11_05 from "./levels/11x11/11-05.json";
import level_11_06 from "./levels/11x11/11-06.json";
import level_11_07 from "./levels/11x11/11-07.json";
import level_11_08 from "./levels/11x11/11-08.json";
import level_11_09 from "./levels/11x11/11-09.json";
import level_11_10 from "./levels/11x11/11-10.json";

export var colors: string[] = [
  "red",
  "blue",
  "yellow",
  "purple",
  "cyan",
  "rgb(255,100,200)",
  "grey",
  "white",
  "orange",
  "brown",
  "green",
  "rgb(50,255,20)",
  "rgb(255,0,128)",
  "rgb(0,170,255)",
  "rgb(180,255,0)",
  "rgb(255,160,0)",
  "rgb(0,230,170)",
  "rgb(190,130,255)",
  "rgb(255,80,80)",
  "rgb(120,210,255)",
  "rgb(220,220,80)",
  "rgb(255,120,220)",
];

export var levelGroups: LevelGroup[] = groupLevels([
  level_5_01,
  level_5_02,
  level_5_03,
  level_5_04,
  level_5_05,
  level_5_06,
  level_5_07,
  level_5_08,
  level_5_09,
  level_5_10,
  level_6_01,
  level_6_02,
  level_6_03,
  level_6_04,
  level_6_05,
  level_6_06,
  level_6_07,
  level_6_08,
  level_6_09,
  level_6_10,
  level_7_01,
  level_7_02,
  level_7_03,
  level_7_04,
  level_7_05,
  level_7_06,
  level_7_07,
  level_7_08,
  level_7_09,
  level_7_10,
  level_8_01,
  level_8_02,
  level_8_03,
  level_8_04,
  level_8_05,
  level_8_06,
  level_8_07,
  level_8_08,
  level_8_09,
  level_8_10,
  level_9_01,
  level_9_02,
  level_9_03,
  level_9_04,
  level_9_05,
  level_9_06,
  level_9_07,
  level_9_08,
  level_9_09,
  level_9_10,
  level_10_01,
  level_10_02,
  level_10_03,
  level_10_04,
  level_10_05,
  level_10_06,
  level_10_07,
  level_10_08,
  level_10_09,
  level_10_10,
  level_11_01,
  level_11_02,
  level_11_03,
  level_11_04,
  level_11_05,
  level_11_06,
  level_11_07,
  level_11_08,
  level_11_09,
  level_11_10,
]);

function groupLevels(rawLevels: unknown[]): LevelGroup[] {
  var groups: LevelGroup[] = [];
  var groupBySize = new Map<number, Level[]>();

  rawLevels.forEach(function (rawLevel) {
    var nextLevel = normalizeLevel(rawLevel);
    var levels = groupBySize.get(nextLevel.size);

    if (!levels) {
      levels = [];
      groupBySize.set(nextLevel.size, levels);
    }

    levels.push(nextLevel);
  });

  Array.from(groupBySize.keys())
    .sort(function (a, b) {
      return a - b;
    })
    .forEach(function (size) {
      var levels = groupBySize.get(size) || [];

      if (levels.length !== 10) {
        throw new Error(size + "x" + size + " must contain exactly 10 levels");
      }

      groups.push({
        id: String(size),
        name: size + "x" + size,
        levels: levels.sort(compareLevels),
      });
    });

  return groups;
}

function compareLevels(a: Level, b: Level): number {
  return a.id.localeCompare(b.id);
}

function normalizeLevel(rawLevel: unknown): Level {
  if (!isRecord(rawLevel)) {
    throw new Error("Level data must be an object");
  }

  var id = rawLevel.id;
  var name = rawLevel.name;
  var size = rawLevel.size;
  var nodes = rawLevel.nodes;

  if (typeof id !== "string" || typeof name !== "string") {
    throw new Error("Level data requires string id and name");
  }

  if (typeof size !== "number" || !Number.isInteger(size) || size < 2) {
    throw new Error(id + " requires a valid board size");
  }

  if (!Array.isArray(nodes) || nodes.length > colors.length) {
    throw new Error(id + " requires a valid node pair list");
  }

  var levelId = id;
  var levelName = name;
  var boardSize = size;

  return {
    id: levelId,
    name: levelName,
    size: boardSize,
    nodes: nodes.map(function (pair, pairIndex) {
      return normalizeNodePair(boardSize, levelId, pair, pairIndex);
    }),
  };
}

function normalizeNodePair(
  size: number,
  levelId: string,
  pair: unknown,
  pairIndex: number,
): NodePair {
  if (!Array.isArray(pair) || pair.length !== 2) {
    throw new Error(
      levelId + " pair " + (pairIndex + 1) + " must contain two nodes",
    );
  }

  var nodes = pair.map(function (node) {
    return normalizePoint(size, levelId, node);
  }) as NodePair;
  var distance = Math.max(
    Math.abs(nodes[0].x - nodes[1].x),
    Math.abs(nodes[0].y - nodes[1].y),
  );

  if (distance <= 1) {
    throw new Error(levelId + " contains adjacent endpoints");
  }

  return nodes;
}

function normalizePoint(size: number, levelId: string, node: unknown): Point {
  if (!isRecord(node)) {
    throw new Error(levelId + " contains an invalid endpoint");
  }

  var x = node.x;
  var y = node.y;

  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= size ||
    y < 0 ||
    y >= size
  ) {
    throw new Error(levelId + " contains an endpoint outside the board");
  }

  return { x: x, y: y };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function cloneLevel(level: Level): LevelBoard {
  return {
    size: level.size,
    nodes: level.nodes.map(function (pair) {
      return pair.map(function (node) {
        return { x: node.x, y: node.y };
      }) as NodePair;
    }),
  };
}
