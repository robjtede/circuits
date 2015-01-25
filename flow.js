document.addEventListener("DOMContentLoaded", function (event) {

var canvas = document.createElement("canvas");
document.body.appendChild(canvas);

var w = canvas.width = window.innerWidth;
var h = canvas.height = window.innerHeight;

var ctx = canvas.getContext("2d");

var colors = ["red", "green", "blue", "yellow", "orange"];
var board = {
	size: 5,
	nodes: [
		[
			[0, 0],
			[1, 4]
			
		], [
			[2, 0],
			[1, 3]
			
		], [
			[2, 1],
			[2, 4]
			
		], [
			[4, 0],
			[3, 3]
			
		], [
			[4, 1],
			[3, 4]
			
		]
		
	]
}; // game settings object

var lastFlows = {}; // last state of flows - background drawing
var currentFlows = {}; // dynamic current state of slows - foreground drawing
var proposedFlow = {}; // flow being drawn

var size = h < w ? h : w;
size *= 0.9;

var cellSize = size / board.size;

function grid (cells) {
	
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

function drawNodes () {
	
	board.nodes.forEach(function (val, index) {
		drawNode(val[0][0], val[0][1], colors[index]);
		drawNode(val[1][0], val[1][1], colors[index]);
		
	});// nodes forEach
	
}// drawNodes()

function drawNode (x, y, color) {
	color = typeof color === "undefined" ? "white" : color; 
	
	var pos = centerPos(x, y);
	
	ctx.save();
	ctx.fillStyle = color;
	
	ctx.beginPath();
	ctx.arc(pos.x, pos.y, cellSize/2.5, 0, Math.PI*2, false);
	ctx.closePath();
	ctx.fill();
	
	ctx.restore();
	
}// drawNode

function centerPos (x, y) {
	
	var x = w/2 - size/2 + x*cellSize + cellSize/2;
	var y = h/2 - size/2 + y*cellSize + cellSize/2;
	
	return {x: x, y: y}
	
}// centerPos

function init () {
	
	grid();
	drawNodes();
	
}// init()

init();

});// DOMContentLoaded
