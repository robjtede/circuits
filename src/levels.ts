import type {
  Cell,
  CellPair,
  Level,
  LevelBoard,
  LevelGroup,
  LevelRecipe,
  NodePair,
  PathMode,
} from "./types";

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
];

export var levelGroups: LevelGroup[] = [
  levelGroup(5, [
    recipe("rows", [5, 5, 5, 5, 5]),
    recipe("columns", [5, 5, 5, 5, 5]),
    recipe("comb", [8, 4, 4, 4, 5]),
    recipe("comb-reversed", [5, 4, 4, 4, 8]),
    recipe("comb-rotated", [8, 4, 4, 4, 5]),
    recipe("comb-rotated-reversed", [5, 4, 4, 4, 8]),
    recipe("comb", [8, 4, 4, 6, 3]),
    recipe("comb-reversed", [3, 4, 4, 4, 10]),
    recipe("rows", [6, 3, 5, 5, 6]),
    recipe("columns", [6, 3, 5, 5, 6]),
  ]),
  levelGroup(6, [
    recipe("comb", [10, 5, 5, 5, 5, 6]),
    recipe("comb-reversed", [6, 5, 5, 5, 5, 10]),
    recipe("comb-rotated", [10, 5, 5, 5, 5, 6]),
    recipe("comb-rotated-reversed", [6, 5, 5, 5, 5, 10]),
    recipe("comb", [10, 5, 5, 7, 3, 6]),
    recipe("comb-reversed", [6, 3, 5, 5, 7, 10]),
    recipe("comb-rotated", [10, 5, 5, 7, 3, 6]),
    recipe("comb-rotated-reversed", [6, 3, 5, 5, 7, 10]),
    recipe("rows", [7, 4, 6, 6, 6, 7]),
    recipe("columns", [7, 4, 6, 6, 6, 7]),
  ]),
  levelGroup(7, [
    recipe("comb", [12, 6, 6, 6, 6, 6, 7]),
    recipe("comb-reversed", [7, 6, 6, 6, 6, 6, 12]),
    recipe("comb-rotated", [12, 6, 6, 6, 6, 6, 7]),
    recipe("comb-rotated-reversed", [7, 6, 6, 6, 6, 6, 12]),
    recipe("comb", [12, 6, 6, 6, 8, 4, 7]),
    recipe("comb-reversed", [7, 4, 6, 6, 6, 8, 12]),
    recipe("comb-rotated", [12, 6, 6, 6, 8, 4, 7]),
    recipe("comb-rotated-reversed", [7, 4, 6, 6, 6, 8, 12]),
    recipe("rows", [8, 5, 7, 7, 7, 7, 8]),
    recipe("columns", [8, 5, 7, 7, 7, 7, 8]),
  ]),
  levelGroup(8, [
    recipe("rows", [9, 6, 8, 8, 8, 8, 8, 9]),
    recipe("columns", [9, 6, 8, 8, 8, 8, 8, 9]),
    recipe("rows-rotated", [9, 6, 8, 8, 8, 8, 8, 9]),
    recipe("columns-rotated", [9, 6, 8, 8, 8, 8, 8, 9]),
    recipe("rows-reversed", [9, 6, 8, 8, 8, 8, 8, 9]),
    recipe("columns-reversed", [9, 6, 8, 8, 8, 8, 8, 9]),
    recipe("rows", [9, 8, 6, 8, 8, 8, 8, 9]),
    recipe("columns", [9, 8, 6, 8, 8, 8, 8, 9]),
    recipe("rows-rotated", [9, 8, 6, 8, 8, 8, 8, 9]),
    recipe("columns-rotated", [9, 8, 6, 8, 8, 8, 8, 9]),
  ]),
  levelGroup(9, [
    recipe("rows", [10, 7, 9, 9, 9, 9, 9, 9, 10]),
    recipe("columns", [10, 7, 9, 9, 9, 9, 9, 9, 10]),
    recipe("rows-rotated", [10, 7, 9, 9, 9, 9, 9, 9, 10]),
    recipe("columns-rotated", [10, 7, 9, 9, 9, 9, 9, 9, 10]),
    recipe("rows-reversed", [10, 7, 9, 9, 9, 9, 9, 9, 10]),
    recipe("columns-reversed", [10, 7, 9, 9, 9, 9, 9, 9, 10]),
    recipe("rows", [10, 9, 7, 9, 9, 9, 9, 9, 10]),
    recipe("columns", [10, 9, 7, 9, 9, 9, 9, 9, 10]),
    recipe("rows-rotated", [10, 9, 7, 9, 9, 9, 9, 9, 10]),
    recipe("columns-rotated", [10, 9, 7, 9, 9, 9, 9, 9, 10]),
  ]),
  levelGroup(10, [
    recipe("rows", [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]),
    recipe("columns", [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]),
    recipe("rows", [11, 8, 10, 10, 10, 10, 10, 10, 10, 11]),
    recipe("columns", [11, 8, 10, 10, 10, 10, 10, 10, 10, 11]),
    recipe("rows-rotated", [11, 8, 10, 10, 10, 10, 10, 10, 10, 11]),
    recipe("columns-rotated", [11, 8, 10, 10, 10, 10, 10, 10, 10, 11]),
    recipe("rows-reversed", [11, 8, 10, 10, 10, 10, 10, 10, 10, 11]),
    recipe("columns-reversed", [11, 8, 10, 10, 10, 10, 10, 10, 10, 11]),
    recipe("rows", [11, 10, 8, 10, 10, 10, 10, 10, 10, 11]),
    recipe("columns", [11, 10, 8, 10, 10, 10, 10, 10, 10, 11]),
  ]),
];

