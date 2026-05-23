import "./styles.css";

var app = document.createElement("main");
var toolbar = document.createElement("div");
var groupLabel = document.createElement("label");
var groupSelect = document.createElement("select");
var levelLabel = document.createElement("label");
var levelSelect = document.createElement("select");
var progressStatus = document.createElement("p");
var nextButton = document.createElement("button");
var resetButton = document.createElement("button");
var canvas = document.createElement("canvas");

app.className = "game";
toolbar.className = "toolbar";
groupLabel.textContent = "Size";
groupLabel.htmlFor = "group-select";
groupSelect.id = "group-select";
levelLabel.textContent = "Level";
levelLabel.htmlFor = "level-select";
levelSelect.id = "level-select";
progressStatus.className = "progress-status";
nextButton.type = "button";
nextButton.textContent = "Next";
resetButton.type = "button";
resetButton.textContent = "Reset";

groupLabel.appendChild(groupSelect);
levelLabel.appendChild(levelSelect);
toolbar.append(groupLabel, levelLabel, progressStatus, nextButton, resetButton);
app.append(toolbar, canvas);
document.body.appendChild(app);

var ctx = canvas.getContext("2d");

// initialize vars
var w,
  h,
  size,
  cellSize,
  down,
  touchId,
  proposedFlowColor,
  proposedFlowEnd,
  availableCells,
  flowsComplete,
  cellProportion,
  proportionFilled,
  currentGroupIndex,
  currentLevelIndex,
  completed;

