import { MathUtils, type Group, type PerspectiveCamera } from "three";
import { CARD_HEIGHT, CARD_WIDTH } from "./cardGeometry";

const CARD_ASPECT = CARD_WIDTH / CARD_HEIGHT;
const WIDE_LAYOUT_MIN_WIDTH = 1024;
const CONTENT_MAX_WIDTH = 1152;
const CONTENT_GUTTER = 24;
const TEXT_COLUMN_WIDTH = 576;
const CARD_CLEARANCE = 64;
const WIDE_MAX_WIDTH_OF_VIEWPORT = 0.42;
const WIDE_MAX_HEIGHT_OF_VIEWPORT = 0.5;
const NARROW_MAX_WIDTH_OF_VIEWPORT = 0.68;
const NARROW_MAX_HEIGHT_OF_VIEWPORT = 0.2;
const NARROW_CENTER_OF_HEIGHT = 0.19;
const NAV_CLEARANCE = 88;

type Pose = { x: number; y: number; z: number };

export type CardFraming = { centerX: number; centerY: number; cardWidth: number; pose: Pose };

const WIDE_POSE: Pose = { x: 0.12, y: -0.24, z: 0.06 };
const NARROW_POSE: Pose = { x: 0.14, y: -0.12, z: 0.04 };

function wideFraming(width: number, height: number): CardFraming {
  const contentLeft = Math.max(0, (width - CONTENT_MAX_WIDTH) / 2);
  const availableLeft = contentLeft + CONTENT_GUTTER + TEXT_COLUMN_WIDTH + CARD_CLEARANCE;
  const availableRight = width - CARD_CLEARANCE;
  const cardWidth = Math.min(
    width * WIDE_MAX_WIDTH_OF_VIEWPORT,
    availableRight - availableLeft,
    height * WIDE_MAX_HEIGHT_OF_VIEWPORT * CARD_ASPECT,
  );
  return { centerX: (availableLeft + availableRight) / 2, centerY: height / 2, cardWidth, pose: WIDE_POSE };
}

function narrowFraming(width: number, height: number): CardFraming {
  const cardWidth = Math.min(width * NARROW_MAX_WIDTH_OF_VIEWPORT, height * NARROW_MAX_HEIGHT_OF_VIEWPORT * CARD_ASPECT);
  const cardHeight = cardWidth / CARD_ASPECT;
  const centerY = Math.max(NAV_CLEARANCE + cardHeight / 2, height * NARROW_CENTER_OF_HEIGHT);
  return { centerX: width / 2, centerY, cardWidth, pose: NARROW_POSE };
}

export function framingFor(width: number, height: number): CardFraming {
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH && width > height;
  return wide ? wideFraming(width, height) : narrowFraming(width, height);
}

export function applyFraming(camera: PerspectiveCamera, stage: Group, framing: CardFraming, width: number, height: number) {
  const aspect = width / height;
  const viewSlope = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2));
  camera.aspect = aspect;
  camera.position.set(0, 0, (CARD_WIDTH * width) / (framing.cardWidth * viewSlope * aspect));
  camera.rotation.set(0, 0, 0);
  camera.setViewOffset(width, height, width / 2 - framing.centerX, height / 2 - framing.centerY, width, height);
  camera.updateProjectionMatrix();
  stage.rotation.set(framing.pose.x, framing.pose.y, framing.pose.z);
}