function recipe(mode: PathMode, lengths: number[]): LevelRecipe {
  return { mode: mode, lengths: lengths };
}

function levelGroup(size: number, recipes: LevelRecipe[]): LevelGroup {
  if (recipes.length !== 10) {
    throw new Error(size + "x" + size + " must contain exactly 10 levels");
  }

  return {
    id: String(size),
    name: size + "x" + size,
    levels: recipes.map(function (levelRecipe, index) {
      return levelFromRecipe(size, index, levelRecipe);
    }),
  };
}

function levelFromRecipe(
  size: number,
  index: number,
  levelRecipe: LevelRecipe,
): Level {
  var totalLength = levelRecipe.lengths.reduce(function (sum, length) {
    return sum + length;
  }, 0);

  if (levelRecipe.lengths.length !== size || totalLength !== size * size) {
    throw new Error(
      size + "x" + size + " level " + (index + 1) + " is invalid",
    );
  }

  var path = switchbackPath(size, levelRecipe.mode);
  validateSolutionPath(size, path, levelRecipe.mode);

  var pathIndex = 0;
  var number = padLevelNumber(index + 1);
  var pairs = levelRecipe.lengths.map(function (length, pairIndex) {
    var segment = path.slice(pathIndex, pathIndex + length);
    pathIndex += length;

    validateSolutionSegment(
      size,
      segment,
      size + "x" + size + " level " + number + " pair " + (pairIndex + 1),
    );

    return [segment[0], segment[segment.length - 1]] as CellPair;
  });

  return level(size + "-" + number, "Level " + number, size, pairs);
}

function padLevelNumber(number: number): string {
  return String(number).padStart(2, "0");
}

function switchbackPath(size: number, mode: PathMode): Cell[] {
  var path: Cell[];

  if (mode.indexOf("columns") === 0) {
    path = columnSwitchback(size);
  } else if (mode.indexOf("spiral") === 0) {
    path = spiralPath(size);
  } else if (mode.indexOf("comb") === 0) {
    path = combPath(size);
  } else {
    path = rowSwitchback(size);
  }

  if (mode.indexOf("rotated") !== -1) {
    path = path.map(function (point) {
      return [size - 1 - point[1], point[0]];
    });
  }

  if (mode.indexOf("reversed") !== -1) {
    path = path.slice().reverse();
  }

  return path;
}

