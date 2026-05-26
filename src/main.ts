import "./styles.css";
import { colors, cloneLevel, levelGroups } from "./levels";
import { completionStorageKey, progressStorageKey } from "./storage";
import type {
  Cell,
  Circuit,
  CircuitPosition,
  Level,
  LevelBoard,
  LevelGroup,
  Point,
} from "./types";

var app = document.createElement("main");
var toolbar = document.createElement("div");
var playArea = document.createElement("div");
var boardArea = document.createElement("div");
var groupLabel = document.createElement("label");
var groupSelect = document.createElement("select");
var levelSidebar = document.createElement("aside");
var levelSidebarTitle = document.createElement("h2");
var levelList = document.createElement("div");
var progressStatus = document.createElement("p");
var nextButton = document.createElement("button");
var resetButton = document.createElement("button");
var canvas = document.createElement("canvas");
var completionOverlay = document.createElement("div");
var completionPanel = document.createElement("div");
var completionTitle = document.createElement("h2");
var completionActions = document.createElement("div");
var completionNextButton = document.createElement("button");
var completionCloseButton = document.createElement("button");

app.className = "game";
toolbar.className = "toolbar";
playArea.className = "play-area";
boardArea.className = "board-area";
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
completionOverlay.className = "completion-overlay";
completionOverlay.hidden = true;
completionPanel.className = "completion-panel";
completionTitle.className = "completion-title";
completionTitle.textContent = "Level Complete";
completionActions.className = "completion-actions";
completionNextButton.type = "button";
completionNextButton.textContent = "Next";
completionCloseButton.type = "button";
completionCloseButton.textContent = "Close";

groupLabel.appendChild(groupSelect);
levelSidebar.append(levelSidebarTitle, levelList);
toolbar.append(groupLabel, progressStatus, nextButton, resetButton);
completionActions.append(completionNextButton, completionCloseButton);
completionPanel.append(completionTitle, completionActions);
completionOverlay.appendChild(completionPanel);
boardArea.append(canvas, completionOverlay);
playArea.append(levelSidebar, boardArea);
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
var perfectRun: boolean;
var recentCompletedColor: string | undefined;
var oldCompletedColors: string[];

currentGroupIndex = 0;
currentLevelIndex = 0;
var board: LevelBoard = cloneLevel(currentLevel());

var prevCircuits: Circuit[] = []; // last state of circuits - background drawing
var currentCircuits: Circuit[] = []; // dynamic current state of circuits - foreground drawing
var proposedCircuit: Point[] = []; // circuit being drawn

function currentGroup(): LevelGroup {
  return levelGroups[currentGroupIndex];
}

function currentLevel(): Level {
  return currentGroup().levels[currentLevelIndex];
}

function storageKey(): string {
  return progressStorageKey(currentLevel());
}

function currentLevelHash(): string {
  return "#" + encodeURIComponent(currentLevel().id);
}

function levelIdFromHash(): string | undefined {
  var hash = window.location.hash.slice(1);

  if (!hash) return undefined;

  try {
    return decodeURIComponent(hash);
  } catch {
    return undefined;
  }
}

function findLevelLocation(
  levelId: string,
): { groupIndex: number; levelIndex: number } | undefined {
  var groupIndex: number;
  var levelIndex: number;

  for (groupIndex = 0; groupIndex < levelGroups.length; groupIndex++) {
    levelIndex = levelGroups[groupIndex].levels.findIndex(function (level) {
      return level.id === levelId;
    });

    if (levelIndex !== -1)
      return { groupIndex: groupIndex, levelIndex: levelIndex };
  }

  return undefined;
}

function updateLevelHash(pushHistory: boolean): void {
  var nextHash = currentLevelHash();

  if (window.location.hash === nextHash) return;

  if (pushHistory) {
    window.history.pushState(null, "", nextHash);
  } else {
    window.history.replaceState(null, "", nextHash);
  }
}

function openLevelFromHash(): boolean {
  var levelId = levelIdFromHash();
  var location = levelId ? findLevelLocation(levelId) : undefined;

  if (!location) return false;

  currentGroupIndex = location.groupIndex;
  currentLevelIndex = location.levelIndex;
  groupSelect.value = currentGroup().id;
  board = cloneLevel(currentLevel());
  openLevel();
  return true;
}

