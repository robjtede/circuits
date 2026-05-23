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
  proposedCircuitColor,
  proposedCircuitEnd,
  availableCells,
  circuitsComplete,
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

var prevCircuits = []; // last state of circuits - background drawing
var currentCircuits = []; // dynamic current state of circuits - foreground drawing
var proposedCircuit = []; // circuit being drawn
var storagePrefix = "circuits.progress.";

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

function cloneCircuits(circuits) {
  return circuits.map(function (circuit) {
    return {
      color: circuit.color,
      points: circuit.points.map(function (point) {
        return { x: point.x, y: point.y };
      }),
    };
  });
}

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

function clearSavedProgress() {
  try {
    localStorage.removeItem(storageKey());
  } catch (e) {}
}

function loadSavedProgress() {
  try {
    var saved = JSON.parse(localStorage.getItem(storageKey()));

    if (!saved || !Array.isArray(saved.circuits)) return;

    prevCircuits = saved.circuits
      .map(function (circuit) {
        return sanitizeSavedCircuit(circuit);
      })
      .filter(Boolean);
    currentCircuits = cloneCircuits(prevCircuits);
  } catch (e) {
    prevCircuits = [];
    currentCircuits = [];
  }
}

function sanitizeSavedCircuit(circuit) {
  var colorIndex = colors.indexOf(circuit.color);

  if (
    colorIndex < 0 ||
    colorIndex >= board.nodes.length ||
    !Array.isArray(circuit.points) ||
    circuit.points.length === 0
  ) {
    return false;
  }

  var points = [];

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
  prevCircuits = [];
  currentCircuits = [];
  proposedCircuit = [];
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

function drawProposedCircuit() {
  try {
    if (proposedCircuit.length === 0) throw new Error("proposed circuit empty");

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

  var firstNode = compareCoords({ x: x, y: y }, proposedCircuit[0]);

  if (firstNode) return false;
  if (nodeColor(x, y) == proposedCircuitColor) return true;

  return false;
} // isMatchingNode()

function isInProposedCircuit(x, y) {
  var found = false;

  proposedCircuit.forEach(function (val, index) {
    var compare = compareCoords(val, { x: x, y: y });

    if (compare) found = true;
  });

  return found;
} // posInProposedCircuit()

function posInCircuits(x, y) {
  var found = false;

  currentCircuits.forEach(function (circuit, circuitIndex) {
    circuit.points.forEach(function (point, posIndex) {
      var compare = compareCoords(point, { x: x, y: y });
      if (compare) found = { circuit: circuitIndex, pos: posIndex };
    });
  });

  return found;
} // posInCircuits()

function colorInCircuits(color) {
  var found = false;

  currentCircuits.forEach(function (circuit, circuitIndex) {
    var compare = color === circuit.color;
    if (compare) found = circuitIndex;
  });

  return found;
} // colorInCircuits()

function posInProposedCircuit(x, y) {
  // if (proposedCircuit.length == 2) return false;
  var found = false;

  proposedCircuit.forEach(function (val, index) {
    var compare = compareCoords(val, { x: x, y: y });

    if (compare) found = index;
  });

  return found;
} // isInProposedCircuit()

function anyProposedInCurrentCircuits() {
  var slices = [];

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
  var newCircuits = [];

  currentCircuits.forEach(function (circuit, circuitIndex) {
    newCircuits.push({ color: circuit.color, points: [] });
    circuit.points.forEach(function (point, pointIndex) {
      newCircuits.last().points[pointIndex] = point;
    });
  });

  prevCircuits = newCircuits;

  proposedCircuitColor = undefined;
  proposedCircuitEnd = undefined;
  proposedCircuit = [];
} // backupCircuits()

function restoreCircuits() {
  currentCircuits = [];
  var newCircuits = [];

  for (var i = 0, j = prevCircuits.length; i < j; i++) {
    if (prevCircuits[i].color === proposedCircuitColor) {
      prevCircuits.splice(i, 1);
      j--;
    }
  }

  for (var i = 0, j = prevCircuits.length; i < j; i++) {
    newCircuits.push({ color: prevCircuits[i].color, points: [] });

    prevCircuits[i].points.forEach(function (point, pointIndex) {
      newCircuits.last().points[pointIndex] = point;
    });
  }

  currentCircuits = newCircuits;
} // restoreCircuits()

function calculateProportionFilled() {
  var total = 0;

  prevCircuits.forEach(function (val, index) {
    total += val.points.length;
  });

  total += proposedCircuit.length;

  total *= cellProportion;

  return total;
} // calculateProportionFilled()

function moveEvent(event) {
  if (!down) return false;
  event.preventDefault();

  try {
    var coords = posToCell(event.clientX, event.clientY);

    var same = compareCoords(proposedCircuit.last(), coords);
    var adjacent = isAdjacent(proposedCircuit.last(), coords);
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

function upEvent(event) {
  if (!down && proposedCircuit.length === 0) return;
  event.preventDefault();

  down = false;
  try {
    if (proposedCircuit.length !== 0) {
      currentCircuits.push({
        color: proposedCircuitColor,
        points: proposedCircuit,
      });
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

    var same = compareCoords(proposedCircuit.last(), coords);
    var adjacent = isAdjacent(proposedCircuit.last(), coords);
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

function upTouchEvent(event) {
  if (!down && proposedCircuit.length === 0) return;
  event.preventDefault();

  down = false;
  touchId = undefined;

  if (proposedCircuit.length !== 0) {
    currentCircuits.push({
      color: proposedCircuitColor,
      points: proposedCircuit,
    });
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

function updateBoard() {
  clear();
  drawGrid();
  drawNodes();
  drawCircuits();
  drawProposedCircuit();

  proportionFilled = calculateProportionFilled();
  if (completed) drawCompletionMessage();
}

function init() {
  var canvasRect = ctx.canvas.getBoundingClientRect();

  w = ctx.canvas.width = canvasRect.width;
  h = ctx.canvas.height = canvasRect.height;

  size = Math.min(w, h) * 0.9;

  cellSize = size / board.size;

  proposedCircuitColor = false;
  proposedCircuitEnd = false;

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
