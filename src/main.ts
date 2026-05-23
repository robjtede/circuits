import "./styles.css";

type Cell = [number, number];
type Point = { x: number; y: number };
type NodePair = [Point, Point];
type CellPair = [Cell, Cell];
type PathMode =
  | "rows"
  | "columns"
  | "rows-rotated"
  | "columns-rotated"
  | "rows-reversed"
  | "columns-reversed"
  | "spiral"
  | "spiral-reversed"
  | "spiral-rotated"
  | "spiral-rotated-reversed"
  | "comb"
  | "comb-reversed"
  | "comb-rotated"
  | "comb-rotated-reversed";
type LevelRecipe = { mode: PathMode; lengths: number[] };
type Level = { id: string; name: string; size: number; nodes: NodePair[] };
type LevelGroup = { id: string; name: string; levels: Level[] };
type LevelBoard = Pick<Level, "size" | "nodes">;
type Circuit = { color: string; points: Point[] };
type CircuitPosition = { circuit: number; pos: number };

declare global {
  interface Array<T> {
    first(): T | undefined;
    last(): T | undefined;
  }
}

var app = document.createElement("main");
var toolbar = document.createElement("div");
var playArea = document.createElement("div");
var groupLabel = document.createElement("label");
var groupSelect = document.createElement("select");
var levelSidebar = document.createElement("aside");
var levelSidebarTitle = document.createElement("h2");
var levelList = document.createElement("div");
var progressStatus = document.createElement("p");
var nextButton = document.createElement("button");
var resetButton = document.createElement("button");
var canvas = document.createElement("canvas");

app.className = "game";
toolbar.className = "toolbar";
playArea.className = "play-area";
groupLabel.textContent = "Size";
groupLabel.htmlFor = "group-select";
groupSelect.id = "group-select";
levelSidebar.className = "level-sidebar";
levelSidebarTitle.className = "level-sidebar-title";
levelSidebarTitle.textContent = "Levels";
levelList.className = "level-list";
progressStatus.className = "progress-status";
nextButton.type = "button";
nextButton.textContent = "Next";
resetButton.type = "button";
resetButton.textContent = "Reset";

groupLabel.appendChild(groupSelect);
levelSidebar.append(levelSidebarTitle, levelList);
toolbar.append(groupLabel, progressStatus, nextButton, resetButton);
playArea.append(levelSidebar, canvas);
app.append(toolbar, playArea);
document.body.appendChild(app);

var maybeCtx = canvas.getContext("2d");
if (!maybeCtx) throw new Error("Canvas 2D context is unavailable");
var ctx: CanvasRenderingContext2D = maybeCtx;

var resizeObserver: ResizeObserver | undefined;

// initialize vars
var w: number;
var h: number;
var size: number;
var cellSize: number;
var down: boolean;
var touchId: number | undefined;
var proposedCircuitColor: string | false | undefined;
var proposedCircuitEnd: boolean | undefined;
var availableCells: number;
var circuitsComplete: boolean | undefined;
var cellProportion: number;
var proportionFilled: number;
var currentGroupIndex: number;
var currentLevelIndex: number;
var completed: boolean;