function handleUrlLevelChange(): void {
  if (openLevelFromHash()) return;

  updateLevelHash(false);
}

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

function compactCircuits(circuits: Circuit[]): SavedCircuit[] {
  return circuits.map(function (circuit) {
    return {
      color: circuit.color,
      points: circuit.points.map(function (point) {
        return [point.x, point.y];
      }),
    };
  });
}

function saveCurrentProgress() {
  try {
    if (prevCircuits.length === 0 && perfectRun) {
      localStorage.removeItem(storageKey());
      return;
    }

    localStorage.setItem(
      storageKey(),
      JSON.stringify({
        version: 1,
        perfect: perfectRun,
        recentCompletedColor: recentCompletedColor,
        oldCompletedColors: oldCompletedColors,
        circuits: compactCircuits(prevCircuits),
      }),
    );
  } catch (e) {}
}

function clearSavedProgress() {
  try {
    localStorage.removeItem(storageKey());
  } catch (e) {}
}

function clearSavedCompletion() {
  try {
    localStorage.removeItem(completionStorageKey(currentLevel()));
  } catch (e) {}
}

function saveCurrentCompletion() {
  try {
    var key = completionStorageKey(currentLevel());
    var current = localStorage.getItem(key);

    if (current === "perfect") return;

    localStorage.setItem(key, perfectRun ? "perfect" : "complete");
  } catch (e) {}
}

type CompletionStatus = "none" | "complete" | "perfect";

function completionStatus(level: Level): CompletionStatus {
  try {
    var savedCompletion = localStorage.getItem(completionStorageKey(level));

    if (savedCompletion === "perfect") {
      return "perfect";
    }

    if (savedCompletion === "1" || savedCompletion === "complete") {
      return "complete";
    }

    return savedProgressCompletionStatus(level);
  } catch (e) {
    return "none";
  }
}

function savedProgressCompletionStatus(level: Level): CompletionStatus {
  try {
    var saved = JSON.parse(
      localStorage.getItem(progressStorageKey(level)) || "null",
    );

    if (!saved || !Array.isArray(saved.circuits)) return "none";

    var total = saved.circuits.reduce(function (sum: number, circuit: any) {
      if (!circuit || !Array.isArray(circuit.points)) return sum;

      return sum + circuit.points.length;
    }, 0);

    if (total !== level.size * level.size) return "none";

    return saved.perfect === true ? "perfect" : "complete";
  } catch (e) {
    return "none";
  }
}

