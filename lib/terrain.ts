import * as THREE from 'three';
import { getGrassTexture, getDirtPathTexture, getWaterNormalMap } from './procedural-textures';
import { FootstepSurface } from './audio-engine';

export interface TerrainSystem {
  mesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  getHeight: (x: number, z: number) => number;
  getNormal: (x: number, z: number) => THREE.Vector3;
  getSurface: (x: number, z: number) => FootstepSurface;
  updateWater: (time: number) => void;
  pondCenter: THREE.Vector3;
  pondRadius: number;
}

// Analytical terrain elevation formula for a large 420m x 420m countryside property
export function calculateHeight(x: number, z: number): number {
  // Broad rolling countryside swells
  let h = Math.sin(x * 0.012) * 3.2 + Math.cos(z * 0.014) * 3.5;

  // Medium terrain undulations
  h += Math.sin(x * 0.035 + z * 0.025) * 1.5;
  h += Math.cos(x * 0.028 - z * 0.042) * 1.1;

  // High Eastern Cattle Hill
  const hillDist = Math.hypot(x - 70, z - 55);
  h += Math.max(0, 11.5 - hillDist * 0.12);

  // Northern Sheep Knoll
  const sheepKnollDist = Math.hypot(x - 50, z - 110);
  h += Math.max(0, 9.0 - sheepKnollDist * 0.11);

  // Western Rocky Goat Plateau
  const goatRidgeDist = Math.hypot(x + 75, z - 30);
  h += Math.max(0, 7.5 - goatRidgeDist * 0.13);

  // South-western Pine Forest Ridge
  const pineRidgeDist = Math.hypot(x + 90, z + 85);
  h += Math.max(0, 10.0 - pineRidgeDist * 0.12);

  // Distant Mountain Ranges on the far perimeter (>140m away)
  const distFromCenter = Math.hypot(x, z);
  if (distFromCenter > 130) {
    const mountainRamp = (distFromCenter - 130) * 0.22;
    const mountainRidges = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 6.0;
    h += mountainRamp + Math.max(0, mountainRidges);
  }

  // Flatten the Homestead Courtyard (around x: -10 to 25, z: -15 to 25)
  const courtyardDist = Math.hypot(x - 8, z + 2);
  if (courtyardDist < 35) {
    const blend = Math.min(1, courtyardDist / 35);
    const targetBase = 1.0;
    h = h * blend + targetBase * (1 - blend);
  }

  // Organic Farm Pond Basin (around x: 35, z: -48)
  const pondDist = Math.hypot(x - 35, (z + 48) * 0.85);
  if (pondDist < 26) {
    const depth = Math.cos((pondDist / 26) * (Math.PI * 0.5));
    h -= depth * 3.6;
  }

  // Winding stream channel exiting the pond towards the south-east
  const streamDist = Math.hypot(x - (35 + (z + 48) * 0.45), z + 60);
  if (streamDist < 5.5 && z < -40 && z > -110) {
    h -= (1 - streamDist / 5.5) * 1.4;
  }

  return h;
}

