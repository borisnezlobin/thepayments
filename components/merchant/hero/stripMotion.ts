import { CARD_HEIGHT, CARD_WIDTH, STRIP_COUNT, stripCenterX } from "./cardGeometry";

const INFLUENCE_RADIUS = CARD_WIDTH * 0.22;
const MAX_LIFT = 0.28;
const MAX_DRIFT = 0.5;
const MAX_TURN = 0.09;
const BELL_SHARPNESS = 2.2;
const VERTICAL_SHARPNESS = 3;
const STRIP_FREQUENCY = 9;
const MAX_STEP = 1 / 90;

export type Spring = { value: number; velocity: number };

export type StripMotion = { centerX: number; lift: Spring; drift: Spring; turn: Spring };

export type CardPointer = { x: number; y: number; engagement: number };

export function createSpring(): Spring {
  return { value: 0, velocity: 0 };
}

export function stepSpring(spring: Spring, target: number, frequency: number, deltaSeconds: number) {
  let remaining = deltaSeconds;
  while (remaining > 0) {
    const step = Math.min(remaining, MAX_STEP);
    const acceleration = frequency * frequency * (target - spring.value) - 2 * frequency * spring.velocity;
    spring.velocity += acceleration * step;
    spring.value += spring.velocity * step;
    remaining -= step;
  }
}

export function createStripMotions(): StripMotion[] {
  return Array.from({ length: STRIP_COUNT }, (_, index) => ({
    centerX: stripCenterX(index),
    lift: createSpring(),
    drift: createSpring(),
    turn: createSpring(),
  }));
}

function verticalReach(pointerY: number): number {
  const outside = Math.max(0, Math.abs(pointerY) - CARD_HEIGHT / 2) / INFLUENCE_RADIUS;
  return Math.exp(-outside * outside * VERTICAL_SHARPNESS);
}

function stripTargets(strip: StripMotion, pointer: CardPointer) {
  const spread = (strip.centerX - pointer.x) / INFLUENCE_RADIUS;
  const bell = Math.exp(-spread * spread * BELL_SHARPNESS) * verticalReach(pointer.y) * pointer.engagement;
  return {
    lift: MAX_LIFT * bell,
    drift: MAX_DRIFT * spread * bell,
    turn: MAX_TURN * Math.max(-1, Math.min(1, spread * 2.4)) * bell,
  };
}

export function advanceStripMotions(strips: StripMotion[], pointer: CardPointer, deltaSeconds: number) {
  strips.forEach((strip) => {
    const targets = stripTargets(strip, pointer);
    stepSpring(strip.lift, targets.lift, STRIP_FREQUENCY, deltaSeconds);
    stepSpring(strip.drift, targets.drift, STRIP_FREQUENCY, deltaSeconds);
    stepSpring(strip.turn, targets.turn, STRIP_FREQUENCY, deltaSeconds);
  });
}

export function settleStripMotions(strips: StripMotion[], pointer: CardPointer) {
  strips.forEach((strip) => {
    const targets = stripTargets(strip, pointer);
    strip.lift.value = targets.lift;
    strip.drift.value = targets.drift;
    strip.turn.value = targets.turn;
  });
}