function loadSavedProgress(): void {
  try {
    var saved = JSON.parse(localStorage.getItem(storageKey()) || "null");

    if (!saved || !Array.isArray(saved.circuits)) return;

    perfectRun = saved.perfect === true;
    recentCompletedColor =
      typeof saved.recentCompletedColor === "string"
        ? saved.recentCompletedColor
        : undefined;
    oldCompletedColors = Array.isArray(saved.oldCompletedColors)
      ? saved.oldCompletedColors.filter(function (color: unknown) {
          return typeof color === "string";
        })
      : [];

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
    var nextPoint = parseSavedPoint(point);

    if (!nextPoint) return false;

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

function parseSavedPoint(point: any): Point | false {
  if (!isValidSavedPoint(point)) return false;

  if (Array.isArray(point)) {
    return { x: point[0], y: point[1] };
  }

  return { x: point.x, y: point.y };
}

function isValidSavedPoint(point: any): boolean {
  var x = Array.isArray(point) ? point[0] : point?.x;
  var y = Array.isArray(point) ? point[1] : point?.y;

  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    x < board.size &&
    y >= 0 &&
    y < board.size
  );
}

function isCircuit(circuit: Circuit | false): circuit is Circuit {
  return circuit !== false;
}

type SavedCircuit = { color: string; points: Cell[] };

function populateGroupSelect() {
  groupSelect.textContent = "";

  levelGroups.forEach(function (group) {
    var option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    groupSelect.appendChild(option);
  });
}

function populateLevelList() {
  levelList.textContent = "";

  currentGroup().levels.forEach(function (level, index) {
    var button = document.createElement("button");
    var name = document.createElement("span");
    var checkmark = document.createElement("span");
    var isCurrent = index === currentLevelIndex;
    var status = completionStatus(level);
    var isComplete = status !== "none";
    var isPerfect = status === "perfect";

    button.type = "button";
    button.className = "level-button";
    button.dataset.levelId = level.id;
    button.dataset.levelIndex = String(index);
    button.setAttribute(
      "aria-label",
      level.name + (isPerfect ? " perfect" : isComplete ? " complete" : ""),
    );
    if (isCurrent) {
      button.classList.add("is-current");
      button.setAttribute("aria-current", "true");
    }
    if (isComplete) button.classList.add("is-complete");
    if (isPerfect) button.classList.add("is-perfect");

    name.className = "level-button-name";
    name.textContent = level.name;
    checkmark.className = "level-button-check";
    checkmark.textContent = isPerfect ? "★" : isComplete ? "✓" : "";
    checkmark.setAttribute("aria-hidden", "true");

    button.append(name, checkmark);
    button.addEventListener("click", function () {
      selectLevel(level.id);
    });
    levelList.appendChild(button);
  });
}

function selectGroup(groupId: string): void {
  var nextGroupIndex = levelGroups.findIndex(function (candidate) {
    return candidate.id === groupId;
  });

  currentGroupIndex = nextGroupIndex === -1 ? 0 : nextGroupIndex;
  currentLevelIndex = 0;
  groupSelect.value = currentGroup().id;
  board = cloneLevel(currentLevel());
  updateLevelHash(true);
  openLevel();
}

function selectLevel(levelId: string): void {
  var nextLevelIndex = currentGroup().levels.findIndex(function (candidate) {
    return candidate.id === levelId;
  });
  currentLevelIndex = nextLevelIndex === -1 ? 0 : nextLevelIndex;

  board = cloneLevel(currentLevel());
  updateLevelHash(true);
  openLevel();
}

function openLevel() {
  down = false;
  touchId = undefined;
  completed = false;
  perfectRun = true;
  recentCompletedColor = undefined;
  oldCompletedColors = [];
  hideCompletionOverlay();
  prevCircuits = [];
  currentCircuits = [];
  proposedCircuit = [];
  loadSavedProgress();
  init();
  completed = Math.round(proportionFilled * 100) === 100;
  updateControls();
  populateLevelList();
  if (completed) showCompletionOverlay();
}

function resetGame() {
  clearSavedProgress();
  clearSavedCompletion();
  openLevel();
}

function nextLevel() {
  currentLevelIndex++;

  if (currentLevelIndex >= currentGroup().levels.length) {
    currentGroupIndex = (currentGroupIndex + 1) % levelGroups.length;
    currentLevelIndex = 0;
    groupSelect.value = currentGroup().id;
  }

  board = cloneLevel(currentLevel());
  updateLevelHash(true);
  openLevel();
}

function updateControls() {
  var levelNumber = currentLevelIndex + 1;
  var isLastInGroup = currentLevelIndex === currentGroup().levels.length - 1;

  progressStatus.textContent =
    currentGroup().name +
    " level " +
    levelNumber +
    " of " +
    currentGroup().levels.length;
  nextButton.textContent = isLastInGroup ? "Next Size" : "Next";
  completionNextButton.textContent = nextButton.textContent;
  nextButton.disabled = !completed;
}

function completeLevel() {
  if (completed) return;

  completed = true;
  saveCurrentCompletion();
  updateControls();
  populateLevelList();
  showCompletionOverlay();
}

function showCompletionOverlay() {
  completionOverlay.hidden = false;
}

function hideCompletionOverlay() {
  completionOverlay.hidden = true;
}

function clear(): void {
  ctx.clearRect(0, 0, w, h);
} // clear()

Array.prototype.last = function () {
  var len = this.length;
  var last = this[len - 1];

  return last;
}; // Array.last()

Array.prototype.first = function () {
  var last = this[0];

  return last;
}; // Array.first()

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

function drawNodes(): void {
  board.nodes.forEach(function (val, index) {
    drawNode(val[0].x, val[0].y, colors[index]);
    drawNode(val[1].x, val[1].y, colors[index]);
  }); // nodes forEach
} // drawNodes()

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

function centerPos(cx: number, cy: number): Point {
  var x = w / 2 - size / 2 + cx * cellSize + cellSize / 2;
  var y = h / 2 - size / 2 + cy * cellSize + cellSize / 2;

  return { x: x, y: y };
} // centerPos()

function topLeftPos(cx: number, cy: number): Point {
  var x = w / 2 - size / 2 + cx * cellSize;
  var y = h / 2 - size / 2 + cy * cellSize;

  return { x: x, y: y };
} // centerPos()

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

function compareCoords(c1: Point | undefined, c2: Point | undefined): boolean {
  if (!c1 || !c2) return false;
  if (c1.x !== c2.x) return false;
  if (c1.y !== c2.y) return false;
  return true;
} // compareCoords()

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

function isNode(x: number, y: number): boolean {
  var found = false;

  board.nodes.forEach(function (val, index) {
    if (val[0].x == x && val[0].y == y) found = true;
    if (val[1].x == x && val[1].y == y) found = true;
  });

  return found;
} // isNode()

function nodeColor(x: number, y: number): string | false {
  var found: string | false = false;

  board.nodes.forEach(function (val, index) {
    if (val[0].x == x && val[0].y == y) found = colors[index];
    if (val[1].x == x && val[1].y == y) found = colors[index];
  });

  return found;
} // nodeColor()

function markPathStart(color: string | false | undefined): void {
  if (!color) return;

  if (recentCompletedColor && color !== recentCompletedColor) {
    rememberOldCompletedColor(recentCompletedColor);
    recentCompletedColor = undefined;
  }

  if (isOldCompletedColor(color)) {
    perfectRun = false;
  }
}

function rememberOldCompletedColor(color: string): void {
  if (!isOldCompletedColor(color)) {
    oldCompletedColors.push(color);
  }
}

function isOldCompletedColor(color: string): boolean {
  return oldCompletedColors.indexOf(color) !== -1;
}

function markOverwrittenCircuit(circuit: Circuit | undefined): void {
  if (!circuit) return;

  if (isOldCompletedColor(circuit.color)) {
    perfectRun = false;
  }
}

function commitProposedCircuit(): void {
  if (proposedCircuit.length === 0 || !proposedCircuitColor) return;

  var circuit = {
    color: proposedCircuitColor,
    points: proposedCircuit,
  };

  currentCircuits.push(circuit);
  rememberCommittedCircuit(circuit);
}

function rememberCommittedCircuit(circuit: Circuit): void {
  if (isCircuitComplete(circuit)) {
    recentCompletedColor = circuit.color;
    return;
  }

  if (recentCompletedColor === circuit.color) {
    recentCompletedColor = undefined;
  }
}

function isCircuitComplete(circuit: Circuit): boolean {
  var colorIndex = colors.indexOf(circuit.color);

  if (colorIndex < 0 || colorIndex >= board.nodes.length) return false;
  if (circuit.points.length < 2) return false;

  var pair = board.nodes[colorIndex];
  var first = circuit.points.first();
  var last = circuit.points.last();

  return (
    (compareCoords(first, pair[0]) && compareCoords(last, pair[1])) ||
    (compareCoords(first, pair[1]) && compareCoords(last, pair[0]))
  );
}

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

function isMatchingNode(x: number, y: number): boolean {
  if (!isNode(x, y)) return false; // error - not a node

  var firstNode = compareCoords({ x: x, y: y }, proposedCircuit[0]);

  if (firstNode) return false;
  if (nodeColor(x, y) == proposedCircuitColor) return true;

  return false;
} // isMatchingNode()

function isInProposedCircuit(x: number, y: number): boolean {
  var found = false;

  proposedCircuit.forEach(function (val, index) {
    var compare = compareCoords(val, { x: x, y: y });

    if (compare) found = true;
  });

  return found;
} // posInProposedCircuit()

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

function colorInCircuits(color: string | false | undefined): number | false {
  var found: number | false = false;

  currentCircuits.forEach(function (circuit, circuitIndex) {
    var compare = color === circuit.color;
    if (compare) found = circuitIndex;
  });

  return found;
} // colorInCircuits()

function posInProposedCircuit(x: number, y: number): number | false {
  // if (proposedCircuit.length == 2) return false;
  var found: number | false = false;

  proposedCircuit.forEach(function (val, index) {
    var compare = compareCoords(val, { x: x, y: y });

    if (compare) found = index;
  });

  return found;
} // isInProposedCircuit()

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

function calculateProportionFilled(): number {
  var total = 0;

  prevCircuits.forEach(function (val, index) {
    total += val.points.length;
  });

  total += proposedCircuit.length;

  total *= cellProportion;

  return total;
} // calculateProportionFilled()

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
          markOverwrittenCircuit(currentCircuits[val.circuit]);
          currentCircuits[val.circuit].points = currentCircuits[
            val.circuit
          ].points.slice(0, val.pos);
        });
      }

      updateBoard();
    }
  } catch (e) {}
} // moveEvent()

