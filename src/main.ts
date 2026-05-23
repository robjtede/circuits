import "./styles.css";
import { colors, cloneLevel, levelGroups } from "./levels";
import { completionStorageKey, progressStorageKey } from "./storage";
import type {
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

currentGroupIndex = 0;
currentLevelIndex = 0;
var board: LevelBoard = cloneLevel(currentLevel());

var prevCircuits: Circuit[] = []; // last state of circuits - background drawing
var currentCircuits: Circuit[] = []; // dynamic current state of circuits - foreground drawing
var proposedCircuit: Point[] = []; // circuit being drawn

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
