import * as THREE from 'three';
import {
  getWoodPlanksTexture,
  getBarnWoodTexture,
  getStoneTexture,
  getFarmhouseSidingTexture,
  getRoofShingleTexture,
} from './procedural-textures';
import { InteractionTarget } from './types';

export interface ArchitectureCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  type: 'wall' | 'fence' | 'prop' | 'railing';
  name?: string;
  isGate?: boolean;
  gateId?: string;
}

export interface WalkableSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  surfaceType: 'wood' | 'stone' | 'dirt';
  name?: string;
}

export interface ArchitectureSystem {
  group: THREE.Group;
  interactables: InteractionTarget[];
  colliders: ArchitectureCollider[];
  walkableSurfaces: WalkableSurface[];
  toggleGate: (id: string) => boolean;
  isGateOpen: (id: string) => boolean;
  dispose: () => void;
}

export function createArchitecture(
  scene: THREE.Scene,
  getHeight: (x: number, z: number) => number
): ArchitectureSystem {
  const group = new THREE.Group();
  scene.add(group);

  const interactables: InteractionTarget[] = [];
  const colliders: ArchitectureCollider[] = [];
  const walkableSurfaces: WalkableSurface[] = [];
  const gateMeshes: Map<string, { pivot: THREE.Group; isOpen: boolean }> = new Map();

  // --- PBR TEXTURES & MATERIALS ---
  const woodPlanksTex = getWoodPlanksTexture();
  woodPlanksTex.repeat.set(4, 2);
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodPlanksTex,
    roughness: 0.82,
    metalness: 0.04,
  });

  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3d3024,
    roughness: 0.85,
  });

  const whiteTrimMat = new THREE.MeshStandardMaterial({
    color: 0xeeebe2,
    roughness: 0.6,
  });

  const houseSidingTex = getFarmhouseSidingTexture();
  houseSidingTex.repeat.set(3, 4);
  const houseSidingMat = new THREE.MeshStandardMaterial({
    map: houseSidingTex,
    roughness: 0.78,
  });

  const barnWoodTex = getBarnWoodTexture();
  barnWoodTex.repeat.set(4, 4);
  const barnMat = new THREE.MeshStandardMaterial({
    map: barnWoodTex,
    roughness: 0.82,
  });

  const stoneTex = getStoneTexture();
  stoneTex.repeat.set(6, 3);
  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    roughness: 0.9,
  });

  const roofShingleTex = getRoofShingleTexture();
  roofShingleTex.repeat.set(6, 6);
  const roofMat = new THREE.MeshStandardMaterial({
    map: roofShingleTex,
    roughness: 0.75,
  });

  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: 0xd8e8f8,
    roughness: 0.12,
    metalness: 0.65,
  });

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x222224,
    roughness: 0.45,
    metalness: 0.7,
  });

  // =========================================================================
  // 1. GRAND TWO-STORY FARMHOUSE HOMESTEAD (AUTHENTIC RURAL ARCHITECTURE)
  // =========================================================================
  // Positioned at x: -12, z: -4
  const houseX = -12;
  const houseZ = -4;
  const houseY = 1.0; // Foundation plateau level

  const houseGroup = new THREE.Group();
  houseGroup.position.set(houseX, houseY, houseZ);

  // --- A. DEEP FIELDSTONE FOUNDATION (NEVER FLOATS!) ---
  // Sinks 2.2m into the ground (from y = -1.2 to 1.45) with 0.45m showing above ground
  const foundGeom = new THREE.BoxGeometry(14.2, 2.65, 10.6);
  const foundMesh = new THREE.Mesh(foundGeom, stoneMat);
  foundMesh.position.set(0, 0.125, 0); // Bottom is at -1.2, top at +1.45
  foundMesh.castShadow = true;
  foundMesh.receiveShadow = true;
  houseGroup.add(foundMesh);

  // Porch deep foundation (under the porch deck)
  const porchFoundGeom = new THREE.BoxGeometry(14.2, 2.45, 4.4);
  const porchFoundMesh = new THREE.Mesh(porchFoundGeom, stoneMat);
  porchFoundMesh.position.set(0, 0.225, 7.5); // Bottom is at -1.0, top at +1.45
  porchFoundMesh.castShadow = true;
  porchFoundMesh.receiveShadow = true;
  houseGroup.add(porchFoundMesh);

  // --- B. GROUND FLOOR EXTERIOR & INTERIOR (WALKABLE FOYER) ---
  // Hardwood floor inside the house at y = 1.45
  const floorGeom = new THREE.BoxGeometry(13.2, 0.12, 9.8);
  const floorMesh = new THREE.Mesh(floorGeom, woodMat);
  floorMesh.position.set(0, 1.45, 0);
  floorMesh.receiveShadow = true;
  houseGroup.add(floorMesh);

  // Ceiling above ground floor at y = 4.95
  const ceilingGeom = new THREE.BoxGeometry(13.2, 0.15, 9.8);
  const ceilingMesh = new THREE.Mesh(ceilingGeom, woodMat);
  ceilingMesh.position.set(0, 4.95, 0);
  houseGroup.add(ceilingMesh);

  // Register interior ground floor walkable surface
  walkableSurfaces.push({
    minX: houseX - 6.4,
    maxX: houseX + 6.4,
    minZ: houseZ - 4.7,
    maxZ: houseZ + 4.7,
    y: houseY + 1.45,
    surfaceType: 'wood',
    name: 'Farmhouse Interior Ground Floor',
  });

  // Walls of ground floor (height 1.45 to 5.0)
  const wallMat = houseSidingMat;
  const wallH = 3.5;
  const wallY = 1.45 + wallH / 2;

  // Back Wall (North)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(13.6, wallH, 0.35), wallMat);
  backWall.position.set(0, wallY, -5.0);
  backWall.castShadow = true;
  houseGroup.add(backWall);

  colliders.push({
    minX: houseX - 6.9,
    maxX: houseX + 6.9,
    minZ: houseZ - 5.3,
    maxZ: houseZ - 4.7,
    minY: houseY + 1.0,
    maxY: houseY + 5.2,
    type: 'wall',
    name: 'House Back Wall',
  });

  // Left Wall (West)
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, wallH, 10.2), wallMat);
  leftWall.position.set(-6.6, wallY, 0);
  leftWall.castShadow = true;
  houseGroup.add(leftWall);

  colliders.push({
    minX: houseX - 6.9,
    maxX: houseX - 6.3,
    minZ: houseZ - 5.2,
    maxZ: houseZ + 5.2,
    minY: houseY + 1.0,
    maxY: houseY + 5.2,
    type: 'wall',
    name: 'House West Wall',
  });

  // Right Wall (East)
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, wallH, 10.2), wallMat);
  rightWall.position.set(6.6, wallY, 0);
  rightWall.castShadow = true;
  houseGroup.add(rightWall);

  colliders.push({
    minX: houseX + 6.3,
    maxX: houseX + 6.9,
    minZ: houseZ - 5.2,
    maxZ: houseZ + 5.2,
    minY: houseY + 1.0,
    maxY: houseY + 5.2,
    type: 'wall',
    name: 'House East Wall',
  });

  // Front Wall (South, facing porch) with Walkable Open Doorway in center
  // Doorway width: 2.2m from x: -1.1 to +1.1
  const frontWallL = new THREE.Mesh(new THREE.BoxGeometry(5.4, wallH, 0.35), wallMat);
  frontWallL.position.set(-3.85, wallY, 5.0);
  frontWallL.castShadow = true;
  houseGroup.add(frontWallL);

  colliders.push({
    minX: houseX - 6.7,
    maxX: houseX - 1.1,
    minZ: houseZ + 4.75,
    maxZ: houseZ + 5.25,
    minY: houseY + 1.0,
    maxY: houseY + 5.2,
    type: 'wall',
    name: 'House Front Wall Left',
  });

  const frontWallR = new THREE.Mesh(new THREE.BoxGeometry(5.4, wallH, 0.35), wallMat);
  frontWallR.position.set(3.85, wallY, 5.0);
  frontWallR.castShadow = true;
  houseGroup.add(frontWallR);

  colliders.push({
    minX: houseX + 1.1,
    maxX: houseX + 6.7,
    minZ: houseZ + 4.75,
    maxZ: houseZ + 5.25,
    minY: houseY + 1.0,
    maxY: houseY + 5.2,
    type: 'wall',
    name: 'House Front Wall Right',
  });

  // Lintel above doorway
  const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 0.35), wallMat);
  doorLintel.position.set(0, 4.55, 5.0);
  houseGroup.add(doorLintel);

  // Door casing and decorative door held ajar against interior wall
  const doorCasing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.1, 0.4), whiteTrimMat);
  doorCasing.position.set(0, 3.0, 5.0);
  houseGroup.add(doorCasing);

  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.7, 0.1), darkWoodMat);
  doorLeaf.position.set(-0.9, 2.85, 4.4); // Ajar at an angle inside
  doorLeaf.rotation.y = 0.8;
  doorLeaf.castShadow = true;
  houseGroup.add(doorLeaf);

  // Windows with white frames on front wall
  [-3.85, 3.85].forEach((wx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.42), windowGlassMat);
    win.position.set(wx, 3.2, 5.0);
    houseGroup.add(win);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 0.45), whiteTrimMat);
    frame.position.set(wx, 3.2, 5.0);
    houseGroup.add(frame);
  });

  // --- C. COZY GROUND FLOOR INTERIOR FURNISHINGS ---
  // Grand Stone Fireplace & Hearth at back wall
  const hearthGeom = new THREE.BoxGeometry(2.8, 3.4, 1.4);
  const hearth = new THREE.Mesh(hearthGeom, stoneMat);
  hearth.position.set(-3.5, 3.15, -4.2);
  hearth.castShadow = true;
  houseGroup.add(hearth);

  colliders.push({
    minX: houseX - 5.0,
    maxX: houseX - 2.0,
    minZ: houseZ - 5.0,
    maxZ: houseZ - 3.4,
    minY: houseY + 1.0,
    maxY: houseY + 5.0,
    type: 'prop',
    name: 'Fireplace Hearth',
  });

  // Warm glowing firelight in the hearth
  const fireLight = new THREE.PointLight(0xff9933, 2.2, 8.5);
  fireLight.position.set(houseX - 3.5, houseY + 2.2, houseZ - 3.6);
  scene.add(fireLight);

  // Fireplace logs & embers
  const embers = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.25, 0.5),
    new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff3300,
      emissiveIntensity: 0.8,
      roughness: 0.6,
    })
  );
  embers.position.set(-3.5, 1.6, -4.0);
  houseGroup.add(embers);

  // Rustic Harvest Dining Table in center
  const tableGeom = new THREE.BoxGeometry(2.4, 0.12, 1.4);
  const tableTop = new THREE.Mesh(tableGeom, darkWoodMat);
  tableTop.position.set(1.8, 2.3, -0.5);
  tableTop.castShadow = true;
  houseGroup.add(tableTop);

  // Table legs
  [
    [-1.0, -0.5],
    [1.0, -0.5],
    [-1.0, 0.5],
    [1.0, 0.5],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 6), darkWoodMat);
    leg.position.set(1.8 + lx, 1.88, -0.5 + lz);
    leg.castShadow = true;
    houseGroup.add(leg);
  });

  // Table Collider
  colliders.push({
    minX: houseX + 0.5,
    maxX: houseX + 3.1,
    minZ: houseZ - 1.3,
    maxZ: houseZ + 0.3,
    minY: houseY + 1.0,
    maxY: houseY + 2.6,
    type: 'prop',
    name: 'Dining Table',
  });

  // Table lantern with gentle ambient glow
  const tableLantern = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.35, 0.2),
    new THREE.MeshStandardMaterial({
      color: 0xffe4aa,
      emissive: 0xffaa44,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    })
  );
  tableLantern.position.set(1.8, 2.55, -0.5);
  houseGroup.add(tableLantern);

  const lanternLight = new THREE.PointLight(0xffd488, 1.2, 6.0);
  lanternLight.position.set(houseX + 1.8, houseY + 2.7, houseZ - 0.5);
  scene.add(lanternLight);

  // Woven wool floor rug under table
  const rugGeom = new THREE.BoxGeometry(3.2, 0.02, 2.4);
  const rugMat = new THREE.MeshStandardMaterial({ color: 0x8a3834, roughness: 0.95 });
  const rug = new THREE.Mesh(rugGeom, rugMat);
  rug.position.set(1.8, 1.52, -0.5);
  houseGroup.add(rug);

  // Bookshelf / Cupboard along East wall
  const shelfGeom = new THREE.BoxGeometry(0.65, 2.8, 2.4);
  const shelf = new THREE.Mesh(shelfGeom, darkWoodMat);
  shelf.position.set(6.1, 2.85, -2.5);
  shelf.castShadow = true;
  houseGroup.add(shelf);

  colliders.push({
    minX: houseX + 5.7,
    maxX: houseX + 6.5,
    minZ: houseZ - 3.8,
    maxZ: houseZ - 1.2,
    minY: houseY + 1.0,
    maxY: houseY + 4.5,
    type: 'prop',
    name: 'Bookshelf',
  });

  // --- D. WALKABLE FRONT PORCH & ENTRANCE STEPS ---
  // Porch wooden deck at y = 1.45, extending from front wall (z = 5.0) out to z = 9.4
  const porchFloorGeom = new THREE.BoxGeometry(14.4, 0.2, 4.4);
  const porchFloor = new THREE.Mesh(porchFloorGeom, woodMat);
  porchFloor.position.set(0, 1.45, 7.2);
  porchFloor.receiveShadow = true;
  houseGroup.add(porchFloor);

  // Register porch walkable surface
  walkableSurfaces.push({
    minX: houseX - 7.2,
    maxX: houseX + 7.2,
    minZ: houseZ + 5.0,
    maxZ: houseZ + 9.4,
    y: houseY + 1.45,
    surfaceType: 'wood',
    name: 'Farmhouse Front Porch Deck',
  });

  // 4 Broad Wooden Steps from ground (y = 1.0) up to porch (y = 1.45)
  // Step width: 2.8m (X: houseX - 1.4 to houseX + 1.4)
  const stepCount = 4;
  const stepH = 0.11;
  const stepD = 0.55;
  const stepW = 3.0;

  for (let s = 0; s < stepCount; s++) {
    const stepGeom = new THREE.BoxGeometry(stepW, 0.2, stepD);
    const stepMesh = new THREE.Mesh(stepGeom, woodMat);
    const sy = 1.0 + (s + 0.5) * stepH;
    const sz = 9.4 + (stepCount - 1 - s) * stepD + stepD * 0.5;
    stepMesh.position.set(0, sy, sz);
    stepMesh.receiveShadow = true;
    stepMesh.castShadow = true;
    houseGroup.add(stepMesh);

    walkableSurfaces.push({
      minX: houseX - stepW * 0.5,
      maxX: houseX + stepW * 0.5,
      minZ: houseZ + sz - stepD * 0.5,
      maxZ: houseZ + sz + stepD * 0.5,
      y: houseY + 1.0 + (s + 1) * stepH,
      surfaceType: 'wood',
      name: `Porch Step ${s + 1}`,
    });
  }

  // Porch Railings (West side, and Front left/right leaving central steps opening)
  // West Porch Railing
  const porchRailW = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 4.4), whiteTrimMat);
  porchRailW.position.set(-7.1, 2.05, 7.2);
  porchRailW.castShadow = true;
  houseGroup.add(porchRailW);

  colliders.push({
    minX: houseX - 7.3,
    maxX: houseX - 6.9,
    minZ: houseZ + 5.0,
    maxZ: houseZ + 9.4,
    minY: houseY + 1.45,
    maxY: houseY + 2.7,
    type: 'railing',
    name: 'Porch West Railing',
  });

  // Front Left Porch Railing (from x = -7.1 to x = -1.6)
  const porchRailFL = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.95, 0.12), whiteTrimMat);
  porchRailFL.position.set(-4.4, 2.05, 9.35);
  porchRailFL.castShadow = true;
  houseGroup.add(porchRailFL);

  colliders.push({
    minX: houseX - 7.2,
    maxX: houseX - 1.6,
    minZ: houseZ + 9.2,
    maxZ: houseZ + 9.5,
    minY: houseY + 1.45,
    maxY: houseY + 2.7,
    type: 'railing',
    name: 'Porch Front Left Railing',
  });

  // Front Right Porch Railing (from x = 1.6 to x = 5.2)
  const porchRailFR = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, 0.12), whiteTrimMat);
  porchRailFR.position.set(3.4, 2.05, 9.35);
  porchRailFR.castShadow = true;
  houseGroup.add(porchRailFR);

  colliders.push({
    minX: houseX + 1.6,
    maxX: houseX + 5.2,
    minZ: houseZ + 9.2,
    maxZ: houseZ + 9.5,
    minY: houseY + 1.45,
    maxY: houseY + 2.7,
    type: 'railing',
    name: 'Porch Front Right Railing',
  });

  // Turned White Porch Support Columns holding up the balcony
  [-7.0, -3.5, 0, 3.5, 7.0].forEach((px) => {
    const colGeom = new THREE.CylinderGeometry(0.14, 0.16, 3.5, 8);
    const col = new THREE.Mesh(colGeom, whiteTrimMat);
    col.position.set(px, 3.25, 9.2);
    col.castShadow = true;
    houseGroup.add(col);

    colliders.push({
      minX: houseX + px - 0.25,
      maxX: houseX + px + 0.25,
      minZ: houseZ + 8.95,
      maxZ: houseZ + 9.45,
      minY: houseY + 1.45,
      maxY: houseY + 5.0,
      type: 'prop',
      name: `Porch Column ${px}`,
    });
  });

  // --- E. ACCESSIBLE EXTERIOR WOODEN STAIRCASE TO BALCONY ---
  // Starts on the east side of the porch (x: 5.6 to 7.0, z: 9.0) and rises northward along
  // the east exterior wall to the 2nd-floor balcony landing at y = 5.0, z = 0.0
  const stairSteps = 12;
  const stairTotalRise = 3.55; // from 1.45 up to 5.0
  const stairStepRise = stairTotalRise / stairSteps; // ~0.295m per step
  const stairTotalLen = 8.5; // from z = 8.5 to z = 0.0
  const stairStepLen = stairTotalLen / stairSteps; // ~0.708m per step
  const stairW = 1.4;
  const stairX = 6.2; // relative to house

  for (let st = 0; st < stairSteps; st++) {
    const sFrac = (st + 0.5) / stairSteps;
    const sy = 1.45 + (st + 1) * stairStepRise;
    const sz = 8.5 - st * stairStepLen;

    // Tread mesh
    const treadMesh = new THREE.Mesh(new THREE.BoxGeometry(stairW, 0.14, stairStepLen * 1.1), woodMat);
    treadMesh.position.set(stairX, sy - 0.07, sz - stairStepLen * 0.5);
    treadMesh.castShadow = true;
    treadMesh.receiveShadow = true;
    houseGroup.add(treadMesh);

    // Register each step into walkable surfaces
    walkableSurfaces.push({
      minX: houseX + stairX - stairW * 0.5,
      maxX: houseX + stairX + stairW * 0.5,
      minZ: houseZ + sz - stairStepLen,
      maxZ: houseZ + sz,
      y: houseY + sy,
      surfaceType: 'wood',
      name: `Exterior Stair Step ${st + 1}`,
    });
  }

  // Sturdy wooden outer handrail along east side of staircase
  const stairRailingMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 9.0), whiteTrimMat);
  stairRailingMesh.position.set(stairX + stairW * 0.5 + 0.06, 1.45 + stairTotalRise * 0.5 + 0.9, 4.25);
  stairRailingMesh.rotation.x = -Math.atan2(stairTotalRise, stairTotalLen);
  stairRailingMesh.castShadow = true;
  houseGroup.add(stairRailingMesh);

  colliders.push({
    minX: houseX + stairX + stairW * 0.5,
    maxX: houseX + stairX + stairW * 0.5 + 0.35,
    minZ: houseZ - 0.5,
    maxZ: houseZ + 9.0,
    minY: houseY + 1.45,
    maxY: houseY + 6.2,
    type: 'railing',
    name: 'Stair Outer Railing',
  });

  // --- F. PLAYABLE 2ND-FLOOR BALCONY (SUPPORTED, RAILINGS, PANORAMIC VIEW) ---
  // Balcony wooden deck at y = 5.0, extending out over the porch (from z = 5.0 to z = 9.4)
  const balconyDeckGeom = new THREE.BoxGeometry(14.4, 0.25, 4.4);
  const balconyDeck = new THREE.Mesh(balconyDeckGeom, woodMat);
  balconyDeck.position.set(0, 5.0, 7.2);
  balconyDeck.receiveShadow = true;
  houseGroup.add(balconyDeck);

  // Heavy timber support beams beneath the balcony
  const beamGeom = new THREE.BoxGeometry(0.25, 0.35, 4.4);
  [-6.8, -3.4, 0, 3.4, 6.8].forEach((bx) => {
    const beam = new THREE.Mesh(beamGeom, darkWoodMat);
    beam.position.set(bx, 4.75, 7.2);
    beam.castShadow = true;
    houseGroup.add(beam);
  });

  // Register Balcony Walkable Surface (Player can walk freely across balcony at y = 5.0)
  walkableSurfaces.push({
    minX: houseX - 7.2,
    maxX: houseX + 7.2,
    minZ: houseZ + 5.0,
    maxZ: houseZ + 9.4,
    y: houseY + 5.0,
    surfaceType: 'wood',
    name: 'Farmhouse 2nd-Floor Balcony Deck',
  });

  // Balcony Railings (physically blocks player from falling off)
  // Front Balcony Railing (across z = 9.35, from x: -7.1 to +7.1)
  const balcRailFront = new THREE.Mesh(new THREE.BoxGeometry(14.2, 1.1, 0.12), whiteTrimMat);
  balcRailFront.position.set(0, 5.65, 9.35);
  balcRailFront.castShadow = true;
  houseGroup.add(balcRailFront);

  colliders.push({
    minX: houseX - 7.3,
    maxX: houseX + 7.3,
    minZ: houseZ + 9.2,
    maxZ: houseZ + 9.5,
    minY: houseY + 4.9,
    maxY: houseY + 6.4,
    type: 'railing',
    name: 'Balcony Front Railing',
  });

  // West Balcony Railing (along x = -7.1, from z = 5.0 to 9.4)
  const balcRailWest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 4.4), whiteTrimMat);
  balcRailWest.position.set(-7.1, 5.65, 7.2);
  balcRailWest.castShadow = true;
  houseGroup.add(balcRailWest);

  colliders.push({
    minX: houseX - 7.3,
    maxX: houseX - 6.9,
    minZ: houseZ + 5.0,
    maxZ: houseZ + 9.4,
    minY: houseY + 4.9,
    maxY: houseY + 6.4,
    type: 'railing',
    name: 'Balcony West Railing',
  });

  // East Balcony Railing (protects front portion, leaves opening for stair landing at back)
  const balcRailEast = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 2.2), whiteTrimMat);
  balcRailEast.position.set(7.1, 5.65, 8.3);
  balcRailEast.castShadow = true;
  houseGroup.add(balcRailEast);

  colliders.push({
    minX: houseX + 6.9,
    maxX: houseX + 7.3,
    minZ: houseZ + 7.2,
    maxZ: houseZ + 9.4,
    minY: houseY + 4.9,
    maxY: houseY + 6.4,
    type: 'railing',
    name: 'Balcony East Front Railing',
  });

  // Balcony wooden rocking chair / seating spot
  const balcBench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.65), darkWoodMat);
  balcBench.position.set(-4.0, 5.38, 6.2);
  balcBench.castShadow = true;
  houseGroup.add(balcBench);

  interactables.push({
    id: 'balcony-seat',
    type: 'bench',
    name: 'Balcony Panorama Seat',
    description: 'A cozy cedar bench looking out across the front courtyard, grazing cows, and countryside hills.',
    position: [houseX - 4.0, houseY + 5.4, houseZ + 6.2],
    distance: 3.2,
    actionText: 'Sit on Balcony',
    canSit: true,
  });

  // --- G. SECOND FLOOR UPPER LEVEL & GABLE CEDAR ROOF ---
  const upperH = 3.6;
  const upperY = 5.0 + upperH / 2;

  // Upper floor exterior walls
  const upperBodyGeom = new THREE.BoxGeometry(13.2, upperH, 9.8);
  const upperBody = new THREE.Mesh(upperBodyGeom, houseSidingMat);
  upperBody.position.set(0, upperY, 0);
  upperBody.castShadow = true;
  upperBody.receiveShadow = true;
  houseGroup.add(upperBody);

  // Upper walls colliders
  colliders.push({
    minX: houseX - 6.7,
    maxX: houseX + 6.7,
    minZ: houseZ - 5.0,
    maxZ: houseZ + 5.0,
    minY: houseY + 5.0,
    maxY: houseY + 8.8,
    type: 'wall',
    name: 'House Second Floor Exterior',
  });

  // Balcony door on the second floor front wall
  const upperDoor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.2), whiteTrimMat);
  upperDoor.position.set(0, 6.4, 5.0);
  houseGroup.add(upperDoor);

  // Upper floor front windows
  [-4.2, 4.2].forEach((wx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 0.2), windowGlassMat);
    win.position.set(wx, 6.8, 5.0);
    houseGroup.add(win);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.0, 0.22), whiteTrimMat);
    frame.position.set(wx, 6.8, 5.0);
    houseGroup.add(frame);
  });

  // Gable Cedar Roof Structure
  const roofGeom = new THREE.ConeGeometry(9.4, 4.6, 4);
  roofGeom.rotateY(Math.PI / 4);
  roofGeom.scale(1.28, 1.0, 0.98);
  const roofMesh = new THREE.Mesh(roofGeom, roofMat);
  roofMesh.position.set(0, 11.0, 0);
  roofMesh.castShadow = true;
  houseGroup.add(roofMesh);

  // Roof Dormer Windows (Front)
  [-3.2, 3.2].forEach((dx) => {
    const dormerGeom = new THREE.BoxGeometry(2.0, 2.0, 2.4);
    const dormer = new THREE.Mesh(dormerGeom, houseSidingMat);
    dormer.position.set(dx, 9.8, 3.8);
    dormer.castShadow = true;
    houseGroup.add(dormer);

    const dormerWin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.1), windowGlassMat);
    dormerWin.position.set(dx, 9.8, 5.02);
    houseGroup.add(dormerWin);
  });

  // Brick & Stone Chimney
  const chimneyGeom = new THREE.BoxGeometry(1.4, 12.5, 1.6);
  const chimney = new THREE.Mesh(chimneyGeom, stoneMat);
  chimney.position.set(-3.5, 7.8, -4.2);
  chimney.castShadow = true;
  houseGroup.add(chimney);

  // Stacked Firewood Cord beside porch
  const woodCordGeom = new THREE.BoxGeometry(2.6, 1.3, 1.0);
  const woodCord = new THREE.Mesh(woodCordGeom, darkWoodMat);
  woodCord.position.set(-8.2, 0.9, 5.5);
  woodCord.castShadow = true;
  houseGroup.add(woodCord);

  colliders.push({
    minX: houseX - 9.6,
    maxX: houseX - 6.8,
    minZ: houseZ + 4.9,
    maxZ: houseZ + 6.1,
    minY: houseY + 0.8,
    maxY: houseY + 2.4,
    type: 'prop',
    name: 'Firewood Stack',
  });

  group.add(houseGroup);

  // --- 2. PORCH ROCKING CHAIRS & BENCH (Interactable Sit) ---
  const benchGeom = new THREE.BoxGeometry(2.4, 0.12, 0.7);
  const benchSeat = new THREE.Mesh(benchGeom, darkWoodMat);
  const benchX = houseX + 3.8;
  const benchY = houseY + 1.85;
  const benchZ = houseZ + 7.2;
  benchSeat.position.set(benchX, benchY, benchZ);
  benchSeat.castShadow = true;
  group.add(benchSeat);

  interactables.push({
    id: 'porch-bench',
    type: 'bench',
    name: 'Farmhouse Porch Bench',
    description: 'A handcrafted cedar bench looking out across the front courtyard and pastures.',
    position: [benchX, benchY, benchZ],
    distance: 3.2,
    actionText: 'Rest on Bench',
    canSit: true,
  });

  // --- 3. HOMESTEAD WATER WELL ---
  const wellX = -2;
  const wellZ = 12;
  const wellY = getHeight(wellX, wellZ);

  const wellStoneGeom = new THREE.CylinderGeometry(1.2, 1.3, 1.0, 12);
  const wellStone = new THREE.Mesh(wellStoneGeom, stoneMat);
  wellStone.position.set(wellX, wellY + 0.5, wellZ);
  wellStone.castShadow = true;
  group.add(wellStone);

  const wellRoofGeom = new THREE.ConeGeometry(1.6, 1.1, 4);
  wellRoofGeom.rotateY(Math.PI / 4);
  const wellRoof = new THREE.Mesh(wellRoofGeom, roofMat);
  wellRoof.position.set(wellX, wellY + 2.3, wellZ);
  wellRoof.castShadow = true;
  group.add(wellRoof);

  // Well posts
  [-0.9, 0.9].forEach((wx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), darkWoodMat);
    post.position.set(wellX + wx, wellY + 1.3, wellZ);
    post.castShadow = true;
    group.add(post);
  });

  // Well Solid Collider
  colliders.push({
    minX: wellX - 1.4,
    maxX: wellX + 1.4,
    minZ: wellZ - 1.4,
    maxZ: wellZ + 1.4,
    minY: wellY,
    maxY: wellY + 3.0,
    type: 'prop',
    name: 'Homestead Water Well',
  });

  // =========================================================================
  // 4. THE GREAT RED GAMBREL BARN
  // =========================================================================
  // Positioned at x: 28, z: 8
  const barnX = 28;
  const barnZ = 8;
  const barnY = 1.0; // Leveled foundation plateau

  const barnGroup = new THREE.Group();
  barnGroup.position.set(barnX, barnY, barnZ);

  // Main high barn structure
  const barnBodyGeom = new THREE.BoxGeometry(18, 9.5, 24);
  const barnBody = new THREE.Mesh(barnBodyGeom, barnMat);
  barnBody.position.set(0, 4.75, 0);
  barnBody.castShadow = true;
  barnBody.receiveShadow = true;
  barnGroup.add(barnBody);

  // Barn Walls Colliders
  // North Wall (Back)
  colliders.push({
    minX: barnX - 9.2,
    maxX: barnX + 9.2,
    minZ: barnZ - 12.3,
    maxZ: barnZ - 11.7,
    minY: barnY,
    maxY: barnY + 10.0,
    type: 'wall',
    name: 'Barn North Wall',
  });

  // West Wall (Facing farmhouse)
  colliders.push({
    minX: barnX - 9.3,
    maxX: barnX - 8.7,
    minZ: barnZ - 12.2,
    maxZ: barnZ + 12.2,
    minY: barnY,
    maxY: barnY + 10.0,
    type: 'wall',
    name: 'Barn West Wall',
  });

  // East Wall
  colliders.push({
    minX: barnX + 8.7,
    maxX: barnX + 9.3,
    minZ: barnZ - 12.2,
    maxZ: barnZ + 12.2,
    minY: barnY,
    maxY: barnY + 10.0,
    type: 'wall',
    name: 'Barn East Wall',
  });

  // South Wall (Front with double doors)
  // Left side
  colliders.push({
    minX: barnX - 9.2,
    maxX: barnX - 2.8,
    minZ: barnZ + 11.7,
    maxZ: barnZ + 12.3,
    minY: barnY,
    maxY: barnY + 10.0,
    type: 'wall',
    name: 'Barn South Wall Left',
  });
  // Right side
  colliders.push({
    minX: barnX + 2.8,
    maxX: barnX + 9.2,
    minZ: barnZ + 11.7,
    maxZ: barnZ + 12.3,
    minY: barnY,
    maxY: barnY + 10.0,
    type: 'wall',
    name: 'Barn South Wall Right',
  });
  // Closed Barn Double Doors
  colliders.push({
    minX: barnX - 2.8,
    maxX: barnX + 2.8,
    minZ: barnZ + 11.8,
    maxZ: barnZ + 12.4,
    minY: barnY,
    maxY: barnY + 5.5,
    type: 'wall',
    name: 'Barn Double Doors',
  });

  // Gambrel Roof Lower Steep Slopes
  const lowerRoofGeom = new THREE.BoxGeometry(19.2, 0.4, 24.6);
  const roofSideL = new THREE.Mesh(lowerRoofGeom, roofMat);
  roofSideL.position.set(-6.2, 11.2, 0);
  roofSideL.rotation.z = 0.65;
  roofSideL.castShadow = true;
  barnGroup.add(roofSideL);

  const roofSideR = new THREE.Mesh(lowerRoofGeom, roofMat);
  roofSideR.position.set(6.2, 11.2, 0);
  roofSideR.rotation.z = -0.65;
  roofSideR.castShadow = true;
  barnGroup.add(roofSideR);

  // Gambrel Roof Upper Ridge
  const upperRoofGeom = new THREE.BoxGeometry(13.5, 0.35, 24.6);
  const roofTopL = new THREE.Mesh(upperRoofGeom, roofMat);
  roofTopL.position.set(-2.8, 14.5, 0);
  roofTopL.rotation.z = 0.28;
  roofTopL.castShadow = true;
  barnGroup.add(roofTopL);

  const roofTopR = new THREE.Mesh(upperRoofGeom, roofMat);
  roofTopR.position.set(2.8, 14.5, 0);
  roofTopR.rotation.z = -0.28;
  roofTopR.castShadow = true;
  barnGroup.add(roofTopR);

  // Rooftop Cupola & Weather Vane
  const cupolaGeom = new THREE.BoxGeometry(2.4, 2.2, 2.4);
  const cupola = new THREE.Mesh(cupolaGeom, whiteTrimMat);
  cupola.position.set(0, 16.5, 0);
  cupola.castShadow = true;
  barnGroup.add(cupola);

  const vanePole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), ironMat);
  vanePole.position.set(0, 18.2, 0);
  barnGroup.add(vanePole);

  const vaneArrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 4), ironMat);
  vaneArrow.position.set(0, 18.8, 0);
  vaneArrow.rotation.z = Math.PI / 2;
  barnGroup.add(vaneArrow);

  // Double Sliding Barn Doors
  const barnDoorGeom = new THREE.BoxGeometry(3.2, 5.2, 0.25);
  const barnDoorL = new THREE.Mesh(barnDoorGeom, darkWoodMat);
  barnDoorL.position.set(-1.8, 2.6, 12.1);
  barnDoorL.castShadow = true;
  barnGroup.add(barnDoorL);

  const barnDoorR = new THREE.Mesh(barnDoorGeom, darkWoodMat);
  barnDoorR.position.set(1.8, 2.6, 12.1);
  barnDoorR.castShadow = true;
  barnGroup.add(barnDoorR);

  // Upper Hayloft Door & Hoist Beam
  const hayDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.2), whiteTrimMat);
  hayDoor.position.set(0, 9.2, 12.05);
  barnGroup.add(hayDoor);

  const hoistBeam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 3.2), darkWoodMat);
  hoistBeam.position.set(0, 11.2, 13.0);
  hoistBeam.castShadow = true;
  barnGroup.add(hoistBeam);

  // Side Lean-To Tractor & Hay Shed
  const leanToFloorGeom = new THREE.BoxGeometry(7, 0.25, 16);
  const leanToFloor = new THREE.Mesh(leanToFloorGeom, woodMat);
  leanToFloor.position.set(12.5, 0.15, 0);
  barnGroup.add(leanToFloor);

  const leanToRoofGeom = new THREE.BoxGeometry(8.2, 0.3, 16.5);
  const leanToRoof = new THREE.Mesh(leanToRoofGeom, roofMat);
  leanToRoof.position.set(12.5, 5.6, 0);
  leanToRoof.rotation.z = -0.28;
  leanToRoof.castShadow = true;
  barnGroup.add(leanToRoof);

  // Stacked Golden Hay Bales
  const hayMat = new THREE.MeshStandardMaterial({ color: 0xd8b244, roughness: 0.9 });
  const baleGeom = new THREE.BoxGeometry(1.8, 1.0, 1.2);
  const hayPositions = [
    [11.0, 0.6, -3],
    [13.2, 0.6, -3],
    [12.1, 1.6, -3],
    [11.0, 0.6, 0],
    [13.2, 0.6, 0],
    [12.1, 0.6, 3.5],
    [11.0, 0.6, 6],
  ];
  hayPositions.forEach(([hx, hy, hz]) => {
    const bale = new THREE.Mesh(baleGeom, hayMat);
    bale.position.set(hx, hy, hz);
    bale.rotation.y = (Math.random() - 0.5) * 0.15;
    bale.castShadow = true;
    barnGroup.add(bale);
  });

  // Hay bales solid collider
  colliders.push({
    minX: barnX + 9.5,
    maxX: barnX + 14.5,
    minZ: barnZ - 4.0,
    maxZ: barnZ + 7.5,
    minY: barnY,
    maxY: barnY + 2.5,
    type: 'prop',
    name: 'Hay Bales Stack',
  });

  group.add(barnGroup);

  // =========================================================================
  // 5. WOODEN POST-AND-RAIL FENCES & INTERACTIVE SWING GATES
  // =========================================================================
  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x645444,
    roughness: 0.88,
  });

  const postGeom = new THREE.CylinderGeometry(0.11, 0.13, 1.6, 6);

  const buildFenceSegment = (x1: number, z1: number, x2: number, z2: number) => {
    const dist = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.ceil(dist / 3.2);
    const angle = Math.atan2(x2 - x1, z2 - z1);

    // Register solid fence collider
    const pad = 0.32;
    const y1 = getHeight(x1, z1);
    const y2 = getHeight(x2, z2);
    colliders.push({
      minX: Math.min(x1, x2) - pad,
      maxX: Math.max(x1, x2) + pad,
      minZ: Math.min(z1, z2) - pad,
      maxZ: Math.max(z1, z2) + pad,
      minY: Math.min(y1, y2) - 0.5,
      maxY: Math.max(y1, y2) + 1.8,
      type: 'fence',
      name: `Fence ${Math.round(x1)},${Math.round(z1)} to ${Math.round(x2)},${Math.round(z2)}`,
    });

    for (let s = 0; s <= steps; s++) {
      const frac = s / steps;
      const fx = x1 + (x2 - x1) * frac;
      const fz = z1 + (z2 - z1) * frac;
      const fy = getHeight(fx, fz);

      const post = new THREE.Mesh(postGeom, fenceMat);
      post.position.set(fx, fy + 0.8, fz);
      post.castShadow = true;
      group.add(post);

      if (s < steps) {
        const nextFrac = (s + 1) / steps;
        const nfx = x1 + (x2 - x1) * nextFrac;
        const nfz = z1 + (z2 - z1) * nextFrac;
        const midX = (fx + nfx) / 2;
        const midZ = (fz + nfz) / 2;
        const midY = getHeight(midX, midZ);
        const segDist = Math.hypot(nfx - fx, nfz - fz);

        const currentRailGeom = new THREE.BoxGeometry(0.08, 0.12, segDist);

        const railLow = new THREE.Mesh(currentRailGeom, fenceMat);
        railLow.position.set(midX, midY + 0.52, midZ);
        railLow.rotation.y = angle;
        railLow.castShadow = true;
        group.add(railLow);

        const railHigh = new THREE.Mesh(currentRailGeom, fenceMat);
        railHigh.position.set(midX, midY + 1.15, midZ);
        railHigh.rotation.y = angle;
        railHigh.castShadow = true;
        group.add(railHigh);
      }
    }
  };

  const buildInteractiveGate = (id: string, name: string, x: number, z: number, angle: number) => {
    const y = getHeight(x, z);

    const hingePost = new THREE.Mesh(postGeom, darkWoodMat);
    hingePost.position.set(x, y + 0.8, z);
    hingePost.castShadow = true;
    group.add(hingePost);

    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    pivot.rotation.y = angle;

    const gateWidth = 3.0;
    const gateFrameGeom = new THREE.BoxGeometry(gateWidth, 1.25, 0.1);
    const gateMesh = new THREE.Mesh(gateFrameGeom, fenceMat);
    gateMesh.position.set(gateWidth / 2, 0.8, 0);
    gateMesh.castShadow = true;
    pivot.add(gateMesh);

    group.add(pivot);

    gateMeshes.set(id, { pivot, isOpen: false });

    // Register gate collider (checked dynamically based on isOpen)
    const pad = 0.35;
    const endX = x + Math.sin(angle + Math.PI / 2) * gateWidth;
    const endZ = z + Math.cos(angle + Math.PI / 2) * gateWidth;
    colliders.push({
      minX: Math.min(x, endX) - pad,
      maxX: Math.max(x, endX) + pad,
      minZ: Math.min(z, endZ) - pad,
      maxZ: Math.max(z, endZ) + pad,
      minY: y - 0.5,
      maxY: y + 2.0,
      type: 'fence',
      isGate: true,
      gateId: id,
      name,
    });

    interactables.push({
      id,
      type: 'gate',
      name,
      description: 'A rustic wooden farm gate fastened with a hemp rope latch.',
      position: [x, y, z],
      distance: 3.8,
      actionText: 'Open Gate',
      canToggle: true,
    });
  };

  // Pasture Fences
  buildFenceSegment(-2, 22, 14, 22);
  buildInteractiveGate('pasture-gate', 'Main Meadow Pasture Gate', 14, 22, 0);
  buildFenceSegment(17, 22, 48, 22);
  buildFenceSegment(48, 22, 65, -8);
  buildFenceSegment(65, -8, 52, -35);

  // Goat Knoll Fences
  buildFenceSegment(-25, -20, -48, -20);
  buildInteractiveGate('goat-gate', 'Rocky Knoll Goat Gate', -48, -20, 0);
  buildFenceSegment(-51, -20, -78, -12);
  buildFenceSegment(-78, -12, -72, 28);
  buildFenceSegment(-72, 28, -32, 34);

  // --- 6. PONDSIDE VISTA BENCH ---
  const pondBenchX = 22;
  const pondBenchZ = -42;
  const pondBenchY = getHeight(pondBenchX, pondBenchZ);

  const pondBenchSeat = new THREE.Mesh(benchGeom, darkWoodMat);
  pondBenchSeat.position.set(pondBenchX, pondBenchY + 0.55, pondBenchZ);
  pondBenchSeat.rotation.y = 0.7;
  pondBenchSeat.castShadow = true;
  group.add(pondBenchSeat);

  interactables.push({
    id: 'pond-bench',
    type: 'bench',
    name: 'Pondside Resting Bench',
    description: 'A peaceful wooden bench looking across the calm pond and water reflections.',
    position: [pondBenchX, pondBenchY, pondBenchZ],
    distance: 3.4,
    actionText: 'Sit by Pond',
    canSit: true,
  });

  // --- 7. HILLSIDE PANORAMA BENCH ---
  const hillBenchX = 64;
  const hillBenchZ = 48;
  const hillBenchY = getHeight(hillBenchX, hillBenchZ);

  const hillBenchSeat = new THREE.Mesh(benchGeom, darkWoodMat);
  hillBenchSeat.position.set(hillBenchX, hillBenchY + 0.55, hillBenchZ);
  hillBenchSeat.rotation.y = -1.2;
  hillBenchSeat.castShadow = true;
  group.add(hillBenchSeat);

  interactables.push({
    id: 'hill-bench',
    type: 'bench',
    name: 'Hilltop Vista Bench',
    description: 'A rustic bench perched on the high eastern hill with panoramic views of the farm.',
    position: [hillBenchX, hillBenchY, hillBenchZ],
    distance: 3.4,
    actionText: 'Rest on Hilltop',
    canSit: true,
  });

  // --- 8. FARM ENVIRONMENTAL DETAILS ---
  // Water Troughs in animal areas
  const troughGeom = new THREE.BoxGeometry(2.4, 0.6, 0.9);
  const troughMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.3 });

  const troughPositions = [
    { x: 35, z: 45, rot: 0.3 }, // Cow meadow
    { x: -55, z: -95, rot: 1.2 }, // Sheep area
    { x: -62, z: 25, rot: -0.5 }, // Goat area
  ];

  troughPositions.forEach((tp) => {
    const trough = new THREE.Mesh(troughGeom, troughMat);
    const ty = getHeight(tp.x, tp.z);
    trough.position.set(tp.x, ty + 0.35, tp.z);
    trough.rotation.y = tp.rot;
    trough.castShadow = true;
    trough.receiveShadow = true;
    group.add(trough);

    colliders.push({
      minX: tp.x - 1.3,
      maxX: tp.x + 1.3,
      minZ: tp.z - 0.7,
      maxZ: tp.z + 0.7,
      minY: ty,
      maxY: ty + 1.2,
      type: 'prop',
      name: 'Water Trough',
    });

    const waterInTrough = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.05, 0.7),
      new THREE.MeshStandardMaterial({
        color: 0x3a5a6a,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.85,
      })
    );
    waterInTrough.position.set(tp.x, ty + 0.55, tp.z);
    waterInTrough.rotation.y = tp.rot;
    group.add(waterInTrough);
  });

  // Wooden Crates near barn
  const crateGeom = new THREE.BoxGeometry(0.8, 0.7, 0.8);
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x7a6550, roughness: 0.85 });

  const cratePositions = [
    [barnX + 8, barnZ + 14],
    [barnX + 9.2, barnZ + 14],
    [barnX + 8.5, barnZ + 14.8],
  ];

  cratePositions.forEach(([cx, cz]) => {
    const crate = new THREE.Mesh(crateGeom, crateMat);
    const crateY = getHeight(cx, cz);
    crate.position.set(cx, crateY + 0.35, cz);
    crate.rotation.y = Math.random() * 0.3;
    crate.castShadow = true;
    group.add(crate);
  });

  // Stepping stones path from house to barn
  const stoneGeom = new THREE.CylinderGeometry(0.45, 0.5, 0.08, 7);
  const steppingStoneMat = new THREE.MeshStandardMaterial({ color: 0x7a756d, roughness: 0.9, metalness: 0.03 });

  for (let s = 0; s < 8; s++) {
    const t = s / 8;
    const sx = houseX + 6 + (barnX - houseX - 6) * t + (Math.random() - 0.5) * 0.5;
    const sz = houseZ + 5 + (barnZ - houseZ - 5) * t + (Math.random() - 0.5) * 0.5;
    const sy = getHeight(sx, sz);
    const stone = new THREE.Mesh(stoneGeom, steppingStoneMat);
    stone.position.set(sx, sy + 0.04, sz);
    stone.rotation.y = Math.random() * Math.PI;
    stone.receiveShadow = true;
    group.add(stone);
  }

  const toggleGate = (id: string): boolean => {
    const entry = gateMeshes.get(id);
    if (!entry) return false;
    entry.isOpen = !entry.isOpen;
    entry.pivot.rotation.y += entry.isOpen ? 1.45 : -1.45;

    const interactable = interactables.find((i) => i.id === id);
    if (interactable) {
      interactable.actionText = entry.isOpen ? 'Close Gate' : 'Open Gate';
    }
    return entry.isOpen;
  };

  const isGateOpen = (id: string): boolean => {
    return gateMeshes.get(id)?.isOpen ?? false;
  };

  const dispose = () => {
    scene.remove(group);
  };

  return {
    group,
    interactables,
    colliders,
    walkableSurfaces,
    toggleGate,
    isGateOpen,
    dispose,
  };
}