function downEvent(event: MouseEvent): void {
  if (event.button !== 0) return;
  if (event.target !== ctx.canvas) return;
  event.preventDefault();

  down = true;
  completed = false;
  hideCompletionOverlay();
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

    if (proposedCircuit.length > 0) {
      markPathStart(proposedCircuitColor);
    }
  } catch (e) {
    console.warn("down event error");
  }

  restoreCircuits();
  updateBoard();
  saveCurrentProgress();
} // downEvent()

function upEvent(event: MouseEvent): void {
  if (!down && proposedCircuit.length === 0) return;
  event.preventDefault();

  down = false;
  try {
    commitProposedCircuit();

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
          markOverwrittenCircuit(currentCircuits[val.circuit]);
          currentCircuits[val.circuit].points = currentCircuits[
            val.circuit
          ].points.slice(0, val.pos);
        });
      }

      updateBoard();
    }
  } catch (e) {}
} // moveTouchEvent()

function downTouchEvent(event: TouchEvent): void {
  if (event.target !== ctx.canvas) return;
  event.preventDefault();

  touchId = event.touches[0].identifier;
  down = true;
  completed = false;
  hideCompletionOverlay();
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

    if (proposedCircuit.length > 0) {
      markPathStart(proposedCircuitColor);
    }
  } catch (e) {}

  restoreCircuits();
  updateBoard();
  saveCurrentProgress();
} // downTouchEvent()