var colors: string[] = [
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

var levelGroups: LevelGroup[] = [
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

currentGroupIndex = 0;
currentLevelIndex = 0;
var board: LevelBoard = cloneLevel(currentLevel());

var prevCircuits: Circuit[] = []; // last state of circuits - background drawing
var currentCircuits: Circuit[] = []; // dynamic current state of circuits - foreground drawing
var proposedCircuit: Point[] = []; // circuit being drawn
var storagePrefix = "circuits.progress.";
var completionStoragePrefix = "circuits.completed.";

/**
 * @param {PathMode} mode
 * @param {number[]} lengths
 * @returns {LevelRecipe}
 */
function recipe(mode: PathMode, lengths: number[]): LevelRecipe {
  return { mode: mode, lengths: lengths };
}

/**
 * @param {number} size
 * @param {LevelRecipe[]} recipes
 * @returns {LevelGroup}
 */
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

/**
 * @param {number} size
 * @param {number} index
 * @param {LevelRecipe} levelRecipe
 * @returns {Level}
 */
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

/**
 * @param {number} number
 * @returns {string}
 */
function padLevelNumber(number: number): string {
  return String(number).padStart(2, "0");
}

/**
 * @param {number} size
 * @param {PathMode} mode
 * @returns {Cell[]}
 */
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

/**
 * @param {number} size
 * @param {Cell[]} path
 * @param {PathMode} mode
 * @returns {void}
 */
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

/**
 * @param {number} size
 * @param {Cell[]} segment
 * @param {string} label
 * @returns {void}
 */
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

/**
 * @param {number} size
 * @returns {Cell[]}
 */
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

/**
 * @param {number} size
 * @returns {Cell[]}
 */
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

/**
 * @param {number} size
 * @returns {Cell[]}
 */
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

/**
 * @param {number} size
 * @returns {Cell[]}
 */
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

/**
 * @param {string} id
 * @param {string} name
 * @param {number} size
 * @param {CellPair[]} pairs
 * @returns {Level}
 */
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

/**
 * @returns {LevelGroup}
 */
function currentGroup(): LevelGroup {
  return levelGroups[currentGroupIndex];
}

/**
 * @returns {Level}
 */
function currentLevel(): Level {
  return currentGroup().levels[currentLevelIndex];
}

/**
 * @returns {string}
 */
function storageKey(): string {
  return progressStorageKey(currentGroup().id, currentLevel().id);
}

/**
 * @param {string} groupId
 * @param {string} levelId
 * @returns {string}
 */
function progressStorageKey(groupId: string, levelId: string): string {
  return storagePrefix + groupId + "." + levelId;
}

/**
 * @param {string} groupId
 * @param {string} levelId
 * @returns {string}
 */
function completionStorageKey(level: LevelBoard): string {
  return completionStoragePrefix + sha256(gridFingerprint(level));
}

function gridFingerprint(level: LevelBoard): string {
  var pairs = level.nodes
    .map(function (pair) {
      return [nodeFingerprint(pair[0]), nodeFingerprint(pair[1])]
        .sort()
        .join("-");
    })
    .sort();

  return "size:" + level.size + ";nodes:" + pairs.join("|");
}

function nodeFingerprint(point: Point): string {
  return point.x + "," + point.y;
}

function sha256(message: string): string {
  var bytes = new TextEncoder().encode(message);
  var hash = new Uint32Array(8);
  var k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  hash.set([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);

  var bitLength = bytes.length * 8;
  var paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  var padded = new Uint8Array(paddedLength);
  var words = new Uint32Array(64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  for (var i = 0; i < 8; i++) {
    padded[paddedLength - 1 - i] = Math.floor(bitLength / 2 ** (i * 8)) & 0xff;
  }

  for (var chunk = 0; chunk < padded.length; chunk += 64) {
    for (var word = 0; word < 16; word++) {
      var offset = chunk + word * 4;
      words[word] =
        (padded[offset] << 24) |
        (padded[offset + 1] << 16) |
        (padded[offset + 2] << 8) |
        padded[offset + 3];
    }

    for (var wordIndex = 16; wordIndex < 64; wordIndex++) {
      var s0 =
        rotateRight(words[wordIndex - 15], 7) ^
        rotateRight(words[wordIndex - 15], 18) ^
        (words[wordIndex - 15] >>> 3);
      var s1 =
        rotateRight(words[wordIndex - 2], 17) ^
        rotateRight(words[wordIndex - 2], 19) ^
        (words[wordIndex - 2] >>> 10);
      words[wordIndex] =
        (words[wordIndex - 16] + s0 + words[wordIndex - 7] + s1) >>> 0;
    }

    var a = hash[0];
    var b = hash[1];
    var c = hash[2];
    var d = hash[3];
    var e = hash[4];
    var f = hash[5];
    var g = hash[6];
    var h = hash[7];

    for (var round = 0; round < 64; round++) {
      var bigS1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      var ch = (e & f) ^ (~e & g);
      var temp1 = (h + bigS1 + ch + k[round] + words[round]) >>> 0;
      var bigS0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = (bigS0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  return Array.from(hash)
    .map(function (value) {
      return value.toString(16).padStart(8, "0");
    })
    .join("");
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/**
 * @param {Circuit[]} circuits
 * @returns {Circuit[]}
 */
function cloneCircuits(circuits: Circuit[]): Circuit[] {
  return circuits.map(function (circuit) {
    return {
      color: circuit.color,
      points: circuit.points.map(function (point) {
        return { x: point.x, y: point.y };
      }),
    };
  });
}

/**
 * @returns {void}
 */
function saveCurrentProgress() {
  try {
    if (prevCircuits.length === 0) {
      localStorage.removeItem(storageKey());
      return;
    }

    localStorage.setItem(
      storageKey(),
      JSON.stringify({
        version: 1,
        circuits: cloneCircuits(prevCircuits),
      }),
    );
  } catch (e) {}
}

/**
 * @returns {void}
 */
function clearSavedProgress() {
  try {
    localStorage.removeItem(storageKey());
  } catch (e) {}
}

/**
 * @returns {void}
 */
function saveCurrentCompletion() {
  try {
    localStorage.setItem(completionStorageKey(currentLevel()), "1");
  } catch (e) {}
}

/**
 * @param {Level} level
 * @returns {boolean}
 */
function isLevelCompleted(level: Level): boolean {
  try {
    if (localStorage.getItem(completionStorageKey(level)) === "1") {
      return true;
    }

    return isSavedProgressComplete(level);
  } catch (e) {
    return false;
  }
}

/**
 * @param {Level} level
 * @returns {boolean}
 */
function isSavedProgressComplete(level: Level): boolean {
  try {
    var saved = JSON.parse(
      localStorage.getItem(progressStorageKey(currentGroup().id, level.id)) ||
        "null",
    );

    if (!saved || !Array.isArray(saved.circuits)) return false;

    var total = saved.circuits.reduce(function (sum: number, circuit: any) {
      if (!circuit || !Array.isArray(circuit.points)) return sum;

      return sum + circuit.points.length;
    }, 0);

    return total === level.size * level.size;
  } catch (e) {
    return false;
  }
}

/**
 * @returns {void}
 */
function loadSavedProgress(): void {
  try {
    var saved = JSON.parse(localStorage.getItem(storageKey()) || "null");

    if (!saved || !Array.isArray(saved.circuits)) return;

    prevCircuits = saved.circuits
      .map(function (circuit: any) {
        return sanitizeSavedCircuit(circuit);
      })
      .filter(isCircuit);
    currentCircuits = cloneCircuits(prevCircuits);
  } catch (e) {
    prevCircuits = [];
    currentCircuits = [];
  }
}

/**
 * @param {any} circuit
 * @returns {Circuit | false}
 */
function sanitizeSavedCircuit(circuit: any): Circuit | false {
  var colorIndex = colors.indexOf(circuit.color);

  if (
    colorIndex < 0 ||
    colorIndex >= board.nodes.length ||
    !Array.isArray(circuit.points) ||
    circuit.points.length === 0
  ) {
    return false;
  }

  var points: Point[] = [];

  for (var i = 0; i < circuit.points.length; i++) {
    var point = circuit.points[i];

    if (!isValidSavedPoint(point)) return false;

    var nextPoint = { x: point.x, y: point.y };

    if (
      points.length > 0 &&
      !isAdjacent(points[points.length - 1], nextPoint)
    ) {
      return false;
    }

    points.push(nextPoint);
  }

  return { color: circuit.color, points: points };
}

/**
 * @param {any} point
 * @returns {boolean}
 */
function isValidSavedPoint(point: any): point is Point {
  return (
    point &&
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.x < board.size &&
    point.y >= 0 &&
    point.y < board.size
  );
}

/**
 * @param {Level} level
 * @returns {Level}
 */
function cloneLevel(level: Level): LevelBoard {
  return {
    size: level.size,
    nodes: level.nodes.map(function (pair) {
      return pair.map(function (node) {
        return { x: node.x, y: node.y };
      }) as NodePair;
    }),
  };
}

function isCircuit(circuit: Circuit | false): circuit is Circuit {
  return circuit !== false;
}

/**
 * @returns {void}
 */
function populateGroupSelect() {
  groupSelect.textContent = "";

  levelGroups.forEach(function (group) {
    var option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    groupSelect.appendChild(option);
  });
}

/**
 * @returns {void}
 */
function populateLevelList() {
  levelList.textContent = "";

  currentGroup().levels.forEach(function (level, index) {
    var button = document.createElement("button");
    var name = document.createElement("span");
    var checkmark = document.createElement("span");
    var isCurrent = index === currentLevelIndex;
    var isComplete = isLevelCompleted(level);

    button.type = "button";
    button.className = "level-button";
    button.dataset.levelId = level.id;
    button.dataset.levelIndex = String(index);
    button.setAttribute(
      "aria-label",
      level.name + (isComplete ? " complete" : ""),
    );
    if (isCurrent) {
      button.classList.add("is-current");
      button.setAttribute("aria-current", "true");
    }
    if (isComplete) button.classList.add("is-complete");

    name.className = "level-button-name";
    name.textContent = level.name;
    checkmark.className = "level-button-check";
    checkmark.textContent = isComplete ? "✓" : "";
    checkmark.setAttribute("aria-hidden", "true");

    button.append(name, checkmark);
    button.addEventListener("click", function () {
      selectLevel(level.id);
    });
    levelList.appendChild(button);
  });
}

/**
 * @param {string} groupId
 * @returns {void}
 */
function selectGroup(groupId: string): void {
  var nextGroupIndex = levelGroups.findIndex(function (candidate) {
    return candidate.id === groupId;
  });

  currentGroupIndex = nextGroupIndex === -1 ? 0 : nextGroupIndex;
  currentLevelIndex = 0;
  groupSelect.value = currentGroup().id;
  board = cloneLevel(currentLevel());
  openLevel();
}

/**
 * @param {string} levelId
 * @returns {void}
 */
function selectLevel(levelId: string): void {
  var nextLevelIndex = currentGroup().levels.findIndex(function (candidate) {
    return candidate.id === levelId;
  });
  currentLevelIndex = nextLevelIndex === -1 ? 0 : nextLevelIndex;

  board = cloneLevel(currentLevel());
  openLevel();
}

/**
 * @returns {void}
 */
function openLevel() {
  down = false;
  touchId = undefined;
  completed = false;
  prevCircuits = [];
  currentCircuits = [];
  proposedCircuit = [];
  loadSavedProgress();
  init();
  completed = Math.round(proportionFilled * 100) === 100;
  updateControls();
  populateLevelList();
  if (completed) drawCompletionMessage();
}

/**
 * @returns {void}
 */
function resetGame() {
  clearSavedProgress();
  openLevel();
}

/**
 * @returns {void}
 */
function nextLevel() {
  currentLevelIndex++;

  if (currentLevelIndex >= currentGroup().levels.length) {
    currentGroupIndex = (currentGroupIndex + 1) % levelGroups.length;
    currentLevelIndex = 0;
    groupSelect.value = currentGroup().id;
  }

  board = cloneLevel(currentLevel());
  openLevel();
}

/**
 * @returns {void}
 */
function updateControls() {
  var levelNumber = currentLevelIndex + 1;
  var isLastInGroup = currentLevelIndex === currentGroup().levels.length - 1;

  progressStatus.textContent =
    currentGroup().name +
    " level " +
    levelNumber +
    " of " +
    currentGroup().levels.length +
    (completed ? " complete" : "");
  nextButton.textContent = isLastInGroup ? "Next Size" : "Next";
  nextButton.disabled = !completed;
}

/**
 * @returns {void}
 */
function completeLevel() {
  if (completed) return;

  completed = true;
  saveCurrentCompletion();
  updateControls();
  populateLevelList();
  drawCompletionMessage();
}

/**
 * @returns {void}
 */
function clear(): void {
  ctx.clearRect(0, 0, w, h);
} // clear()

/**
 * @template T
 * @this {T[]}
 * @returns {T | undefined}
 */
Array.prototype.last = function () {
  var len = this.length;
  var last = this[len - 1];

  return last;
}; // Array.last()

/**
 * @template T
 * @this {T[]}
 * @returns {T | undefined}
 */
Array.prototype.first = function () {
  var last = this[0];

  return last;
}; // Array.first()

/**
 * @param {unknown} [cells]
 * @returns {void}
 */
function drawGrid(cells?: unknown): void {
  for (var i = 0; i <= board.size; i++) {
    // vertical lines
    ctx.save();
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(w / 2 - size / 2 + i * cellSize, h / 2 - size / 2);
    ctx.lineTo(w / 2 - size / 2 + i * cellSize, h / 2 + size / 2);
    ctx.stroke();
    ctx.restore();

    // horizontal lines
    ctx.save();
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(w / 2 - size / 2, h / 2 - size / 2 + i * cellSize);
    ctx.lineTo(w / 2 + size / 2, h / 2 - size / 2 + i * cellSize);
    ctx.stroke();
    ctx.restore();
  } // for i
} // grid()

/**
 * @returns {void}
 */
function drawNodes(): void {
  board.nodes.forEach(function (val, index) {
    drawNode(val[0].x, val[0].y, colors[index]);
    drawNode(val[1].x, val[1].y, colors[index]);
  }); // nodes forEach
} // drawNodes()

/**
 * @param {number} x
 * @param {number} y
 * @param {string} [color]
 * @returns {void}
 */
function drawNode(x: number, y: number, color = "white"): void {
  var pos = centerPos(x, y);

  ctx.save();
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, cellSize / 2.5, 0, Math.PI * 2, false);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
} // drawNode()

/**
 * @param {number} cx
 * @param {number} cy
 * @returns {Point}
 */
function centerPos(cx: number, cy: number): Point {
  var x = w / 2 - size / 2 + cx * cellSize + cellSize / 2;
  var y = h / 2 - size / 2 + cy * cellSize + cellSize / 2;

  return { x: x, y: y };
} // centerPos()

/**
 * @param {number} cx
 * @param {number} cy
 * @returns {Point}
 */
function topLeftPos(cx: number, cy: number): Point {
  var x = w / 2 - size / 2 + cx * cellSize;
  var y = h / 2 - size / 2 + cy * cellSize;

  return { x: x, y: y };
} // centerPos()

/**
 * @param {number} cx
 * @param {number} cy
 * @returns {Point}
 */
function posToCell(cx: number, cy: number): Point {
  var canvasRect = ctx.canvas.getBoundingClientRect();
  var x = cx - canvasRect.left;
  var y = cy - canvasRect.top;

  x -= w / 2 - size / 2;
  x /= cellSize;
  x = Math.floor(x);

  y -= h / 2 - size / 2;
  y /= cellSize;
  y = Math.floor(y);

  if (x < 0) throw new Error("x result is less than 0");
  if (x > board.size - 1) throw new Error("x result is greater than board");
  if (y < 0) throw new Error("y result is less than 0");
  if (y > board.size - 1) throw new Error("y result is greater than board");

  return { x: x, y: y };
} // posToCell()

/**
 * @param {Point} c1
 * @param {Point} c2
 * @returns {boolean}
 */
function compareCoords(c1: Point | undefined, c2: Point | undefined): boolean {
  if (!c1 || !c2) return false;
  if (c1.x !== c2.x) return false;
  if (c1.y !== c2.y) return false;
  return true;
} // compareCoords()

/**
 * @param {Point} c1
 * @param {Point} c2
 * @returns {boolean}
 */
function isAdjacent(c1: Point | undefined, c2: Point | undefined): boolean {
  if (!c1 || !c2) return false;
  if (
    (c2.x == c1.x + 1 && c2.y == c1.y) ||
    (c2.x == c1.x - 1 && c2.y == c1.y) ||
    (c2.x == c1.x && c2.y == c1.y + 1) ||
    (c2.x == c1.x && c2.y == c1.y - 1)
  )
    return true;

  return false;
} // isAdjacent()

/**
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function isNode(x: number, y: number): boolean {
  var found = false;

  board.nodes.forEach(function (val, index) {
    if (val[0].x == x && val[0].y == y) found = true;
    if (val[1].x == x && val[1].y == y) found = true;
  });

  return found;
} // isNode()

/**
 * @param {number} x
 * @param {number} y
 * @returns {string | false}
 */
function nodeColor(x: number, y: number): string | false {
  var found: string | false = false;

  board.nodes.forEach(function (val, index) {
    if (val[0].x == x && val[0].y == y) found = colors[index];
    if (val[1].x == x && val[1].y == y) found = colors[index];
  });

  return found;
} // nodeColor()

/**
 * @returns {void}
 */
function drawProposedCircuit() {
  try {
    if (proposedCircuit.length === 0) throw new Error("proposed circuit empty");
    if (!proposedCircuitColor) throw new Error("proposed circuit color empty");

    ctx.save();
    ctx.strokeStyle = proposedCircuitColor;
    ctx.lineWidth = cellSize * 0.3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    var pos = centerPos(proposedCircuit[0].x, proposedCircuit[0].y);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    proposedCircuit.forEach(function (val, index) {
      var center = centerPos(val.x, val.y);

      ctx.lineTo(center.x, center.y);
    });

    ctx.stroke();
    ctx.restore();
  } catch (e) {}
} // drawProposedCircuit()

/**
 * @returns {void}
 */
function drawCircuits() {
  try {
    if (currentCircuits.length === 0) throw new Error("circuits empty");

    ctx.save();
    ctx.lineWidth = cellSize * 0.3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    currentCircuits.forEach(function (circuit, circuitIndex) {
      var move = centerPos(circuit.points[0].x, circuit.points[0].y);

      ctx.strokeStyle = circuit.color;

      ctx.beginPath();
      ctx.moveTo(move.x, move.y);

      circuit.points.forEach(function (point, pointIndex) {
        var center = centerPos(point.x, point.y);

        ctx.lineTo(center.x, center.y);
      });

      ctx.stroke();
    });

    ctx.restore();

    prevCircuits.forEach(function (circuit, circuitIndex) {
      ctx.fillStyle = circuit.color;

      circuit.points.forEach(function (point, pointIndex) {
        var topleft = topLeftPos(point.x, point.y);

        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillRect(topleft.x, topleft.y, cellSize, cellSize);
        ctx.restore();
      });
    });
  } catch (e) {}
} // drawCircuits()

/**
 * @returns {void}
 */
function drawCompletionMessage() {
  ctx.save();
  ctx.fillStyle = "white";
  ctx.font = Math.round(Math.min(w, h) * 0.1) + "px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WELL DONE", w / 2, h / 2);
  ctx.restore();
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function isMatchingNode(x: number, y: number): boolean {
  if (!isNode(x, y)) return false; // error - not a node

  var firstNode = compareCoords({ x: x, y: y }, proposedCircuit[0]);

  if (firstNode) return false;
  if (nodeColor(x, y) == proposedCircuitColor) return true;

  return false;
} // isMatchingNode()

/**
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function isInProposedCircuit(x: number, y: number): boolean {
  var found = false;

  proposedCircuit.forEach(function (val, index) {
    var compare = compareCoords(val, { x: x, y: y });

    if (compare) found = true;
  });

  return found;
} // posInProposedCircuit()

/**
 * @param {number} x
 * @param {number} y
 * @returns {CircuitPosition | false}
 */
function posInCircuits(x: number, y: number): CircuitPosition | false {
  var found: CircuitPosition | false = false;

  currentCircuits.forEach(function (circuit, circuitIndex) {
    circuit.points.forEach(function (point, posIndex) {
      var compare = compareCoords(point, { x: x, y: y });
      if (compare) found = { circuit: circuitIndex, pos: posIndex };
    });
  });

  return found;
} // posInCircuits()

/**
 * @param {string | false | undefined} color
 * @returns {number | false}
 */
function colorInCircuits(color: string | false | undefined): number | false {
  var found: number | false = false;

  currentCircuits.forEach(function (circuit, circuitIndex) {
    var compare = color === circuit.color;
    if (compare) found = circuitIndex;
  });

  return found;
} // colorInCircuits()

/**
 * @param {number} x
 * @param {number} y
 * @returns {number | false}
 */
function posInProposedCircuit(x: number, y: number): number | false {
  // if (proposedCircuit.length == 2) return false;
  var found: number | false = false;

  proposedCircuit.forEach(function (val, index) {
    var compare = compareCoords(val, { x: x, y: y });

    if (compare) found = index;
  });

  return found;
} // isInProposedCircuit()

/**
 * @returns {CircuitPosition[] | false}
 */
function anyProposedInCurrentCircuits(): CircuitPosition[] | false {
  var slices: CircuitPosition[] = [];

  for (var i = 0; i < proposedCircuit.length; i++) {
    for (var j = 0; j < currentCircuits.length; j++) {
      var compare = false;
      for (var k = 0; k < currentCircuits[j].points.length; k++) {
        compare = compareCoords(
          proposedCircuit[i],
          currentCircuits[j].points[k],
        );

        if (compare) {
          slices.push({ circuit: j, pos: k });
          break;
        }
      } // for k

      if (compare) {
        break;
      }
    } // for j
  } // for i

  if (slices.length === 0) return false;
  return slices;
} // anyProposedInCurrentCircuits()

/**
 * @returns {void}
 */
function backupCircuits() {
  prevCircuits = [];
  var newCircuits: Circuit[] = [];

  currentCircuits.forEach(function (circuit, circuitIndex) {
    newCircuits.push({ color: circuit.color, points: [] });
    circuit.points.forEach(function (point, pointIndex) {
      newCircuits[newCircuits.length - 1].points[pointIndex] = point;
    });
  });

  prevCircuits = newCircuits;

  proposedCircuitColor = undefined;
  proposedCircuitEnd = undefined;
  proposedCircuit = [];
} // backupCircuits()

/**
 * @returns {void}
 */
function restoreCircuits() {
  currentCircuits = [];
  var newCircuits: Circuit[] = [];

  for (var i = 0, j = prevCircuits.length; i < j; i++) {
    if (prevCircuits[i].color === proposedCircuitColor) {
      prevCircuits.splice(i, 1);
      j--;
    }
  }

  for (var i = 0, j = prevCircuits.length; i < j; i++) {
    newCircuits.push({ color: prevCircuits[i].color, points: [] });

    prevCircuits[i].points.forEach(function (point, pointIndex) {
      newCircuits[newCircuits.length - 1].points[pointIndex] = point;
    });
  }

  currentCircuits = newCircuits;
} // restoreCircuits()

/**
 * @returns {number}
 */
function calculateProportionFilled(): number {
  var total = 0;

  prevCircuits.forEach(function (val, index) {
    total += val.points.length;
  });

  total += proposedCircuit.length;

  total *= cellProportion;

  return total;
} // calculateProportionFilled()

/**
 * @param {MouseEvent} event
 * @returns {false | void}
 */
function moveEvent(event: MouseEvent): false | void {
  if (!down) return false;
  event.preventDefault();

  try {
    var coords = posToCell(event.clientX, event.clientY);

    var lastPoint = proposedCircuit.last();
    var same = compareCoords(lastPoint, coords);
    var adjacent = isAdjacent(lastPoint, coords);
    var node = nodeColor(coords.x, coords.y);
    var matchingNode = isMatchingNode(coords.x, coords.y);
    var inProposedCircuit = posInProposedCircuit(coords.x, coords.y);

    if (
      !same &&
      adjacent &&
      (!node || matchingNode || node == proposedCircuitColor) &&
      (!proposedCircuitEnd || !!inProposedCircuit)
    ) {
      if (inProposedCircuit === false) {
        proposedCircuit.push(coords);
      } else {
        // handle backtracking
        proposedCircuit = proposedCircuit.slice(0, inProposedCircuit + 1);
      }

      restoreCircuits();

      // limit extra circuit from end node
      proposedCircuitEnd = matchingNode ? true : false;

      // find conflicting circuits and slice
      var posInfo = anyProposedInCurrentCircuits();
      if (posInfo !== false) {
        posInfo.forEach(function (val, index) {
          currentCircuits[val.circuit].points = currentCircuits[
            val.circuit
          ].points.slice(0, val.pos);
        });
      }

      updateBoard();
    }
  } catch (e) {}
} // moveEvent()

/**
 * @param {MouseEvent} event
 * @returns {void}
 */
function downEvent(event: MouseEvent): void {
  if (event.button !== 0) return;
  if (event.target !== ctx.canvas) return;
  event.preventDefault();

  down = true;
  completed = false;
  updateControls();

  try {
    var coords = posToCell(event.clientX, event.clientY);
    var node = nodeColor(coords.x, coords.y);
    var circuitExists = posInCircuits(coords.x, coords.y);
    if (circuitExists !== false) {
      if (node == false) {
        var circuit = currentCircuits.splice(circuitExists.circuit, 1)[0];
        proposedCircuit = circuit.points.slice(0, circuitExists.pos + 1);
        proposedCircuitColor = circuit.color;
      } else {
        proposedCircuitColor = node;
        proposedCircuit.push(coords);
      }
    } else {
      if (node == false) return;
      var colorExists = colorInCircuits(node);
      proposedCircuitColor = node;

      if (colorExists !== false) {
        currentCircuits.splice(colorExists, 1);
      }

      proposedCircuit.push(coords);
    }
  } catch (e) {
    console.warn("down event error");
  }

  restoreCircuits();
  updateBoard();
  saveCurrentProgress();
} // downEvent()

/**
 * @param {MouseEvent} event
 * @returns {void}
 */
function upEvent(event: MouseEvent): void {
  if (!down && proposedCircuit.length === 0) return;
  event.preventDefault();

  down = false;
  try {
    if (proposedCircuit.length !== 0) {
      if (proposedCircuitColor) {
        currentCircuits.push({
          color: proposedCircuitColor,
          points: proposedCircuit,
        });
      }
    }

    backupCircuits();
    updateBoard();
    saveCurrentProgress();
  } catch (e) {
    console.warn("updateBoard errored");
  }

  // game complete checks
  if (Math.round(proportionFilled * 100) === 100) {
    completeLevel();
  }
} // upEvent()

/**
 * @param {TouchEvent} event
 * @returns {false | void}
 */
function moveTouchEvent(event: TouchEvent): false | void {
  if (!down) return false;
  event.preventDefault();

  try {
    var coords: Point | undefined;

    for (var i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier == touchId) {
        coords = posToCell(event.touches[i].clientX, event.touches[i].clientY);
      }
    }

    if (!coords) return false;

    var lastPoint = proposedCircuit.last();
    var same = compareCoords(lastPoint, coords);
    var adjacent = isAdjacent(lastPoint, coords);
    var node = nodeColor(coords.x, coords.y);
    var matchingNode = isMatchingNode(coords.x, coords.y);
    var inProposedCircuit = posInProposedCircuit(coords.x, coords.y);

    if (
      !same &&
      adjacent &&
      (!node || matchingNode || node == proposedCircuitColor) &&
      (!proposedCircuitEnd || !!inProposedCircuit)
    ) {
      if (inProposedCircuit === false) {
        proposedCircuit.push(coords);
      } else {
        // handle backtracking
        proposedCircuit = proposedCircuit.slice(0, inProposedCircuit + 1);
      }

      restoreCircuits();

      // limit extra circuit from end node
      proposedCircuitEnd = matchingNode ? true : false;

      // find conflicting circuits and slice
      var posInfo = anyProposedInCurrentCircuits();
      if (posInfo !== false) {
        posInfo.forEach(function (val, index) {
          currentCircuits[val.circuit].points = currentCircuits[
            val.circuit
          ].points.slice(0, val.pos);
        });
      }

      updateBoard();
    }
  } catch (e) {}
} // moveTouchEvent()

/**
 * @param {TouchEvent} event
 * @returns {void}
 */
function downTouchEvent(event: TouchEvent): void {
  if (event.target !== ctx.canvas) return;
  event.preventDefault();

  touchId = event.touches[0].identifier;
  down = true;
  completed = false;
  updateControls();

  try {
    var coords: Point | undefined;

    for (var i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier == touchId) {
        coords = posToCell(event.touches[i].clientX, event.touches[i].clientY);
      }
    }

    if (!coords) return;

    var node = nodeColor(coords.x, coords.y);
    var circuitExists = posInCircuits(coords.x, coords.y);
    if (circuitExists !== false) {
      if (node == false) {
        var circuit = currentCircuits.splice(circuitExists.circuit, 1)[0];
        proposedCircuit = circuit.points.slice(0, circuitExists.pos + 1);
        proposedCircuitColor = circuit.color;
      } else {
        proposedCircuitColor = node;
        proposedCircuit.push(coords);
      }
    } else {
      if (node == false) return;
      var colorExists = colorInCircuits(node);
      proposedCircuitColor = node;

      if (colorExists !== false) {
        currentCircuits.splice(colorExists, 1);
      }

      proposedCircuit.push(coords);
    }
  } catch (e) {}

  restoreCircuits();
  updateBoard();
  saveCurrentProgress();
} // downTouchEvent()

/**
 * @param {TouchEvent} event
 * @returns {void}
 */
function upTouchEvent(event: TouchEvent): void {
  if (!down && proposedCircuit.length === 0) return;
  event.preventDefault();

  down = false;
  touchId = undefined;

  if (proposedCircuit.length !== 0) {
    if (proposedCircuitColor) {
      currentCircuits.push({
        color: proposedCircuitColor,
        points: proposedCircuit,
      });
    }
  }

  backupCircuits();

  try {
    updateBoard();
    saveCurrentProgress();
  } catch (e) {
    console.warn("updateBoard errored");
  }

  // game complete checks
  if (Math.round(proportionFilled * 100) === 100) {
    completeLevel();
  }
} // upTouchEvent()

/**
 * @returns {void}
 */
function updateBoard() {
  clear();
  drawGrid();
  drawNodes();
  drawCircuits();
  drawProposedCircuit();

  proportionFilled = calculateProportionFilled();
  if (completed) drawCompletionMessage();
}

/**
 * @returns {void}
 */
function resizeCanvas() {
  var canvasRect = ctx.canvas.getBoundingClientRect();
  var nextW = Math.max(1, canvasRect.width);
  var nextH = Math.max(1, canvasRect.height);
  var pixelRatio = window.devicePixelRatio || 1;

  w = nextW;
  h = nextH;
  ctx.canvas.width = Math.round(nextW * pixelRatio);
  ctx.canvas.height = Math.round(nextH * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  size = Math.min(w, h) * 0.9;

  cellSize = size / board.size;

  updateBoard();
}

/**
 * @returns {void}
 */
function init() {
  proposedCircuitColor = false;
  proposedCircuitEnd = false;

  availableCells = board.size * board.size;
  cellProportion = 1 / availableCells;

  resizeCanvas();
} // init()

populateGroupSelect();
groupSelect.value = currentGroup().id;
populateLevelList();
openLevel();

window.addEventListener("mousedown", downEvent);
window.addEventListener("mousemove", moveEvent);
window.addEventListener("mouseup", upEvent);

window.addEventListener("touchstart", downTouchEvent);
window.addEventListener("touchmove", moveTouchEvent);
window.addEventListener("touchend", upTouchEvent);
window.addEventListener("touchcancel", upTouchEvent);
resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(canvas);

groupSelect.addEventListener("change", function (event: Event) {
  var target = event.target as HTMLSelectElement;

  selectGroup(target.value);
});

resetButton.addEventListener("click", resetGame);
nextButton.addEventListener("click", nextLevel);
