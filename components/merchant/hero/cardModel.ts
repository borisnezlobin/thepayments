import {
  Color,
  DynamicDrawUsage,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
  type BoxGeometry,
  type Material,
} from "three";
import { CHANNEL_COUNT, LIFT, PUSH_X, PUSH_Y, type BlockField } from "./blockMotion";
import type { CardTextures } from "./cardFaceTexture";
import {
  BACK_MATERIAL_INDEX,
  BLOCK_COUNT,
  BLOCK_DEPTH,
  CARD_CORNER_RADIUS,
  CARD_HEIGHT,
  CARD_WIDTH,
  FACE_MATERIAL_INDEX,
  buildBlockGeometry,
} from "./cardGeometry";
import { CARD_PALETTE } from "./cardPalette";
import { shapeAsCardFace, shapeAsCardShell } from "./cardShape";

const SLIVER_INSET = 0.26;
const SLIVER_GAP = 0.02;
const SHADOW_MARGIN = 3;
const SHADOW_DROP = 0.45;
const SHADOW_DEPTH = 1.1;
const SHADOW_OPACITY = 0.2;
const ROTATION_PER_PUSH = 0.5;

export type CardModel = {
  stage: Group;
  body: Group;
  blocks: InstancedMesh<BoxGeometry, Material[]>;
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
  sliver.position.z = -BLOCK_DEPTH / 2 - SLIVER_GAP;
  return sliver;
}

function createBlockMaterials(textures: CardTextures): Material[] {
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
  const edge = new MeshStandardMaterial({ color: CARD_PALETTE.edge, roughness: 0.8 });
  const back = new MeshStandardMaterial({ color: CARD_PALETTE.back, roughness: 0.8 });
  shapeAsCardFace(face);
  shapeAsCardShell(edge, "edge");
  shapeAsCardShell(back, "back");
  const materials: Material[] = [edge, edge, edge, edge, edge, edge];
  materials[FACE_MATERIAL_INDEX] = face;
  materials[BACK_MATERIAL_INDEX] = back;
  return materials;
}

export function buildCardModel(textures: CardTextures): CardModel {
  const stage = new Group();
  const body = new Group();
  const shadow = createContactShadow();
  const sliver = createLightSliver();
  const geometry = buildBlockGeometry();
  const materials = createBlockMaterials(textures);
  const blocks = new InstancedMesh(geometry, materials, BLOCK_COUNT);
  blocks.instanceMatrix.setUsage(DynamicDrawUsage);
  blocks.frustumCulled = false;
  body.add(sliver, blocks);
  stage.add(shadow, body);

  return {
    stage,
    body,
    blocks,
    dispose() {
      geometry.dispose();
      new Set(materials).forEach((material) => material.dispose());
      blocks.dispose();
      [shadow, sliver].forEach((plane) => {
        plane.geometry.dispose();
        plane.material.dispose();
      });
    },
  };
}

const blockMatrix = new Matrix4();
const blockPosition = new Vector3();
const blockRotation = new Euler();
const blockQuaternion = new Quaternion();
const unitScale = new Vector3(1, 1, 1);

export function poseBlocks(model: CardModel, field: BlockField) {
  const { values, centers } = field;
  for (let index = 0; index < BLOCK_COUNT; index += 1) {
    const base = index * CHANNEL_COUNT;
    const pushX = values[base + PUSH_X];
    const pushY = values[base + PUSH_Y];
    blockPosition.set(centers[index * 2] + pushX, centers[index * 2 + 1] + pushY, values[base + LIFT]);
    blockQuaternion.setFromEuler(blockRotation.set(-pushY * ROTATION_PER_PUSH, pushX * ROTATION_PER_PUSH, 0));
    model.blocks.setMatrixAt(index, blockMatrix.compose(blockPosition, blockQuaternion, unitScale));
  }
  model.blocks.instanceMatrix.needsUpdate = true;
}
