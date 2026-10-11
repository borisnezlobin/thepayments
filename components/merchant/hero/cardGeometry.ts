import { BoxGeometry, InstancedBufferAttribute } from "three";

export const CARD_WIDTH = 8.56;
export const CARD_HEIGHT = 5.4;
export const CARD_CORNER_RADIUS = 0.318;
export const BLOCK_COLUMNS = 24;
export const BLOCK_ROWS = 15;
export const BLOCK_COUNT = BLOCK_COLUMNS * BLOCK_ROWS;
export const BLOCK_WIDTH = CARD_WIDTH / BLOCK_COLUMNS;
export const BLOCK_HEIGHT = CARD_HEIGHT / BLOCK_ROWS;
export const BLOCK_DEPTH = 0.14;

export const FACE_MATERIAL_INDEX = 4;
export const BACK_MATERIAL_INDEX = 5;

export function blockCenter(index: number): { x: number; y: number } {
  return {
    x: -CARD_WIDTH / 2 + ((index % BLOCK_COLUMNS) + 0.5) * BLOCK_WIDTH,
    y: -CARD_HEIGHT / 2 + (Math.floor(index / BLOCK_COLUMNS) + 0.5) * BLOCK_HEIGHT,
  };
}

function cellOrigins(): Float32Array {
  const origins = new Float32Array(BLOCK_COUNT * 2);
  for (let index = 0; index < BLOCK_COUNT; index += 1) {
    origins[index * 2] = (index % BLOCK_COLUMNS) / BLOCK_COLUMNS;
    origins[index * 2 + 1] = Math.floor(index / BLOCK_COLUMNS) / BLOCK_ROWS;
  }
  return origins;
}

export function buildBlockGeometry(): BoxGeometry {
  const geometry = new BoxGeometry(BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH);
  geometry.setAttribute("cellOrigin", new InstancedBufferAttribute(cellOrigins(), 2));
  return geometry;
}
