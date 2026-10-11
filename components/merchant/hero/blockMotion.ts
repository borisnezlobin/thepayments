import { BLOCK_COUNT, CARD_WIDTH, blockCenter } from "./cardGeometry";

export const CHANNEL_COUNT = 3;
export const LIFT = 0;
export const PUSH_X = 1;
export const PUSH_Y = 2;

const INFLUENCE_RADIUS = CARD_WIDTH * 0.15;
const BELL_SHARPNESS = 2.2;
const INFLUENCE_FLOOR = 0.01;
const MAX_LIFT = 0.32;
const MAX_PUSH = 0.2;
const BLOCK_FREQUENCY = 8;
const MAX_STEP = 1 / 90;

export type Spring = { value: number; velocity: number };

export type CardPointer = { x: number; y: number; engagement: number };

export type BlockField = {
  centers: Float32Array;
  temperament: Float32Array;
  values: Float32Array;
  velocities: Float32Array;
};

const scratchTargets = new Float32Array(CHANNEL_COUNT);

export function createSpring(): Spring {
  return { value: 0, velocity: 0 };
}

function springAcceleration(value: number, velocity: number, target: number, frequency: number): number {
  return frequency * frequency * (target - value) - 2 * frequency * velocity;
}

export function stepSpring(spring: Spring, target: number, frequency: number, deltaSeconds: number) {
  for (let remaining = deltaSeconds; remaining > 0; remaining -= MAX_STEP) {
    const step = Math.min(remaining, MAX_STEP);
    spring.velocity += springAcceleration(spring.value, spring.velocity, target, frequency) * step;
    spring.value += spring.velocity * step;
  }
}

function seededUnit(index: number): number {
  const raw = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

export function createBlockField(): BlockField {
  const field: BlockField = {
    centers: new Float32Array(BLOCK_COUNT * 2),
    temperament: new Float32Array(BLOCK_COUNT),
    values: new Float32Array(BLOCK_COUNT * CHANNEL_COUNT),
    velocities: new Float32Array(BLOCK_COUNT * CHANNEL_COUNT),
  };
  for (let index = 0; index < BLOCK_COUNT; index += 1) {
    const center = blockCenter(index);
    field.centers[index * 2] = center.x;
    field.centers[index * 2 + 1] = center.y;
    field.temperament[index] = 0.7 + seededUnit(index) * 0.6;
  }
  return field;
}

function writeTargets(field: BlockField, index: number, pointer: CardPointer) {
  const offsetX = (field.centers[index * 2] - pointer.x) / INFLUENCE_RADIUS;
  const offsetY = (field.centers[index * 2 + 1] - pointer.y) / INFLUENCE_RADIUS;
  const reach = Math.exp(-(offsetX * offsetX + offsetY * offsetY) * BELL_SHARPNESS);
  const bell = (Math.max(0, reach - INFLUENCE_FLOOR) / (1 - INFLUENCE_FLOOR)) * pointer.engagement;
  scratchTargets[LIFT] = MAX_LIFT * bell * field.temperament[index];
  scratchTargets[PUSH_X] = MAX_PUSH * offsetX * bell;
  scratchTargets[PUSH_Y] = MAX_PUSH * offsetY * bell;
}

function stepChannel(field: BlockField, slot: number, target: number, deltaSeconds: number) {
  for (let remaining = deltaSeconds; remaining > 0; remaining -= MAX_STEP) {
    const step = Math.min(remaining, MAX_STEP);
    field.velocities[slot] += springAcceleration(field.values[slot], field.velocities[slot], target, BLOCK_FREQUENCY) * step;
    field.values[slot] += field.velocities[slot] * step;
  }
}

export function advanceBlockField(field: BlockField, pointer: CardPointer, deltaSeconds: number) {
  for (let index = 0; index < BLOCK_COUNT; index += 1) {
    writeTargets(field, index, pointer);
    for (let channel = 0; channel < CHANNEL_COUNT; channel += 1) {
      stepChannel(field, index * CHANNEL_COUNT + channel, scratchTargets[channel], deltaSeconds);
    }
  }
}

export function settleBlockField(field: BlockField, pointer: CardPointer) {
  for (let index = 0; index < BLOCK_COUNT; index += 1) {
    writeTargets(field, index, pointer);
    field.values.set(scratchTargets, index * CHANNEL_COUNT);
  }
  field.velocities.fill(0);
}
