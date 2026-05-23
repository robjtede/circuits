export type Cell = [number, number];
export type Point = { x: number; y: number };
export type NodePair = [Point, Point];
export type Level = {
  id: string;
  name: string;
  size: number;
  nodes: NodePair[];
};
export type LevelGroup = { id: string; name: string; levels: Level[] };
export type LevelBoard = Pick<Level, "size" | "nodes">;
export type Circuit = { color: string; points: Point[] };
export type CircuitPosition = { circuit: number; pos: number };

declare global {
  interface Array<T> {
    first(): T | undefined;
    last(): T | undefined;
  }
}