var colors = [
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

var levelGroups = [
  levelGroup(5, [
    recipe("rows", [5, 5, 5, 5, 5]),
    recipe("columns", [5, 5, 5, 5, 5]),
    recipe("columns-rotated", [3, 9, 3, 7, 3]),
    recipe("rows-reversed", [3, 8, 3, 4, 7]),
    recipe("columns-rotated", [3, 8, 4, 3, 7]),
    recipe("columns-reversed", [7, 3, 3, 7, 5]),
    recipe("rows-reversed", [7, 4, 4, 3, 7]),
    recipe("rows", [6, 6, 3, 3, 7]),
    recipe("columns-reversed", [6, 3, 5, 8, 3]),
    recipe("rows-reversed", [4, 7, 5, 3, 6]),
  ]),
  levelGroup(6, [
    recipe("rows", [6, 6, 6, 6, 6, 6]),
    recipe("columns", [6, 6, 6, 6, 6, 6]),
    recipe("rows", [7, 6, 6, 7, 5, 5]),
    recipe("columns-reversed", [6, 6, 8, 6, 5, 5]),
    recipe("columns", [6, 7, 4, 10, 4, 5]),
    recipe("columns-reversed", [7, 5, 9, 4, 7, 4]),
    recipe("columns-rotated", [5, 6, 4, 10, 7, 4]),
    recipe("columns-reversed", [4, 7, 4, 9, 4, 8]),
    recipe("columns-rotated", [6, 5, 5, 9, 6, 5]),
    recipe("rows", [8, 5, 7, 5, 6, 5]),
  ]),
  levelGroup(7, [
    recipe("rows", [7, 7, 7, 7, 7, 7, 7]),
    recipe("columns", [7, 7, 7, 7, 7, 7, 7]),
    recipe("columns", [8, 7, 7, 5, 10, 5, 7]),
    recipe("columns-reversed", [5, 8, 6, 9, 6, 5, 10]),
    recipe("columns-reversed", [5, 9, 8, 5, 5, 12, 5]),
    recipe("rows-reversed", [6, 5, 11, 6, 8, 6, 7]),
    recipe("columns-rotated", [5, 9, 8, 6, 5, 6, 10]),
    recipe("columns-reversed", [6, 7, 5, 11, 9, 5, 6]),
    recipe("columns-rotated", [5, 9, 6, 5, 12, 5, 7]),
    recipe("rows-reversed", [7, 9, 5, 5, 6, 11, 6]),
  ]),
  levelGroup(8, [
    recipe("rows", [8, 8, 8, 8, 8, 8, 8, 8]),
    recipe("columns", [8, 8, 8, 8, 8, 8, 8, 8]),
    recipe("columns-rotated", [6, 10, 9, 7, 6, 12, 8, 6]),
    recipe("columns", [7, 7, 9, 6, 13, 7, 9, 6]),
    recipe("rows-rotated", [13, 11, 6, 6, 6, 6, 6, 10]),
    recipe("columns-reversed", [6, 6, 6, 6, 6, 10, 13, 11]),
    recipe("rows", [11, 6, 8, 8, 10, 6, 6, 9]),
    recipe("columns-rotated", [6, 13, 12, 9, 6, 6, 6, 6]),
    recipe("rows-reversed", [6, 6, 12, 8, 6, 6, 12, 8]),
    recipe("columns-rotated", [6, 10, 8, 6, 6, 13, 6, 9]),
  ]),
  levelGroup(9, [
    recipe("rows", [9, 9, 9, 9, 9, 9, 9, 9, 9]),
    recipe("columns", [9, 9, 9, 9, 9, 9, 9, 9, 9]),
    recipe("columns", [7, 7, 12, 7, 13, 8, 13, 7, 7]),
    recipe("columns-reversed", [8, 10, 7, 7, 14, 10, 7, 10, 8]),
    recipe("rows", [7, 9, 9, 9, 10, 8, 9, 13, 7]),
    recipe("rows-rotated", [11, 8, 11, 7, 9, 10, 11, 7, 7]),
    recipe("columns", [7, 11, 10, 9, 7, 9, 10, 8, 10]),
    recipe("columns-reversed", [7, 7, 11, 14, 7, 7, 7, 10, 11]),
    recipe("rows-reversed", [7, 10, 7, 11, 8, 14, 10, 7, 7]),
    recipe("rows-rotated", [7, 11, 8, 9, 9, 7, 9, 12, 9]),
  ]),
  levelGroup(10, [
    recipe("rows", [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]),
    recipe("columns", [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]),
    recipe("columns-rotated", [10, 10, 8, 11, 8, 10, 8, 13, 14, 8]),
    recipe("columns", [8, 15, 9, 8, 8, 14, 8, 14, 8, 8]),
    recipe("columns-reversed", [13, 8, 8, 8, 12, 14, 10, 8, 11, 8]),
    recipe("rows", [8, 8, 13, 9, 14, 8, 9, 8, 15, 8]),
    recipe("rows-reversed", [10, 9, 10, 8, 10, 10, 12, 8, 12, 11]),
    recipe("rows", [9, 8, 14, 8, 9, 12, 11, 8, 8, 13]),
    recipe("columns-rotated", [13, 8, 8, 9, 9, 8, 8, 8, 15, 14]),
    recipe("columns-reversed", [10, 13, 8, 8, 8, 8, 14, 9, 12, 10]),
  ]),
];

currentGroupIndex = 0;
currentLevelIndex = 0;
var board = cloneLevel(currentLevel());

var prevFlows = []; // last state of flows - background drawing
var currentFlows = []; // dynamic current state of slows - foreground drawing
var proposedFlow = []; // flow being drawn
var storagePrefix = "flow.progress.";

function recipe(mode, lengths) {
  return { mode: mode, lengths: lengths };
}

function levelGroup(size, recipes) {
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

function levelFromRecipe(size, index, levelRecipe) {
  var totalLength = levelRecipe.lengths.reduce(function (sum, length) {
    return sum + length;
  }, 0);

  if (levelRecipe.lengths.length !== size || totalLength !== size * size) {
    throw new Error(
      size + "x" + size + " level " + (index + 1) + " is invalid",
    );
  }

  var path = switchbackPath(size, levelRecipe.mode);
  var pathIndex = 0;
  var pairs = levelRecipe.lengths.map(function (length) {
    var segment = path.slice(pathIndex, pathIndex + length);
    pathIndex += length;

    return [segment[0], segment[segment.length - 1]];
  });
  var number = padLevelNumber(index + 1);

  return level(size + "-" + number, "Level " + number, size, pairs);
}

function padLevelNumber(number) {
  return String(number).padStart(2, "0");
}

function switchbackPath(size, mode) {
  var path =
    mode.indexOf("columns") === 0
      ? columnSwitchback(size)
      : rowSwitchback(size);

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

function rowSwitchback(size) {
  var path = [];

  for (var y = 0; y < size; y++) {
    if (y % 2 === 0) {
      for (var x = 0; x < size; x++) path.push([x, y]);
    } else {
      for (var xr = size - 1; xr >= 0; xr--) path.push([xr, y]);
    }
  }

  return path;
}

function columnSwitchback(size) {
  var path = [];

  for (var x = 0; x < size; x++) {
    if (x % 2 === 0) {
      for (var y = 0; y < size; y++) path.push([x, y]);
    } else {
      for (var yr = size - 1; yr >= 0; yr--) path.push([x, yr]);
    }
  }

  return path;
}

function level(id, name, size, pairs) {
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

      return pair.map(function (node) {
        if (node[0] < 0 || node[0] >= size || node[1] < 0 || node[1] >= size) {
          throw new Error(name + " contains an endpoint outside the board");
        }

        return { x: node[0], y: node[1] };
      });
    }),
  };
}