function validateSolutionPath(
  size: number,
  path: Cell[],
  mode: PathMode,
): void {
  var seen: Record<string, boolean> = {};

  if (path.length !== size * size) {
    throw new Error(mode + " path does not fill a " + size + "x" + size);
  }

  path.forEach(function (point, index) {
    var key = point[0] + "," + point[1];

    if (point[0] < 0 || point[0] >= size || point[1] < 0 || point[1] >= size) {
      throw new Error(mode + " path contains a cell outside the board");
    }

    if (seen[key]) {
      throw new Error(mode + " path visits " + key + " more than once");
    }

    if (index > 0) {
      var previous = path[index - 1];
      var distance =
        Math.abs(previous[0] - point[0]) + Math.abs(previous[1] - point[1]);

      if (distance !== 1) {
        throw new Error(mode + " path contains a non-adjacent step");
      }
    }

    seen[key] = true;
  });
}

function validateSolutionSegment(
  size: number,
  segment: Cell[],
  label: string,
): void {
  var cells: Record<string, boolean> = {};

  segment.forEach(function (point) {
    cells[point[0] + "," + point[1]] = true;
  });

  for (var y = 0; y < size - 1; y++) {
    for (var x = 0; x < size - 1; x++) {
      if (
        cells[x + "," + y] &&
        cells[x + 1 + "," + y] &&
        cells[x + "," + (y + 1)] &&
        cells[x + 1 + "," + (y + 1)]
      ) {
        throw new Error(label + " fills a 2x2 block");
      }
    }
  }
}

function rowSwitchback(size: number): Cell[] {
  var path: Cell[] = [];

  for (var y = 0; y < size; y++) {
    if (y % 2 === 0) {
      for (var x = 0; x < size; x++) path.push([x, y]);
    } else {
      for (var xr = size - 1; xr >= 0; xr--) path.push([xr, y]);
    }
  }

  return path;
}

function columnSwitchback(size: number): Cell[] {
  var path: Cell[] = [];

  for (var x = 0; x < size; x++) {
    if (x % 2 === 0) {
      for (var y = 0; y < size; y++) path.push([x, y]);
    } else {
      for (var yr = size - 1; yr >= 0; yr--) path.push([x, yr]);
    }
  }

  return path;
}

function spiralPath(size: number): Cell[] {
  var path: Cell[] = [];
  var left = 0;
  var right = size - 1;
  var top = 0;
  var bottom = size - 1;

  while (left <= right && top <= bottom) {
    for (var x = left; x <= right; x++) path.push([x, top]);
    top++;

    for (var y = top; y <= bottom; y++) path.push([right, y]);
    right--;

    if (top <= bottom) {
      for (var xr = right; xr >= left; xr--) path.push([xr, bottom]);
      bottom--;
    }

    if (left <= right) {
      for (var yr = bottom; yr >= top; yr--) path.push([left, yr]);
      left++;
    }
  }

  return path;
}

function combPath(size: number): Cell[] {
  var path: Cell[] = [];
  var bottom = size - 1;
  var currentY = 0;

  for (var x = 0; x < size; x++) path.push([x, 0]);

  for (var column = size - 1; column >= 0; column--) {
    if (currentY === 0 || currentY === 1) {
      for (var y = currentY + 1; y <= bottom; y++) path.push([column, y]);
      currentY = bottom;
    } else {
      for (var yr = bottom - 1; yr >= 1; yr--) path.push([column, yr]);
      currentY = 1;
    }

    if (column > 0) path.push([column - 1, currentY]);
  }

  return path;
}

function level(
  id: string,
  name: string,
  size: number,
  pairs: CellPair[],
): Level {
  if (pairs.length > colors.length) {
    throw new Error(name + " uses more pairs than there are colors");
  }

  return {
    id: id,
    name: name,
    size: size,
    nodes: pairs.map(function (pair) {
      var distance = Math.max(
        Math.abs(pair[0][0] - pair[1][0]),
        Math.abs(pair[0][1] - pair[1][1]),
      );

      if (distance <= 1) {
        throw new Error(name + " contains adjacent endpoints");
      }

      var nodes = pair.map(function (node) {
        if (node[0] < 0 || node[0] >= size || node[1] < 0 || node[1] >= size) {
          throw new Error(name + " contains an endpoint outside the board");
        }

        return { x: node[0], y: node[1] };
      });

      return nodes as NodePair;
    }),
  };
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
