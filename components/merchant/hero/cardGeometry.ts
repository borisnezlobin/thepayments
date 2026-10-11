import { BufferGeometry, Float32BufferAttribute, Vector2 } from "three";

export const CARD_WIDTH = 8.56;
export const CARD_HEIGHT = 5.4;
export const CARD_DEPTH = 0.08;
export const CARD_CORNER_RADIUS = 0.318;
export const STRIP_COUNT = 26;
export const STRIP_WIDTH = CARD_WIDTH / STRIP_COUNT;

export const FACE_MATERIAL_INDEX = 0;
export const BACK_MATERIAL_INDEX = 1;
export const EDGE_MATERIAL_INDEX = 2;

const CORNER_SEGMENTS = 12;
const MIN_EDGE_LENGTH = 1e-6;

type Normal = readonly [number, number, number];

type MeshArrays = { positions: number[]; normals: number[]; uvs: number[] };

function cornerArc(centerX: number, centerY: number, startAngle: number): Vector2[] {
  const points: Vector2[] = [];
  for (let step = 0; step <= CORNER_SEGMENTS; step += 1) {
    const angle = startAngle + (step / CORNER_SEGMENTS) * (Math.PI / 2);
    points.push(new Vector2(centerX + Math.cos(angle) * CARD_CORNER_RADIUS, centerY + Math.sin(angle) * CARD_CORNER_RADIUS));
  }
  return points;
}

function cardOutline(): Vector2[] {
  const innerX = CARD_WIDTH / 2 - CARD_CORNER_RADIUS;
  const innerY = CARD_HEIGHT / 2 - CARD_CORNER_RADIUS;
  return [
    ...cornerArc(innerX, -innerY, -Math.PI / 2),
    ...cornerArc(innerX, innerY, 0),
    ...cornerArc(-innerX, innerY, Math.PI / 2),
    ...cornerArc(-innerX, -innerY, Math.PI),
  ];
}

function intersectVertical(from: Vector2, to: Vector2, lineX: number): Vector2 {
  const progress = (lineX - from.x) / (to.x - from.x);
  return new Vector2(lineX, from.y + (to.y - from.y) * progress);
}

function clipToSideOf(polygon: Vector2[], lineX: number, keepRight: boolean): Vector2[] {
  const isKept = (point: Vector2) => (keepRight ? point.x >= lineX : point.x <= lineX);
  const clipped: Vector2[] = [];
  polygon.forEach((current, index) => {
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const currentKept = isKept(current);
    if (currentKept !== isKept(previous)) clipped.push(intersectVertical(previous, current, lineX));
    if (currentKept) clipped.push(current);
  });
  return clipped;
}

export function stripCenterX(index: number): number {
  return -CARD_WIDTH / 2 + (index + 0.5) * STRIP_WIDTH;
}

function stripOutline(index: number): Vector2[] {
  const left = -CARD_WIDTH / 2 + index * STRIP_WIDTH;
  let polygon = cardOutline();
  if (index > 0) polygon = clipToSideOf(polygon, left, true);
  if (index < STRIP_COUNT - 1) polygon = clipToSideOf(polygon, left + STRIP_WIDTH, false);
  return polygon;
}

function pushVertex(arrays: MeshArrays, position: readonly [number, number, number], normal: Normal, uv: readonly [number, number]) {
  arrays.positions.push(...position);
  arrays.normals.push(...normal);
  arrays.uvs.push(...uv);
}

function faceUv(point: Vector2): [number, number] {
  return [(point.x + CARD_WIDTH / 2) / CARD_WIDTH, (point.y + CARD_HEIGHT / 2) / CARD_HEIGHT];
}

function addCap(arrays: MeshArrays, polygon: Vector2[], centerX: number, facing: 1 | -1) {
  const z = (facing * CARD_DEPTH) / 2;
  const normal: Normal = [0, 0, facing];
  for (let index = 1; index < polygon.length - 1; index += 1) {
    const triangle = facing === 1 ? [polygon[0], polygon[index], polygon[index + 1]] : [polygon[0], polygon[index + 1], polygon[index]];
    triangle.forEach((point) => pushVertex(arrays, [point.x - centerX, point.y, z], normal, faceUv(point)));
  }
}

function addEdgeWall(arrays: MeshArrays, start: Vector2, end: Vector2, centerX: number) {
  const edge = end.clone().sub(start);
  const length = edge.length();
  if (length < MIN_EDGE_LENGTH) return;
  const normal: Normal = [edge.y / length, -edge.x / length, 0];
  const front = CARD_DEPTH / 2;
  const corners: Array<[Vector2, number]> = [
    [start, -front],
    [end, -front],
    [end, front],
    [start, -front],
    [end, front],
    [start, front],
  ];
  corners.forEach(([point, z]) => pushVertex(arrays, [point.x - centerX, point.y, z], normal, faceUv(point)));
}

function vertexCount(arrays: MeshArrays): number {
  return arrays.positions.length / 3;
}

export function buildStripGeometry(index: number): BufferGeometry {
  const polygon = stripOutline(index);
  const centerX = stripCenterX(index);
  const arrays: MeshArrays = { positions: [], normals: [], uvs: [] };
  addCap(arrays, polygon, centerX, 1);
  const faceVertices = vertexCount(arrays);
  addCap(arrays, polygon, centerX, -1);
  const capVertices = vertexCount(arrays);
  polygon.forEach((start, edgeIndex) => addEdgeWall(arrays, start, polygon[(edgeIndex + 1) % polygon.length], centerX));

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(arrays.positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(arrays.normals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(arrays.uvs, 2));
  geometry.addGroup(0, faceVertices, FACE_MATERIAL_INDEX);
  geometry.addGroup(faceVertices, capVertices - faceVertices, BACK_MATERIAL_INDEX);
  geometry.addGroup(capVertices, vertexCount(arrays) - capVertices, EDGE_MATERIAL_INDEX);
  geometry.computeBoundingSphere();
  return geometry;
}
