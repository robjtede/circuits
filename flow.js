document.addEventListener("DOMContentLoaded", function (event) {

// insert canvas
document.body.appendChild(document.createElement("canvas"));
var ctx = document.querySelector("canvas").getContext("2d");

// initialize vars
var w, h, size, cellSize, down, touchId, proposedFlowColor, proposedFlowEnd;

var colors = ["red", "green", "blue", "yellow", "orange"];
var board = {
	size: 5,
	nodes: [
		[
			{x: 0, y:0},
			{x: 1, y:4}
			
		], [
			{x: 2, y:0},
			{x: 1, y:3}
			
		], [
			{x: 2, y:1},
			{x: 2, y:4}
			
		], [
			{x: 4, y:0},
			{x: 3, y:3}
			
		], [
			{x: 4, y:1},
			{x: 3, y:4}
			
		]
		
	]
}; // game settings object

var prevFlows = []; // last state of flows - background drawing
var currentFlows = []; // dynamic current state of slows - foreground drawing
var proposedFlow = []; // flow being drawn

function clear() {
	
	ctx.clearRect(0, 0, w, h);
	
}// clear()

Array.prototype.last = function () {
	
	var len = this.length;
	var last = this[len - 1];
	
	return last;
	
}// Array.last()

function drawGrid(cells) {
	
	for (var i=0; i<=board.size; i++) {
		
		// vertical lines
		ctx.save();
		ctx.strokeStyle = "white";
		ctx.beginPath();
		ctx.moveTo(w/2 - size/2 + i*cellSize, h/2 - size/2);
		ctx.lineTo(w/2 - size/2 + i*cellSize, h/2 + size/2);
		ctx.stroke();
		ctx.restore();
		
		// horizontal lines
		ctx.save();
		ctx.strokeStyle = "white";
		ctx.beginPath();
		ctx.moveTo(w/2 - size/2, h/2 - size/2 + i*cellSize);
		ctx.lineTo(w/2 + size/2, h/2 - size/2 + i*cellSize);
		ctx.stroke();
		ctx.restore();
		
	}// for i
	
}// grid()

function drawNodes() {
	
	board.nodes.forEach(function (val, index) {
		drawNode(val[0].x, val[0].y, colors[index]);
		drawNode(val[1].x, val[1].y, colors[index]);
		
	});// nodes forEach
	
}// drawNodes()

function drawNode(x, y, color) {
	color = typeof color === "undefined" ? "white" : color; 
	
	var pos = centerPos(x, y);
	
	ctx.save();
	ctx.fillStyle = color;
	
	ctx.beginPath();
	ctx.arc(pos.x, pos.y, cellSize/2.5, 0, Math.PI*2, false);
	ctx.closePath();
	ctx.fill();
	
	ctx.restore();
	
}// drawNode()

function centerPos(cx, cy) {
	
	var cx = w/2 - size/2 + cx*cellSize + cellSize/2;
	var cy = h/2 - size/2 + cy*cellSize + cellSize/2;
	
	return {x: cx, y: cy}
	
}// centerPos()

function topLeftPos(cx, cy) {
	
	var x = w/2 - size/2 + cx*cellSize;
	var y = h/2 - size/2 + cy*cellSize;
	
	return {x: x, y: y}
	
}// centerPos()

function posToCell(cx, cy) {
	
	var x = cx;
	var y = cy;
	
	x -= (w/2 - size/2);
	x /= cellSize;
	x = Math.floor(x);
	
	y -= (h/2 - size/2);
	y /= cellSize;
	y = Math.floor(y);
	
	if (x < 0) throw new Error("x result is less than 0");
	if (x > board.size-1) throw new Error("x result is greater than board");
	if (y < 0) throw new Error("y result is less than 0");
	if (y > board.size-1) throw new Error("y result is greater than board");
	
	
	return {x: x, y: y}
	
}// posToCell()

function compareCoords(c1, c2) {
	
	if (c1.x !== c2.x) return false;
	if (c1.y !== c2.y) return false;
	return true;
	
}// compareCoords()

function isAdjacent(c1, c2) {
	
	if (
		(c2.x == c1.x + 1 && c2.y == c1.y) ||
		(c2.x == c1.x - 1 && c2.y == c1.y) ||
		(c2.x == c1.x && c2.y == c1.y + 1) ||
		(c2.x == c1.x && c2.y == c1.y - 1)
	) return true;
	
	return false;
	
}// isAdjacent()

function isNode(x, y) {
	
	var found = false;
	
	board.nodes.forEach(function (val, index) {
		
		if (val[0].x == x && val[0].y == y) found = true;
		if (val[1].x == x && val[1].y == y) found = true;
		
	});
	
	return found;
	
}// isNode()

function nodeColor(x, y) {
	
	var found = false;
	
	board.nodes.forEach(function (val, index) {
		
		if (val[0].x == x && val[0].y == y) found = colors[index];
		if (val[1].x == x && val[1].y == y) found = colors[index];
		
	});
	
	return found;
	
}// nodeColor()

function drawProposedFlow() {
	
	try {
		
		if (proposedFlow.length === 0) throw new Error("proposed flow empty");
		
		ctx.save();
		ctx.strokeStyle = proposedFlowColor;
		ctx.lineWidth = 35;
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
	
}// drawProposedFlow()

function drawFlows() {
	
	try {
		if (currentFlows.length === 0) throw new Error("flows empty");
		
		ctx.save();
		ctx.lineWidth = 35;
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
	
}// drawFlows()

function isMatchingNode(x, y) {
	if (!isNode(x, y)) return false; // error - not a node
	
	var firstNode = compareCoords({x: x, y: y}, proposedFlow[0]);
	
	if (firstNode) return false;
	if (nodeColor(x, y) == proposedFlowColor) return true;
	
	return false;
	
}// isMatchingNode()

function isInProposedFlow(x, y) {
	
	var found = false;
	
	proposedFlow.forEach(function (val, index) {
		
		var compare = compareCoords(val, {x: x, y: y});
		
		if (compare) found = true;
		
	});
	
	return found;
	
}// posInProposedFlow()

function posInFlows(x, y) {
	
	var found = false;
	
	currentFlows.forEach(function (flow, flowIndex) {
		
		flow.points.forEach(function (point, posIndex) {
			var compare = compareCoords(point, {x: x, y: y});
			if (compare) found = {flow: flowIndex, pos: posIndex};
			
		});
		
	});
	
	return found;
	
}// posInFlows()

function colorInFlows(color) {
	var found = false;
	
	currentFlows.forEach(function (flow, flowIndex) {
		
		var compare = (color === flow.color);
		if (compare) found = flowIndex;
		
	});
	
	return found;
	
}// colorInFlows()

function posInProposedFlow(x, y) {
	
	// if (proposedFlow.length == 2) return false;
	var found = false;
	
	proposedFlow.forEach(function (val, index) {
		
		var compare = compareCoords(val, {x: x, y: y});
		
		if (compare) found = index;
		
	});
	
	return found;
	
}// isInProposedFlow()

function anyProposedInCurrentFlows() {
	
	var slices = [];
	
	for (var i=0; i<proposedFlow.length; i++) {
		for (var j=0; j<currentFlows.length; j++) {
			var compare = false;
			for (var k=0; k<currentFlows[j].points.length; k++) {
				compare = compareCoords(proposedFlow[i], currentFlows[j].points[k]);
				
				if (compare) {
					slices.push({flow: j, pos: k});
					break;
				}
				
			}// for k
			
			if (compare) {
				break;
			}
			
		}// for j
		
	}// for i
	
	if (slices.length === 0) return false;
	return slices;
	
}// anyProposedInCurrentFlows()

function backupFlows() {
	
	prevFlows = [];
	
	currentFlows.forEach(function (flow, flowIndex) {
		
		prevFlows[flowIndex] = {};
		prevFlows[flowIndex].color = flow.color;
		prevFlows[flowIndex].points = [];
		
		
		flow.points.forEach(function (point, pointIndex) {
			
			prevFlows[flowIndex].points[pointIndex] = point;
			
		});
		
		
	});
	
	proposedFlowColor = undefined;
	proposedFlowEnd = undefined;
	proposedFlow = [];
	
}// backupFlows()

function restoreFlows() {
	
	currentFlows = [];
	var newFlows = [];
	
	for (var i=0, j=prevFlows.length; i<j; i++) {
		if (prevFlows[i].color === proposedFlowColor) {
			prevFlows.splice(i, 1);
			
		}
		
	}
	
	for (var i=0, j=prevFlows.length; i<j; i++) {
		
		newFlows.push({ color: prevFlows[i].color, points: [] });
		
		prevFlows[i].points.forEach(function (point, pointIndex) {
			newFlows.last().points[pointIndex] = point;
			
		});
		
	}
	
	currentFlows = newFlows;
	
}// restoreFlows()

function moveEvent(event) {
	event.preventDefault();
	if (!down) return false;
	
	try {
		var coords = posToCell(event.pageX, event.pageY);
		
		var same = compareCoords(proposedFlow.last(), coords);
		var adjacent = isAdjacent(proposedFlow.last(), coords);
		var node = nodeColor(coords.x, coords.y);
		var matchingNode = isMatchingNode(coords.x, coords.y);
		var inProposedFlow = posInProposedFlow(coords.x, coords.y);
		
		if (
			!same && adjacent &&
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
			if ( posInfo !== false ) {
				
				posInfo.forEach(function (val, index) {
					currentFlows[val.flow].points =
					currentFlows[val.flow].points.slice(0, val.pos);
					
				});
				
			}
			
			updateBoard();
		}
		
		
	} catch (e) {}
	
}// moveEvent()

function downEvent(event) {
	if (event.button !== 0) return;
	event.preventDefault();
	
	down = true;
	
	try {
		var coords = posToCell(event.pageX, event.pageY);
		var node = nodeColor(coords.x, coords.y);
		var flowExists = posInFlows(coords.x, coords.y);
		if (flowExists !== false) {
			var flow = currentFlows.splice(flowExists.flow, 1)[0];
			proposedFlow = flow.points.slice(0, flowExists.pos + 1);
			proposedFlowColor = flow.color;
			
		} else {
			if (node == false) return;
			var colorExists = colorInFlows(node);
			proposedFlowColor = node;
			
			if (colorExists !== false) {
				currentFlows.splice(colorExists, 1);
				
			}
			
			proposedFlow.push(coords);
			
		}
		
		restoreFlows();
		updateBoard();
		
	} catch (e) {}
	
}// downEvent()

function upEvent(event) {
	event.preventDefault();
	
	down = false;
	
	if (proposedFlow.length !== 0) {
		currentFlows.push({
			color: proposedFlowColor,
			points: proposedFlow
			
		});
		
	}
	
	backupFlows();
	
	try {
		updateBoard();
		
	} catch (e) { console.warn("updateBoard errored"); }
	
}// upEvent()

function moveTouchEvent(event) {
	event.preventDefault();
	if (!down) return false;
	
	try {
		for (var i=0; i<event.touches.length; i++) {
			if (event.touches[i].identifier == touchId) {
				var coords = posToCell(event.touches[i].pageX, event.touches[i].pageY);
				
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
				proposedFlow = proposedFlow.slice(0, inProposedFlow + 1);
				
			}
			
			proposedFlowEnd = matchingNode ? true : false;
			updateBoard();
		}
		
		
	} catch (e) {}
	
}// moveTouchEvent()

function downTouchEvent(event) {
	event.preventDefault();
	
	touchId = event.touches[0].identifier;
	down = true;
	
	try {
		for (var i=0; i<event.touches.length; i++) {
			if (event.touches[i].identifier == touchId) {
				var coords = posToCell(event.touches[i].pageX, event.touches[i].pageY);
				
			}
			
		}
			
		var node = nodeColor(coords.x, coords.y);
		var flowExists = posInFlows(coords.x, coords.y);
		
		if (flowExists !== false) {
			var flow = currentFlows.splice(flowExists.flow, 1)[0];
			proposedFlow = flow.points.slice(0, flowExists.pos + 1);
			proposedFlowColor = flow.color;
			
		} else {
			if (node == false) return;
			var colorExists = colorInFlows(node);
			proposedFlowColor = node;
			
			if (colorExists !== false) {
				currentFlows.splice(colorExists, 1);
				
			}
			
			proposedFlow.push(coords);
			
		}
		
		updateBoard();
		
	} catch (e) {}
	
}// downTouchEvent()

function upTouchEvent(event) {
	event.preventDefault();
	
	down = false;
	touchId = undefined;
	
	if (proposedFlow.length !== 0) {
		currentFlows.push({
			color: proposedFlowColor,
			points: proposedFlow
			
		});
		
	}
	
	proposedFlowColor = undefined;
	proposedFlowEnd = undefined;
	
	proposedFlow = [];
	try {
		updateBoard();
		
	} catch (e) {}
	
}// upTouchEvent()

function updateBoard() {
	
	clear();
	drawGrid();
	drawNodes();
	drawFlows();
	drawProposedFlow();
	
}

function init() {
	
	w = ctx.canvas.width = window.innerWidth;
	h = ctx.canvas.height = window.innerHeight;
	
	size = Math.min(w, h) * 0.9;

	cellSize = size / board.size;
	
	proposedFlowColor = false;
	proposedFlowEnd = false;
	
	clear();
	drawGrid();
	drawNodes();
	
}// init()

init();

window.addEventListener("mousedown", downEvent);
window.addEventListener("mousemove", moveEvent);
window.addEventListener("mouseup", upEvent);

window.addEventListener("touchstart", downTouchEvent);
window.addEventListener("touchmove", moveTouchEvent);
window.addEventListener("touchend", upTouchEvent);
window.addEventListener("touchcancel", upTouchEvent);

});// DOMContentLoaded
