import {
  DirectionalLight,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createCardTextures, type CardTextures } from "./cardFaceTexture";
import { applyFraming, framingFor, type CardFraming } from "./cardFraming";
import { CARD_HEIGHT, CARD_WIDTH } from "./cardGeometry";
import { buildCardModel, poseBlocks, type CardModel } from "./cardModel";
import { CARD_PALETTE } from "./cardPalette";
import { trackPointer, type PointerTracker } from "./pointerInput";
import { advanceBlockField, createBlockField, createSpring, settleBlockField, stepSpring, type CardPointer } from "./blockMotion";

const CAMERA_FOV = 26;
const MAX_PIXEL_RATIO = 2;
const MAX_FRAME_SECONDS = 1 / 20;
const TILT_YAW = 0.06;
const TILT_PITCH = 0.045;
const TILT_FREQUENCY = 3.5;
const ENGAGEMENT_FREQUENCY = 5;
const IDLE_SWAY = 0.015;
const IDLE_BOB = 0.05;
const STILL_POINTER: CardPointer = { x: CARD_WIDTH * 0.22, y: CARD_HEIGHT * 0.12, engagement: 0.6 };

type ScreenRect = { left: number; top: number; width: number; height: number };

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

function containsPoint(rect: ScreenRect, clientX: number, clientY: number): boolean {
  return clientX >= rect.left && clientX <= rect.left + rect.width && clientY >= rect.top && clientY <= rect.top + rect.height;
}

function createRenderer(): WebGLRenderer {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  renderer.domElement.className = "block size-full";
  return renderer;
}

function createEnvironment(renderer: WebGLRenderer): Texture {
  const generator = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = generator.fromScene(room, 0.04).texture;
  room.dispose();
  generator.dispose();
  return texture;
}