function currentGroup() {
  return levelGroups[currentGroupIndex];
}

function currentLevel() {
  return currentGroup().levels[currentLevelIndex];
}

function storageKey() {
  return storagePrefix + currentGroup().id + "." + currentLevel().id;
}

function cloneFlows(flows) {
  return flows.map(function (flow) {
    return {
      color: flow.color,
      points: flow.points.map(function (point) {
        return { x: point.x, y: point.y };
      }),
    };
  });
}

function saveCurrentProgress() {
  try {
    if (prevFlows.length === 0) {
      localStorage.removeItem(storageKey());
      return;
    }

    localStorage.setItem(
      storageKey(),
      JSON.stringify({
        version: 1,
        flows: cloneFlows(prevFlows),
      }),
    );
  } catch (e) {}
}

function clearSavedProgress() {
  try {
    localStorage.removeItem(storageKey());
  } catch (e) {}
}

function loadSavedProgress() {
  try {
    var saved = JSON.parse(localStorage.getItem(storageKey()));

    if (!saved || !Array.isArray(saved.flows)) return;

    prevFlows = saved.flows
      .map(function (flow) {
        return sanitizeSavedFlow(flow);
      })
      .filter(Boolean);
    currentFlows = cloneFlows(prevFlows);
  } catch (e) {
    prevFlows = [];
    currentFlows = [];
  }
}

