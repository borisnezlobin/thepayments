import { Vector2, type Material, type WebGLProgramParametersWithUniforms } from "three";
import { BLOCK_COLUMNS, BLOCK_ROWS, CARD_CORNER_RADIUS, CARD_HEIGHT, CARD_WIDTH } from "./cardGeometry";

const CARVE_TOLERANCE = 0.002;

const vertexDeclarations = `#include <common>
attribute vec2 cellOrigin;
uniform vec2 cellSize;
uniform vec2 cardSize;
varying vec2 vCardPoint;`;

const vertexCardPoint = `#include <begin_vertex>
vCardPoint = (cellOrigin + cellSize * 0.5) * cardSize - cardSize * 0.5 + position.xy;`;

const fragmentDeclarations = `#include <common>
uniform vec2 cardSize;
uniform float cornerRadius;
varying vec2 vCardPoint;`;

const fragmentCarve = `void main() {
  vec2 cornerOffset = abs(vCardPoint) - cardSize * 0.5 + cornerRadius;
  float outsideCard = length(max(cornerOffset, 0.0)) + min(max(cornerOffset.x, cornerOffset.y), 0.0) - cornerRadius;
  if (outsideCard > ${CARVE_TOLERANCE}) discard;`;

const faceUvPatch = `#include <uv_vertex>
vec2 cardUv = cellOrigin + uv * cellSize;
#ifdef USE_MAP
vMapUv = cardUv;
#endif
#ifdef USE_ROUGHNESSMAP
vRoughnessMapUv = cardUv;
#endif
#ifdef USE_METALNESSMAP
vMetalnessMapUv = cardUv;
#endif`;

function carveIntoCard(shader: WebGLProgramParametersWithUniforms) {
  shader.uniforms.cellSize = { value: new Vector2(1 / BLOCK_COLUMNS, 1 / BLOCK_ROWS) };
  shader.uniforms.cardSize = { value: new Vector2(CARD_WIDTH, CARD_HEIGHT) };
  shader.uniforms.cornerRadius = { value: CARD_CORNER_RADIUS };
  shader.vertexShader = shader.vertexShader.replace("#include <common>", vertexDeclarations).replace("#include <begin_vertex>", vertexCardPoint);
  shader.fragmentShader = shader.fragmentShader.replace("#include <common>", fragmentDeclarations).replace("void main() {", fragmentCarve);
}

export function shapeAsCardFace(material: Material) {
  material.onBeforeCompile = (shader) => {
    carveIntoCard(shader);
    shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", faceUvPatch);
  };
  material.customProgramCacheKey = () => "card-block-face";
}

export function shapeAsCardShell(material: Material, role: string) {
  material.onBeforeCompile = carveIntoCard;
  material.customProgramCacheKey = () => `card-block-${role}`;
}
