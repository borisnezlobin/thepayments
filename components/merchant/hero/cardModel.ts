import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  type BufferGeometry,
  type Material,
} from "three";
import { CARD_CORNER_RADIUS, CARD_DEPTH, CARD_HEIGHT, CARD_WIDTH, STRIP_COUNT, buildStripGeometry } from "./cardGeometry";
import type { CardTextures } from "./cardFaceTexture";
import { CARD_PALETTE } from "./cardPalette";
import type { StripMotion } from "./stripMotion";

const SLIVER_INSET = 0.26;
const SLIVER_GAP = 0.02;
const SHADOW_MARGIN = 3;
const SHADOW_DROP = 0.45;
const SHADOW_DEPTH = 1.1;
const SHADOW_OPACITY = 0.2;

export type CardModel = {
  stage: Group;
  body: Group;
  strips: Mesh[];
  dispose(): void;
};

const shadowVertexShader = `
varying vec2 vLocal;
void main() {
  vLocal = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const shadowFragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;
uniform vec2 uHalfSize;
uniform float uRadius;
varying vec2 vLocal;
void main() {
  vec2 corner = abs(vLocal) - uHalfSize + uRadius;
  float distanceOutside = length(max(corner, 0.0)) + min(max(corner.x, corner.y), 0.0) - uRadius;
  gl_FragColor = vec4(uColor, uOpacity * (1.0 - smoothstep(-0.8, 1.2, distanceOutside)));
  #include <colorspace_fragment>
}
`;

function createContactShadow(): Mesh<PlaneGeometry, ShaderMaterial> {
  const material = new ShaderMaterial({
    vertexShader: shadowVertexShader,
    fragmentShader: shadowFragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new Color(CARD_PALETTE.shadow) },
      uOpacity: { value: SHADOW_OPACITY },
      uHalfSize: { value: new Vector2(CARD_WIDTH / 2, CARD_HEIGHT / 2) },
      uRadius: { value: CARD_CORNER_RADIUS * 2 },
    },
  });
  const shadow = new Mesh(new PlaneGeometry(CARD_WIDTH + SHADOW_MARGIN, CARD_HEIGHT + SHADOW_MARGIN), material);
  shadow.position.set(0, -SHADOW_DROP, -SHADOW_DEPTH);
  shadow.renderOrder = -1;
  return shadow;
}

function createLightSliver(): Mesh<PlaneGeometry, MeshBasicMaterial> {
  const material = new MeshBasicMaterial({ color: CARD_PALETTE.accent, toneMapped: false });
  const sliver = new Mesh(new PlaneGeometry(CARD_WIDTH - SLIVER_INSET * 2, CARD_HEIGHT - SLIVER_INSET * 2), material);
  sliver.position.z = -CARD_DEPTH / 2 - SLIVER_GAP;
  return sliver;
}

function createStripMaterials(textures: CardTextures): Material[] {
  const face = new MeshPhysicalMaterial({
    map: textures.face,
    roughnessMap: textures.surface,
    metalnessMap: textures.surface,
    roughness: 1,
    metalness: 1,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.7,
  });
  const back = new MeshStandardMaterial({ color: CARD_PALETTE.back, roughness: 0.7 });
  const edge = new MeshStandardMaterial({ color: CARD_PALETTE.edge, roughness: 0.55 });
  return [face, back, edge];
}

export function buildCardModel(textures: CardTextures): CardModel {
  const stage = new Group();
  const body = new Group();
  const shadow = createContactShadow();
  const sliver = createLightSliver();
  const materials = createStripMaterials(textures);
  const geometries: BufferGeometry[] = Array.from({ length: STRIP_COUNT }, (_, index) => buildStripGeometry(index));
  const strips = geometries.map((geometry) => new Mesh(geometry, materials));
  body.add(sliver, ...strips);
  stage.add(shadow, body);

  return {
    stage,
    body,
    strips,
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      [shadow, sliver].forEach((plane) => {
        plane.geometry.dispose();
        plane.material.dispose();
      });
    },
  };
}

export function poseStrips(model: CardModel, motions: StripMotion[]) {
  motions.forEach((motion, index) => {
    const strip = model.strips[index];
    strip.position.set(motion.centerX + motion.drift.value, 0, motion.lift.value);
    strip.rotation.set(0, motion.turn.value, 0);
  });
}