function upTouchEvent(event: TouchEvent): void {
  if (!down && proposedCircuit.length === 0) return;
  event.preventDefault();

  down = false;
  touchId = undefined;

  commitProposedCircuit();

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

function updateBoard() {
  clear();
  drawGrid();
  drawNodes();
  drawCircuits();
  drawProposedCircuit();

  proportionFilled = calculateProportionFilled();
}

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

function init() {
  proposedCircuitColor = false;
  proposedCircuitEnd = false;

  availableCells = board.size * board.size;
  cellProportion = 1 / availableCells;

  resizeCanvas();
} // init()

populateGroupSelect();
if (!openLevelFromHash()) {
  groupSelect.value = currentGroup().id;
  updateLevelHash(false);
  openLevel();
}

window.addEventListener("mousedown", downEvent);
window.addEventListener("mousemove", moveEvent);
window.addEventListener("mouseup", upEvent);

window.addEventListener("touchstart", downTouchEvent);
window.addEventListener("touchmove", moveTouchEvent);
window.addEventListener("touchend", upTouchEvent);
window.addEventListener("touchcancel", upTouchEvent);
window.addEventListener("hashchange", handleUrlLevelChange);
window.addEventListener("popstate", handleUrlLevelChange);
resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(canvas);

groupSelect.addEventListener("change", function (event: Event) {
  var target = event.target as HTMLSelectElement;

  selectGroup(target.value);
});

resetButton.addEventListener("click", resetGame);
nextButton.addEventListener("click", nextLevel);
completionNextButton.addEventListener("click", nextLevel);
completionCloseButton.addEventListener("click", hideCompletionOverlay);