export class ShreddedCardStage {
  private readonly renderer = createRenderer();
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 500);
  private readonly environment: Texture;
  private readonly textures: CardTextures;
  private readonly model: CardModel;
  private readonly field = createBlockField();
  private readonly pointer: PointerTracker = trackPointer();
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly raycaster = new Raycaster();
  private readonly cardPlane = new Plane();
  private readonly planeNormal = new Vector3();
  private readonly planePoint = new Vector3();
  private readonly hit = new Vector3();
  private readonly pointerNdc = new Vector2();
  private readonly cardPointer: CardPointer = { x: 0, y: 0, engagement: 0 };
  private readonly engagement = createSpring();
  private readonly tiltPitch = createSpring();
  private readonly tiltYaw = createSpring();
  private readonly screenOffset = new Vector2();
  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;
  private framing: CardFraming = framingFor(1, 1);
  private frameHandle = 0;
  private lastFrameTime = 0;
  private elapsed = 0;
  private onScreen = true;
  private ready = false;

  constructor(private readonly container: HTMLElement) {
    container.appendChild(this.renderer.domElement);
    this.environment = createEnvironment(this.renderer);
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.6;
    const key = new DirectionalLight(CARD_PALETTE.keyLight, 1.3);
    key.position.set(-4, 6, 8);
    this.scene.add(key);
    this.textures = createCardTextures(this.renderer, this.handleTextureRepaint);
    this.model = buildCardModel(this.textures);
    this.scene.add(this.model.stage);

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.intersectionObserver = new IntersectionObserver(this.handleIntersection);
    this.intersectionObserver.observe(container);
    document.addEventListener("visibilitychange", this.syncLoop);
    this.reducedMotion.addEventListener("change", this.syncLoop);

    this.ready = true;
    this.resize();
  }

  dispose() {
    this.ready = false;
    this.stopLoop();
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", this.syncLoop);
    this.reducedMotion.removeEventListener("change", this.syncLoop);
    this.pointer.dispose();
    this.model.dispose();
    this.textures.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private readonly resize = () => {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.framing = framingFor(width, height);
    applyFraming(this.camera, this.model.stage, this.framing, width, height);
    this.syncLoop();
    if (!this.frameHandle) this.renderStill();
  };

  private readonly handleIntersection = (entries: IntersectionObserverEntry[]) => {
    this.onScreen = entries.some((entry) => entry.isIntersecting);
    this.syncLoop();
  };

  private readonly handleTextureRepaint = () => {
    if (this.ready && !this.frameHandle) this.renderStill();
  };

  private shouldAnimate(): boolean {
    return this.ready && this.onScreen && document.visibilityState === "visible" && !this.reducedMotion.matches;
  }

  private readonly syncLoop = () => {
    const animate = this.shouldAnimate();
    if (animate && !this.frameHandle) {
      this.lastFrameTime = performance.now();
      this.frameHandle = requestAnimationFrame(this.tick);
      return;
    }
    if (!animate) this.stopLoop();
    if (this.ready && this.reducedMotion.matches) this.renderStill();
  };

  private stopLoop() {
    if (!this.frameHandle) return;
    cancelAnimationFrame(this.frameHandle);
    this.frameHandle = 0;
  }

  private readonly tick = (now: number) => {
    this.frameHandle = requestAnimationFrame(this.tick);
    const deltaSeconds = Math.min(Math.max(0, now - this.lastFrameTime) / 1000, MAX_FRAME_SECONDS);
    this.lastFrameTime = now;
    this.elapsed += deltaSeconds;
    this.updatePointer(deltaSeconds);
    this.updateBody(deltaSeconds);
    advanceBlockField(this.field, this.cardPointer, deltaSeconds);
    this.renderPose();
  };

  private updatePointer(deltaSeconds: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const { reading } = this.pointer;
    const inside = reading.present && containsPoint(rect, reading.clientX, reading.clientY);
    stepSpring(this.engagement, inside ? 1 : 0, ENGAGEMENT_FREQUENCY, deltaSeconds);
    this.cardPointer.engagement = this.engagement.value;
    if (!inside) return;
    this.screenOffset.set(
      clamp((reading.clientX - rect.left - this.framing.centerX) / (rect.width / 2), 1),
      clamp((reading.clientY - rect.top - this.framing.centerY) / (rect.height / 2), 1),
    );
    this.projectOntoCard(rect, reading.clientX, reading.clientY);
  }

  private projectOntoCard(rect: ScreenRect, clientX: number, clientY: number) {
    const { body } = this.model;
    this.pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.model.stage.updateMatrixWorld(true);
    this.planeNormal.set(0, 0, 1).transformDirection(body.matrixWorld);
    body.getWorldPosition(this.planePoint);
    this.cardPlane.setFromNormalAndCoplanarPoint(this.planeNormal, this.planePoint);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.cardPlane, this.hit)) return;
    body.worldToLocal(this.hit);
    this.cardPointer.x = this.hit.x;
    this.cardPointer.y = this.hit.y;
  }

  private updateBody(deltaSeconds: number) {
    const engaged = this.engagement.value;
    stepSpring(this.tiltYaw, this.screenOffset.x * TILT_YAW * engaged, TILT_FREQUENCY, deltaSeconds);
    stepSpring(this.tiltPitch, this.screenOffset.y * TILT_PITCH * engaged, TILT_FREQUENCY, deltaSeconds);
    const idleWeight = 0.4 + 0.6 * (1 - engaged);
    const time = this.elapsed;
    const { body } = this.model;
    body.rotation.x = this.tiltPitch.value + Math.sin(time * 0.5) * IDLE_SWAY * idleWeight;
    body.rotation.y = this.tiltYaw.value + Math.sin(time * 0.37 + 1.2) * IDLE_SWAY * idleWeight;
    body.position.y = Math.sin(time * 0.7) * IDLE_BOB * idleWeight;
  }

  private renderPose() {
    poseBlocks(this.model, this.field);
    this.renderer.render(this.scene, this.camera);
  }

  private renderStill() {
    if (this.reducedMotion.matches) {
      settleBlockField(this.field, STILL_POINTER);
      this.model.body.rotation.set(0, 0, 0);
      this.model.body.position.set(0, 0, 0);
    }
    this.renderPose();
  }
}