// Check distance to dirt roads & farm trails
export function isNearPath(x: number, z: number): { near: boolean; factor: number; roadType: 'carriage' | 'trail' } {
  // Main carriage road segments
  const carriageRoad = [
    { x: -10, z: 80 },
    { x: -6, z: 45 },
    { x: 0, z: 24 }, // Spawn approach
    { x: 8, z: 5 },
    { x: 26, z: 8 },  // Barn turn
    { x: 34, z: -18 },
    { x: 35, z: -44 }, // Pond approach
    { x: 50, z: -85 }, // Southern gate road
  ];

  // Secondary pasture footpath
  const footpath = [
    { x: 26, z: 8 },
    { x: 45, z: 25 },
    { x: 68, z: 48 }, // Hill climb
    { x: 52, z: 95 }, // Northern sheep knoll
  ];

  let minCarriageDist = 999;
  for (let i = 0; i < carriageRoad.length - 1; i++) {
    const p1 = carriageRoad[i];
    const p2 = carriageRoad[i + 1];
    const l2 = (p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2;
    let t = Math.max(0, Math.min(1, ((x - p1.x) * (p2.x - p1.x) + (z - p1.z) * (p2.z - p1.z)) / l2));
    const projX = p1.x + t * (p2.x - p1.x);
    const projZ = p1.z + t * (p2.z - p1.z);
    const d = Math.hypot(x - projX, z - projZ);
    if (d < minCarriageDist) minCarriageDist = d;
  }

  let minTrailDist = 999;
  for (let i = 0; i < footpath.length - 1; i++) {
    const p1 = footpath[i];
    const p2 = footpath[i + 1];
    const l2 = (p2.x - p1.x) ** 2 + (p2.z - p1.z) ** 2;
    let t = Math.max(0, Math.min(1, ((x - p1.x) * (p2.x - p1.x) + (z - p1.z) * (p2.z - p1.z)) / l2));
    const projX = p1.x + t * (p2.x - p1.x);
    const projZ = p1.z + t * (p2.z - p1.z);
    const d = Math.hypot(x - projX, z - projZ);
    if (d < minTrailDist) minTrailDist = d;
  }

  if (minCarriageDist < 3.2) {
    return { near: true, factor: Math.max(0, 1 - minCarriageDist / 3.2), roadType: 'carriage' };
  }
  if (minTrailDist < 2.0) {
    return { near: true, factor: Math.max(0, 1 - minTrailDist / 2.0), roadType: 'trail' };
  }

  return { near: false, factor: 0, roadType: 'carriage' };
}

export function createTerrain(scene: THREE.Scene): TerrainSystem {
  // Expanded 420m x 420m countryside map
  const size = 420;
  const segments = 220;

  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position;
  const count = posAttr.count;

  // Multi-material vertex colors for natural organic terrain blending
  const colors: number[] = [];
  const colorObj = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = calculateHeight(x, z);
    posAttr.setY(i, y);

    const pathInfo = isNearPath(x, z);
    const pondDist = Math.hypot(x - 35, (z + 48) * 0.85);

    if (pondDist < 25 && y < -0.3) {
      // Damp shoreline mud
      colorObj.setRGB(0.34, 0.28, 0.22);
    } else if (pathInfo.near) {
      // Carriage road / footpath blending
      const blend = pathInfo.factor;
      const grassR = 0.28, grassG = 0.40, grassB = 0.18;
      const dirtR = 0.45, dirtG = 0.35, dirtB = 0.26;
      colorObj.setRGB(
        grassR * (1 - blend) + dirtR * blend,
        grassG * (1 - blend) + dirtG * blend,
        grassB * (1 - blend) + dirtB * blend
      );
    } else if (y > 7.0) {
      // High hillocks & mountain rock outcrops
      const rockBlend = Math.min(1, (y - 7.0) / 6.0);
      const grassR = 0.28, grassG = 0.38, grassB = 0.19;
      const rockR = 0.44, rockG = 0.42, rockB = 0.38;
      colorObj.setRGB(
        grassR * (1 - rockBlend) + rockR * rockBlend,
        grassG * (1 - rockBlend) + rockG * rockBlend,
        grassB * (1 - rockBlend) + rockB * rockBlend
      );
    } else {
      // Lush meadow with natural shade variation
      const noise = (Math.sin(x * 0.08) + Math.cos(z * 0.08)) * 0.04;
      colorObj.setRGB(0.28 + noise, 0.41 + noise, 0.19 + noise * 0.4);
    }

    colors.push(colorObj.r, colorObj.g, colorObj.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const grassTex = getGrassTexture();
  grassTex.repeat.set(65, 65);

  const terrainMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.02,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, terrainMat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  scene.add(mesh);

  // --- REALISTIC POND & STREAM WATER SHADER ---
  // Organic rounded pond plane conforming to the shoreline
  const pondWidth = 46;
  const pondHeight = 42;
  const pondGeom = new THREE.PlaneGeometry(pondWidth, pondHeight, 32, 32);
  pondGeom.rotateX(-Math.PI / 2);

  const waterNormal = getWaterNormalMap();
  waterNormal.repeat.set(5, 5);

  // Custom PBR water material with depth transparency and Fresnel glint
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x274a44,
    roughness: 0.1,
    metalness: 0.18,
    normalMap: waterNormal,
    transparent: true,
    opacity: 0.86,
  });

  const waterMesh = new THREE.Mesh(pondGeom, waterMat);
  waterMesh.position.set(35, -0.68, -48);
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);

  // Footstep surface query
  const getSurface = (x: number, z: number): FootstepSurface => {
    const pondDist = Math.hypot(x - 35, (z + 48) * 0.85);
    if (pondDist < 24 && calculateHeight(x, z) <= -0.5) {
      return 'water';
    }
    // Wooden porch and barn interiors
    if (
      (x >= -16 && x <= -2 && z >= -10 && z <= 5) ||
      (x >= 14 && x <= 36 && z >= -2 && z <= 24)
    ) {
      return 'wood';
    }
    if (calculateHeight(x, z) > 7.5) {
      return 'stone';
    }
    if (isNearPath(x, z).near) {
      return 'dirt';
    }
    return 'grass';
  };

  const getNormal = (x: number, z: number): THREE.Vector3 => {
    const step = 0.5;
    const hL = calculateHeight(x - step, z);
    const hR = calculateHeight(x + step, z);
    const hD = calculateHeight(x, z - step);
    const hU = calculateHeight(x, z + step);
    return new THREE.Vector3(hL - hR, 2 * step, hD - hU).normalize();
  };

  const updateWater = (time: number) => {
    waterNormal.offset.x = (time * 0.012) % 1;
    waterNormal.offset.y = (time * 0.018) % 1;
  };

  return {
    mesh,
    waterMesh,
    getHeight: calculateHeight,
    getNormal,
    getSurface,
    updateWater,
    pondCenter: new THREE.Vector3(35, -0.68, -48),
    pondRadius: 22,
  };
}