function sanitizeSavedFlow(flow) {
  var colorIndex = colors.indexOf(flow.color);

  if (
    colorIndex < 0 ||
    colorIndex >= board.nodes.length ||
    !Array.isArray(flow.points) ||
    flow.points.length === 0
  ) {
    return false;
  }

  var points = [];

  for (var i = 0; i < flow.points.length; i++) {
    var point = flow.points[i];

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

  return { color: flow.color, points: points };
}

function isValidSavedPoint(point) {
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

function cloneLevel(level) {
  return {
    size: level.size,
    nodes: level.nodes.map(function (pair) {
      return pair.map(function (node) {
        return { x: node.x, y: node.y };
      });
    }),
  };
}

function populateGroupSelect() {
  groupSelect.textContent = "";

  levelGroups.forEach(function (group) {
    var option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    groupSelect.appendChild(option);
  });
}

function populateLevelSelect() {
  levelSelect.textContent = "";

  currentGroup().levels.forEach(function (level, index) {
    var option = document.createElement("option");
    option.value = level.id;
    option.textContent = level.name;
    option.dataset.levelIndex = index;
    levelSelect.appendChild(option);
  });
}

function selectGroup(groupId) {
  var nextGroupIndex = levelGroups.findIndex(function (candidate) {
    return candidate.id === groupId;
  });

  currentGroupIndex = nextGroupIndex === -1 ? 0 : nextGroupIndex;
  currentLevelIndex = 0;
  populateLevelSelect();
  groupSelect.value = currentGroup().id;
  levelSelect.value = currentLevel().id;
  board = cloneLevel(currentLevel());
  openLevel();
}

function selectLevel(levelId) {
  var nextLevelIndex = currentGroup().levels.findIndex(function (candidate) {
    return candidate.id === levelId;
  });
  currentLevelIndex = nextLevelIndex === -1 ? 0 : nextLevelIndex;

  board = cloneLevel(currentLevel());
  openLevel();
}

function openLevel() {
  down = false;
  touchId = undefined;
  completed = false;
  prevFlows = [];
  currentFlows = [];
  proposedFlow = [];
  loadSavedProgress();
  init();
  completed = Math.round(proportionFilled * 100) === 100;
  updateControls();
  if (completed) drawCompletionMessage();
}

function resetGame() {
  clearSavedProgress();
  openLevel();
}

function nextLevel() {
  currentLevelIndex++;

  if (currentLevelIndex >= currentGroup().levels.length) {
    currentGroupIndex = (currentGroupIndex + 1) % levelGroups.length;
    currentLevelIndex = 0;
    groupSelect.value = currentGroup().id;
    populateLevelSelect();
  }

  levelSelect.value = currentLevel().id;
  board = cloneLevel(currentLevel());
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
    currentGroup().levels.length +
    (completed ? " complete" : "");
  nextButton.textContent = isLastInGroup ? "Next Size" : "Next";
  nextButton.disabled = !completed;
}

function completeLevel() {
  if (completed) return;

  completed = true;
  updateControls();
  drawCompletionMessage();
}

function clear() {
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

function drawGrid(cells) {
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

function drawNodes() {
  board.nodes.forEach(function (val, index) {
    drawNode(val[0].x, val[0].y, colors[index]);
    drawNode(val[1].x, val[1].y, colors[index]);
  }); // nodes forEach
} // drawNodes()

function drawNode(x, y, color) {
  color = typeof color === "undefined" ? "white" : color;

  var pos = centerPos(x, y);

  ctx.save();
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, cellSize / 2.5, 0, Math.PI * 2, false);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
} // drawNode()

function centerPos(cx, cy) {
  var cx = w / 2 - size / 2 + cx * cellSize + cellSize / 2;
  var cy = h / 2 - size / 2 + cy * cellSize + cellSize / 2;

  return { x: cx, y: cy };
} // centerPos()

function topLeftPos(cx, cy) {
  var x = w / 2 - size / 2 + cx * cellSize;
  var y = h / 2 - size / 2 + cy * cellSize;

  return { x: x, y: y };
} // centerPos()

function posToCell(cx, cy) {
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

function compareCoords(c1, c2) {
  if (c1.x !== c2.x) return false;
  if (c1.y !== c2.y) return false;
  return true;
} // compareCoords()

function isAdjacent(c1, c2) {
  if (
    (c2.x == c1.x + 1 && c2.y == c1.y) ||
    (c2.x == c1.x - 1 && c2.y == c1.y) ||
    (c2.x == c1.x && c2.y == c1.y + 1) ||
    (c2.x == c1.x && c2.y == c1.y - 1)
  )
    return true;

  return false;
} // isAdjacent()

function isNode(x, y) {
  var found = false;

  board.nodes.forEach(function (val, index) {
    if (val[0].x == x && val[0].y == y) found = true;
    if (val[1].x == x && val[1].y == y) found = true;
  });

  return found;
} // isNode()

function nodeColor(x, y) {
  var found = false;

  board.nodes.forEach(function (val, index) {
    if (val[0].x == x && val[0].y == y) found = colors[index];
    if (val[1].x == x && val[1].y == y) found = colors[index];
  });

  return found;
} // nodeColor()

function drawProposedFlow() {
  try {
    if (proposedFlow.length === 0) throw new Error("proposed flow empty");

    ctx.save();
    ctx.strokeStyle = proposedFlowColor;
    ctx.lineWidth = cellSize * 0.3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    var pos = centerPos(proposedFlow[0].x, proposedFlow[0].y);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    proposedFlow.forEach(function (val, index) {
      var center = centerPos(val.x, val.y);

      ctx.lineTo(center.x, center.y);
    });

    ctx.stroke();
    ctx.restore();
  } catch (e) {}
} // drawProposedFlow()

function drawFlows() {
  try {
    if (currentFlows.length === 0) throw new Error("flows empty");

    ctx.save();
    ctx.lineWidth = cellSize * 0.3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    currentFlows.forEach(function (flow, flowIndex) {
      var move = centerPos(flow.points[0].x, flow.points[0].y);

      ctx.strokeStyle = flow.color;

      ctx.beginPath();
      ctx.moveTo(move.x, move.y);

      flow.points.forEach(function (point, pointIndex) {
        var center = centerPos(point.x, point.y);

        ctx.lineTo(center.x, center.y);
      });

      ctx.stroke();
    });

    ctx.restore();

    prevFlows.forEach(function (flow, flowIndex) {
      ctx.fillStyle = flow.color;

      flow.points.forEach(function (point, pointIndex) {
        var topleft = topLeftPos(point.x, point.y);

        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillRect(topleft.x, topleft.y, cellSize, cellSize);
        ctx.restore();
      });
    });
  } catch (e) {}
} // drawFlows()

function drawCompletionMessage() {
  ctx.save();
  ctx.fillStyle = "white";
  ctx.font = Math.round(Math.min(w, h) * 0.1) + "px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WELL DONE", w / 2, h / 2);
  ctx.restore();
}

function isMatchingNode(x, y) {
  if (!isNode(x, y)) return false; // error - not a node

  var firstNode = compareCoords({ x: x, y: y }, proposedFlow[0]);

  if (firstNode) return false;
  if (nodeColor(x, y) == proposedFlowColor) return true;

  return false;
} // isMatchingNode()

function isInProposedFlow(x, y) {
  var found = false;

  proposedFlow.forEach(function (val, index) {
    var compare = compareCoords(val, { x: x, y: y });

    if (compare) found = true;
  });

  return found;
} // posInProposedFlow()

function posInFlows(x, y) {
  var found = false;

  currentFlows.forEach(function (flow, flowIndex) {
    flow.points.forEach(function (point, posIndex) {
      var compare = compareCoords(point, { x: x, y: y });
      if (compare) found = { flow: flowIndex, pos: posIndex };
    });
  });

  return found;
} // posInFlows()

function colorInFlows(color) {
  var found = false;

  currentFlows.forEach(function (flow, flowIndex) {
    var compare = color === flow.color;
    if (compare) found = flowIndex;
  });

  return found;
} // colorInFlows()

function posInProposedFlow(x, y) {
  // if (proposedFlow.length == 2) return false;
  var found = false;

  proposedFlow.forEach(function (val, index) {
    var compare = compareCoords(val, { x: x, y: y });

    if (compare) found = index;
  });

  return found;
} // isInProposedFlow()

function anyProposedInCurrentFlows() {
  var slices = [];

  for (var i = 0; i < proposedFlow.length; i++) {
    for (var j = 0; j < currentFlows.length; j++) {
      var compare = false;
      for (var k = 0; k < currentFlows[j].points.length; k++) {
        compare = compareCoords(proposedFlow[i], currentFlows[j].points[k]);

        if (compare) {
          slices.push({ flow: j, pos: k });
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
} // anyProposedInCurrentFlows()

function backupFlows() {
  prevFlows = [];
  var newFlows = [];

  currentFlows.forEach(function (flow, flowIndex) {
    newFlows.push({ color: flow.color, points: [] });
    flow.points.forEach(function (point, pointIndex) {
      newFlows.last().points[pointIndex] = point;
    });
  });

  prevFlows = newFlows;

  proposedFlowColor = undefined;
  proposedFlowEnd = undefined;
  proposedFlow = [];
} // backupFlows()

function restoreFlows() {
  currentFlows = [];
  var newFlows = [];

  for (var i = 0, j = prevFlows.length; i < j; i++) {
    if (prevFlows[i].color === proposedFlowColor) {
      prevFlows.splice(i, 1);
      j--;
    }
  }

  for (var i = 0, j = prevFlows.length; i < j; i++) {
    newFlows.push({ color: prevFlows[i].color, points: [] });

    prevFlows[i].points.forEach(function (point, pointIndex) {
      newFlows.last().points[pointIndex] = point;
    });
  }

  currentFlows = newFlows;
} // restoreFlows()

function calculateProportionFilled() {
  var total = 0;

  prevFlows.forEach(function (val, index) {
    total += val.points.length;
  });

  total += proposedFlow.length;

  total *= cellProportion;

  return total;
} // calculateProportionFilled()

function moveEvent(event) {
  if (!down) return false;
  event.preventDefault();

  try {
    var coords = posToCell(event.clientX, event.clientY);

    var same = compareCoords(proposedFlow.last(), coords);
    var adjacent = isAdjacent(proposedFlow.last(), coords);
    var node = nodeColor(coords.x, coords.y);
    var matchingNode = isMatchingNode(coords.x, coords.y);
    var inProposedFlow = posInProposedFlow(coords.x, coords.y);

    if (
      !same &&
      adjacent &&
      (!node || matchingNode || node == proposedFlowColor) &&
      (!proposedFlowEnd || !!inProposedFlow)
    ) {
      if (inProposedFlow === false) {
        proposedFlow.push(coords);
      } else {
        // handle backtracking
        proposedFlow = proposedFlow.slice(0, inProposedFlow + 1);
      }

      restoreFlows();

      // limit extra flow from end node
      proposedFlowEnd = matchingNode ? true : false;

      // find conflicting flows and slice
      var posInfo = anyProposedInCurrentFlows();
      if (posInfo !== false) {
        posInfo.forEach(function (val, index) {
          currentFlows[val.flow].points = currentFlows[val.flow].points.slice(
            0,
            val.pos,
          );
        });
      }

      updateBoard();
    }
  } catch (e) {}
} // moveEvent()

function downEvent(event) {
  if (event.button !== 0) return;
  if (event.target !== ctx.canvas) return;
  event.preventDefault();

  down = true;
  completed = false;
  updateControls();

  try {
    var coords = posToCell(event.clientX, event.clientY);
    var node = nodeColor(coords.x, coords.y);
    var flowExists = posInFlows(coords.x, coords.y);
    if (flowExists !== false) {
      if (node == false) {
        var flow = currentFlows.splice(flowExists.flow, 1)[0];
        proposedFlow = flow.points.slice(0, flowExists.pos + 1);
        proposedFlowColor = flow.color;
      } else {
        proposedFlowColor = node;
        proposedFlow.push(coords);
      }
    } else {
      if (node == false) return;
      var colorExists = colorInFlows(node);
      proposedFlowColor = node;

      if (colorExists !== false) {
        currentFlows.splice(colorExists, 1);
      }

      proposedFlow.push(coords);
    }
  } catch (e) {
    console.warn("down event error");
  }

  restoreFlows();
  updateBoard();
  saveCurrentProgress();
} // downEvent()

function upEvent(event) {
  if (!down && proposedFlow.length === 0) return;
  event.preventDefault();

  down = false;
  try {
    if (proposedFlow.length !== 0) {
      currentFlows.push({
        color: proposedFlowColor,
        points: proposedFlow,
      });
    }

    backupFlows();
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

function moveTouchEvent(event) {
  if (!down) return false;
  event.preventDefault();

  try {
    for (var i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier == touchId) {
        var coords = posToCell(
          event.touches[i].clientX,
          event.touches[i].clientY,
        );
      }
    }

    var same = compareCoords(proposedFlow.last(), coords);
    var adjacent = isAdjacent(proposedFlow.last(), coords);
    var node = nodeColor(coords.x, coords.y);
    var matchingNode = isMatchingNode(coords.x, coords.y);
    var inProposedFlow = posInProposedFlow(coords.x, coords.y);

    if (
      !same &&
      adjacent &&
      (!node || matchingNode || node == proposedFlowColor) &&
      (!proposedFlowEnd || !!inProposedFlow)
    ) {
      if (inProposedFlow === false) {
        proposedFlow.push(coords);
      } else {
        // handle backtracking
        proposedFlow = proposedFlow.slice(0, inProposedFlow + 1);
      }

      restoreFlows();

      // limit extra flow from end node
      proposedFlowEnd = matchingNode ? true : false;

      // find conflicting flows and slice
      var posInfo = anyProposedInCurrentFlows();
      if (posInfo !== false) {
        posInfo.forEach(function (val, index) {
          currentFlows[val.flow].points = currentFlows[val.flow].points.slice(
            0,
            val.pos,
          );
        });
      }

      updateBoard();
    }
  } catch (e) {}
} // moveTouchEvent()

function downTouchEvent(event) {
  if (event.target !== ctx.canvas) return;
  event.preventDefault();

  touchId = event.touches[0].identifier;
  down = true;
  completed = false;
  updateControls();

  try {
    for (var i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier == touchId) {
        var coords = posToCell(
          event.touches[i].clientX,
          event.touches[i].clientY,
        );
      }
    }

    var node = nodeColor(coords.x, coords.y);
    var flowExists = posInFlows(coords.x, coords.y);
    if (flowExists !== false) {
      if (node == false) {
        var flow = currentFlows.splice(flowExists.flow, 1)[0];
        proposedFlow = flow.points.slice(0, flowExists.pos + 1);
        proposedFlowColor = flow.color;
      } else {
        proposedFlowColor = node;
        proposedFlow.push(coords);
      }
    } else {
      if (node == false) return;
      var colorExists = colorInFlows(node);
      proposedFlowColor = node;

      if (colorExists !== false) {
        currentFlows.splice(colorExists, 1);
      }

      proposedFlow.push(coords);
    }
  } catch (e) {}

  restoreFlows();
  updateBoard();
  saveCurrentProgress();
} // downTouchEvent()

function upTouchEvent(event) {
  if (!down && proposedFlow.length === 0) return;
  event.preventDefault();

  down = false;
  touchId = undefined;

  if (proposedFlow.length !== 0) {
    currentFlows.push({
      color: proposedFlowColor,
      points: proposedFlow,
    });
  }

  backupFlows();

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
  drawFlows();
  drawProposedFlow();

  proportionFilled = calculateProportionFilled();
  if (completed) drawCompletionMessage();
}

function init() {
  var canvasRect = ctx.canvas.getBoundingClientRect();

  w = ctx.canvas.width = canvasRect.width;
  h = ctx.canvas.height = canvasRect.height;

  size = Math.min(w, h) * 0.9;

  cellSize = size / board.size;

  proposedFlowColor = false;
  proposedFlowEnd = false;

  availableCells = board.size * board.size;
  cellProportion = 1 / availableCells;

  updateBoard();
} // init()

populateGroupSelect();
groupSelect.value = currentGroup().id;
populateLevelSelect();
levelSelect.value = currentLevel().id;
openLevel();

window.addEventListener("mousedown", downEvent);
window.addEventListener("mousemove", moveEvent);
window.addEventListener("mouseup", upEvent);

window.addEventListener("touchstart", downTouchEvent);
window.addEventListener("touchmove", moveTouchEvent);
window.addEventListener("touchend", upTouchEvent);
window.addEventListener("touchcancel", upTouchEvent);
window.addEventListener("resize", init);

groupSelect.addEventListener("change", function (event) {
  selectGroup(event.target.value);
});

levelSelect.addEventListener("change", function (event) {
  selectLevel(event.target.value);
});

resetButton.addEventListener("click", resetGame);
nextButton.addEventListener("click", nextLevel);
