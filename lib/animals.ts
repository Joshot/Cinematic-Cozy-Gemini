import * as THREE from 'three';
import {
  getHolsteinCoatTexture,
  getJerseyCoatTexture,
  getSheepWoolTexture,
} from './procedural-textures';
import { AnimalEntity, AnimalSpecies, AnimalState, InteractionTarget } from './types';
import { soundscape } from './audio-engine';

export interface AnimalInstance {
  entity: AnimalEntity;
  meshGroup: THREE.Group;
  bodyMesh: THREE.Object3D;
  neckPivot: THREE.Group;
  headPivot: THREE.Group;
  tailPivot: THREE.Group;
  legs: {
    upper: THREE.Group;
    lower: THREE.Group;
  }[];
  currentGaitPhase: number;
  currentBodyBob: number;
  currentSway: number;
  grazingWeight: number; // 0 (head up) to 1 (head grazing on ground)
}

export interface AnimalSystem {
  group: THREE.Group;
  animals: AnimalInstance[];
  update: (delta: number, playerPos: THREE.Vector3) => void;
  getInteractables: (playerPos: THREE.Vector3) => InteractionTarget[];
  petAnimal: (id: string) => boolean;
  dispose: () => void;
}

export function createAnimals(
  scene: THREE.Scene,
  getHeight: (x: number, z: number) => number
): AnimalSystem {
  const group = new THREE.Group();
  scene.add(group);

  const animalInstances: AnimalInstance[] = [];

  // --- CINEMATIC PBR MATERIALS ---
  const holsteinMat = new THREE.MeshStandardMaterial({
    map: getHolsteinCoatTexture(),
    roughness: 0.72,
    metalness: 0.01,
    envMapIntensity: 0.3,
  });

  const jerseyMat = new THREE.MeshStandardMaterial({
    map: getJerseyCoatTexture(),
    roughness: 0.72,
    metalness: 0.01,
    envMapIntensity: 0.3,
  });

  const muzzleMat = new THREE.MeshStandardMaterial({
    color: 0xd4a08a,
    roughness: 0.82,
    metalness: 0.02,
  });

  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xdcd6cb,
    roughness: 0.5,
    metalness: 0.08,
  });

  const eyeGlossMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.05,
    metalness: 0.45,
    envMapIntensity: 1.0,
  });

  const hoofMat = new THREE.MeshStandardMaterial({
    color: 0x1e1c1a,
    roughness: 0.55,
    metalness: 0.12,
  });

  const sheepWoolMat = new THREE.MeshStandardMaterial({
    map: getSheepWoolTexture(),
    roughness: 0.92,
    metalness: 0.01,
  });

  const sheepDarkFaceMat = new THREE.MeshStandardMaterial({
    color: 0x2a2420,
    roughness: 0.8,
    metalness: 0.02,
  });

  const goatFurMat = new THREE.MeshStandardMaterial({
    color: 0xc8bda8,
    roughness: 0.82,
    metalness: 0.01,
  });

  const chickenFeatherMat = new THREE.MeshStandardMaterial({
    color: 0x9e4626,
    roughness: 0.68,
  });

  const chickenCombMat = new THREE.MeshStandardMaterial({
    color: 0xc42020,
    roughness: 0.5,
  });

  const chickenBeakMat = new THREE.MeshStandardMaterial({
    color: 0xdb9420,
    roughness: 0.5,
  });

  // --- 1. REALISTIC COW BUILDER (Organic contours, rounded flanks, joints, eyes) ---
  function buildRealisticCow(subType: 'Holstein' | 'Jersey'): {
    meshGroup: THREE.Group;
    bodyMesh: THREE.Group;
    neckPivot: THREE.Group;
    headPivot: THREE.Group;
    tailPivot: THREE.Group;
    legs: { upper: THREE.Group; lower: THREE.Group }[];
  } {
    const meshGroup = new THREE.Group();
    const coatMat = subType === 'Holstein' ? holsteinMat : jerseyMat;

    // Body Root (allows vertical bobbing and lateral sway)
    const bodyMesh = new THREE.Group();
    meshGroup.add(bodyMesh);

    // Main Rounded Barrel Chest & Torso (Cylinder lying horizontally along Z)
    const barrelGeom = new THREE.CylinderGeometry(0.78, 0.82, 2.5, 12);
    barrelGeom.rotateX(Math.PI / 2);
    barrelGeom.scale(0.92, 1.0, 1.0); // Slightly oval cross-section
    const barrel = new THREE.Mesh(barrelGeom, coatMat);
    barrel.position.set(0, 1.48, 0);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    bodyMesh.add(barrel);

    // Muscular Rear Rump / Haunches
    const rumpGeom = new THREE.SphereGeometry(0.76, 10, 8);
    rumpGeom.scale(0.92, 0.95, 1.1);
    const rump = new THREE.Mesh(rumpGeom, coatMat);
    rump.position.set(0, 1.5, -1.05);
    rump.castShadow = true;
    bodyMesh.add(rump);

    // Front Shoulder Brisket
    const shoulderGeom = new THREE.SphereGeometry(0.78, 10, 8);
    shoulderGeom.scale(0.95, 1.02, 1.05);
    const shoulder = new THREE.Mesh(shoulderGeom, coatMat);
    shoulder.position.set(0, 1.5, 1.05);
    shoulder.castShadow = true;
    bodyMesh.add(shoulder);

    // Neck Pivot (hinges at shoulder)
    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 1.62, 1.5);
    bodyMesh.add(neckPivot);

    // Tapered Muscular Neck
    const neckGeom = new THREE.CylinderGeometry(0.42, 0.62, 0.95, 10);
    neckGeom.rotateX(Math.PI / 3);
    const neck = new THREE.Mesh(neckGeom, coatMat);
    neck.position.set(0, 0.28, 0.32);
    neck.castShadow = true;
    neckPivot.add(neck);

    // Head Pivot (hinges at top of neck)
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.55, 0.68);
    neckPivot.add(headPivot);

    // Sculpted Bovine Head (Tapered rounded shape)
    const headGeom = new THREE.CylinderGeometry(0.38, 0.48, 0.85, 10);
    headGeom.rotateX(Math.PI / 2.3);
    const head = new THREE.Mesh(headGeom, coatMat);
    head.position.set(0, 0.15, 0.35);
    head.castShadow = true;
    headPivot.add(head);

    // Muzzle / Snout
    const snoutGeom = new THREE.CylinderGeometry(0.32, 0.36, 0.42, 10);
    snoutGeom.rotateX(Math.PI / 2);
    const snout = new THREE.Mesh(snoutGeom, muzzleMat);
    snout.position.set(0, -0.05, 0.72);
    snout.castShadow = true;
    headPivot.add(snout);

    // Dark Nostrils
    [-0.11, 0.11].forEach((nx) => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), eyeGlossMat);
      nostril.position.set(nx, -0.02, 0.92);
      headPivot.add(nostril);
    });

    // Bovine Glossy Eyes
    [-0.42, 0.42].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), eyeGlossMat);
      eye.position.set(ex, 0.25, 0.38);
      headPivot.add(eye);
    });

    // Anatomical Bovine Horns (Curving outward and slightly up)
    [-0.38, 0.38].forEach((hx, idx) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 6), hornMat);
      horn.position.set(hx, 0.48, 0.18);
      horn.rotation.z = idx === 0 ? -0.55 : 0.55;
      horn.rotation.x = -0.25;
      headPivot.add(horn);
    });

    // Realistic Bovine Ears
    [-0.48, 0.48].forEach((earX, idx) => {
      const earGeom = new THREE.BoxGeometry(0.44, 0.15, 0.18);
      const ear = new THREE.Mesh(earGeom, coatMat);
      ear.position.set(earX, 0.32, 0.08);
      ear.rotation.z = idx === 0 ? -0.32 : 0.32;
      ear.rotation.y = idx === 0 ? 0.2 : -0.2;
      headPivot.add(ear);
    });

    // Tail (Jointed with tuft)
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 1.82, -1.65);
    bodyMesh.add(tailPivot);

    const tailRopeGeom = new THREE.CylinderGeometry(0.04, 0.035, 1.1, 5);
    tailRopeGeom.translate(0, -0.55, 0);
    const tailRope = new THREE.Mesh(tailRopeGeom, coatMat);
    tailPivot.add(tailRope);

    const tuftGeom = new THREE.ConeGeometry(0.09, 0.32, 6);
    tuftGeom.rotateX(Math.PI);
    const tuft = new THREE.Mesh(tuftGeom, eyeGlossMat);
    tuft.position.set(0, -1.15, 0);
    tailPivot.add(tuft);

    // 4 Articulated Quadruped Legs (Upper thigh/shoulder + Lower shank + Hoof)
    const legs: { upper: THREE.Group; lower: THREE.Group }[] = [];
    const legPositions = [
      [-0.45, 1.25, 0.95],  // Front Left
      [0.45, 1.25, 0.95],   // Front Right
      [-0.45, 1.25, -0.95], // Back Left
      [0.45, 1.25, -0.95],  // Back Right
    ];

    legPositions.forEach(([lx, ly, lz], idx) => {
      const upper = new THREE.Group();
      upper.position.set(lx, ly, lz);
      meshGroup.add(upper);

      // Upper Leg
      const upperGeom = new THREE.CylinderGeometry(0.18, 0.14, 0.65, 8);
      upperGeom.translate(0, -0.32, 0);
      const upperMesh = new THREE.Mesh(upperGeom, coatMat);
      upperMesh.castShadow = true;
      upper.add(upperMesh);

      // Lower Leg Pivot (Knee / Hock)
      const lower = new THREE.Group();
      lower.position.set(0, -0.62, 0);
      upper.add(lower);

      const lowerGeom = new THREE.CylinderGeometry(0.13, 0.11, 0.58, 8);
      lowerGeom.translate(0, -0.28, 0);
      const lowerMesh = new THREE.Mesh(lowerGeom, coatMat);
      lowerMesh.castShadow = true;
      lower.add(lowerMesh);

      // Dark Split Hoof
      const hoofGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.16, 8);
      const hoof = new THREE.Mesh(hoofGeom, hoofMat);
      hoof.position.set(0, -0.58, 0.02);
      hoof.castShadow = true;
      lower.add(hoof);

      legs.push({ upper, lower });
    });

    return { meshGroup, bodyMesh, neckPivot, headPivot, tailPivot, legs };
  }

  // 2. REALISTIC SHEEP BUILDER
  function buildRealisticSheep(): {
    meshGroup: THREE.Group;
    bodyMesh: THREE.Group;
    neckPivot: THREE.Group;
    headPivot: THREE.Group;
    tailPivot: THREE.Group;
    legs: { upper: THREE.Group; lower: THREE.Group }[];
  } {
    const meshGroup = new THREE.Group();
    const bodyMesh = new THREE.Group();
    meshGroup.add(bodyMesh);

    // Woolly Body (Capsule/Smooth rounded barrel)
    const bodyGeom = new THREE.CylinderGeometry(0.55, 0.58, 1.45, 10);
    bodyGeom.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeom, sheepWoolMat);
    body.position.set(0, 0.95, 0);
    body.castShadow = true;
    bodyMesh.add(body);

    const rumpGeom = new THREE.SphereGeometry(0.56, 8, 8);
    const rump = new THREE.Mesh(rumpGeom, sheepWoolMat);
    rump.position.set(0, 0.95, -0.65);
    bodyMesh.add(rump);

    const shoulderGeom = new THREE.SphereGeometry(0.56, 8, 8);
    const shoulder = new THREE.Mesh(shoulderGeom, sheepWoolMat);
    shoulder.position.set(0, 0.95, 0.65);
    bodyMesh.add(shoulder);

    // Neck & Head
    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 1.05, 0.85);
    bodyMesh.add(neckPivot);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.28, 0.32);
    neckPivot.add(headPivot);

    // Dark Suffolk Sheep Head
    const headGeom = new THREE.CylinderGeometry(0.24, 0.32, 0.55, 8);
    headGeom.rotateX(Math.PI / 2.2);
    const head = new THREE.Mesh(headGeom, sheepDarkFaceMat);
    head.position.set(0, 0.08, 0.22);
    head.castShadow = true;
    headPivot.add(head);

    // Wool Cap on head
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 6), sheepWoolMat);
    cap.position.set(0, 0.28, 0.14);
    headPivot.add(cap);

    // Drooping Ears
    [-0.32, 0.32].forEach((ex, idx) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.14), sheepDarkFaceMat);
      ear.position.set(ex, 0.16, 0.1);
      ear.rotation.z = idx === 0 ? -0.38 : 0.38;
      headPivot.add(ear);
    });

    // Tail
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 1.1, -1.05);
    bodyMesh.add(tailPivot);

    // 4 Slender Dark Legs
    const legs: { upper: THREE.Group; lower: THREE.Group }[] = [];
    const legOffsets = [
      [-0.32, 0.82, 0.55],
      [0.32, 0.82, 0.55],
      [-0.32, 0.82, -0.55],
      [0.32, 0.82, -0.55],
    ];

    legOffsets.forEach(([lx, ly, lz]) => {
      const upper = new THREE.Group();
      upper.position.set(lx, ly, lz);
      meshGroup.add(upper);

      const upperMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.45, 6), sheepDarkFaceMat);
      upperMesh.position.set(0, -0.22, 0);
      upperMesh.castShadow = true;
      upper.add(upperMesh);

      const lower = new THREE.Group();
      lower.position.set(0, -0.42, 0);
      upper.add(lower);

      const lowerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.42, 6), sheepDarkFaceMat);
      lowerMesh.position.set(0, -0.2, 0);
      lowerMesh.castShadow = true;
      lower.add(lowerMesh);

      legs.push({ upper, lower });
    });

    return { meshGroup, bodyMesh, neckPivot, headPivot, tailPivot, legs };
  }

  // 3. REALISTIC GOAT BUILDER
  function buildRealisticGoat(): {
    meshGroup: THREE.Group;
    bodyMesh: THREE.Group;
    neckPivot: THREE.Group;
    headPivot: THREE.Group;
    tailPivot: THREE.Group;
    legs: { upper: THREE.Group; lower: THREE.Group }[];
  } {
    const meshGroup = new THREE.Group();
    const bodyMesh = new THREE.Group();
    meshGroup.add(bodyMesh);

    const bodyGeom = new THREE.CylinderGeometry(0.44, 0.48, 1.35, 10);
    bodyGeom.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeom, goatFurMat);
    body.position.set(0, 0.98, 0);
    body.castShadow = true;
    bodyMesh.add(body);

    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 1.15, 0.75);
    bodyMesh.add(neckPivot);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.35, 0.28);
    neckPivot.add(headPivot);

    const headGeom = new THREE.CylinderGeometry(0.18, 0.28, 0.52, 8);
    headGeom.rotateX(Math.PI / 2.3);
    const head = new THREE.Mesh(headGeom, goatFurMat);
    head.position.set(0, 0.12, 0.22);
    head.castShadow = true;
    headPivot.add(head);

    // Beard
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 4), goatFurMat);
    beard.position.set(0, -0.15, 0.45);
    beard.rotation.x = 0.4;
    headPivot.add(beard);

    // Backward sweeping horns
    [-0.15, 0.15].forEach((hx, idx) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.48, 5), hornMat);
      horn.position.set(hx, 0.42, 0.05);
      horn.rotation.x = -0.55;
      horn.rotation.z = idx === 0 ? -0.18 : 0.18;
      headPivot.add(horn);
    });

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 1.15, -0.75);
    bodyMesh.add(tailPivot);

    const legs: { upper: THREE.Group; lower: THREE.Group }[] = [];
    const legOffsets = [
      [-0.26, 0.85, 0.52],
      [0.26, 0.85, 0.52],
      [-0.26, 0.85, -0.52],
      [0.26, 0.85, -0.52],
    ];

    legOffsets.forEach(([lx, ly, lz]) => {
      const upper = new THREE.Group();
      upper.position.set(lx, ly, lz);
      meshGroup.add(upper);

      const upperMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.46, 6), goatFurMat);
      upperMesh.position.set(0, -0.22, 0);
      upperMesh.castShadow = true;
      upper.add(upperMesh);

      const lower = new THREE.Group();
      lower.position.set(0, -0.44, 0);
      upper.add(lower);

      const lowerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.44, 6), goatFurMat);
      lowerMesh.position.set(0, -0.22, 0);
      lowerMesh.castShadow = true;
      lower.add(lowerMesh);

      legs.push({ upper, lower });
    });

    return { meshGroup, bodyMesh, neckPivot, headPivot, tailPivot, legs };
  }

  // --- SPAWN ANIMALS ACROSS THE FARM ---

  // 1. 8 Cows in the Expansive Eastern Meadow
  const cowConfigs = [
    { id: 'cow-1', subType: 'Holstein', x: 28, z: 32, rot: 0.5 },
    { id: 'cow-2', subType: 'Jersey', x: 38, z: 42, rot: -1.2 },
    { id: 'cow-3', subType: 'Holstein', x: 22, z: 52, rot: 2.1 },
    { id: 'cow-4', subType: 'Jersey', x: 48, z: 30, rot: 1.0 },
    { id: 'cow-5', subType: 'Holstein', x: 35, z: 62, rot: -0.4 },
    { id: 'cow-6', subType: 'Jersey', x: 55, z: 50, rot: 1.6 },
    { id: 'cow-7', subType: 'Holstein', x: 42, z: 75, rot: -2.0 },
    { id: 'cow-8', subType: 'Jersey', x: 62, z: 68, rot: 0.8 },
  ];

  cowConfigs.forEach((c) => {
    const cowParts = buildRealisticCow(c.subType as 'Holstein' | 'Jersey');
    const y = getHeight(c.x, c.z);
    cowParts.meshGroup.position.set(c.x, y, c.z);
    cowParts.meshGroup.rotation.y = c.rot;
    group.add(cowParts.meshGroup);

    const entity: AnimalEntity = {
      id: c.id,
      species: 'cow',
      subType: c.subType,
      position: { x: c.x, y, z: c.z },
      rotation: c.rot,
      targetRotation: c.rot,
      state: 'graze',
      stateTimer: 0,
      stateDuration: 9 + Math.random() * 14,
      speed: 0.72,
      headAngle: -0.72,
      tailAngle: 0,
      legPhase: Math.random() * Math.PI * 2,
      soundTimer: 16 + Math.random() * 32,
      boundingRadius: 2.0,
    };

    animalInstances.push({
      entity,
      meshGroup: cowParts.meshGroup,
      bodyMesh: cowParts.bodyMesh,
      neckPivot: cowParts.neckPivot,
      headPivot: cowParts.headPivot,
      tailPivot: cowParts.tailPivot,
      legs: cowParts.legs,
      currentGaitPhase: Math.random() * Math.PI * 2,
      currentBodyBob: 0,
      currentSway: 0,
      grazingWeight: 1.0,
    });
  });

  // 2. 8 Sheep on Northern Grassy Knoll
  const sheepConfigs = [
    { id: 'sheep-1', x: -38, z: -92, rot: 0.8 },
    { id: 'sheep-2', x: -44, z: -98, rot: 1.4 },
    { id: 'sheep-3', x: -32, z: -105, rot: -0.6 },
    { id: 'sheep-4', x: -50, z: -88, rot: 2.5 },
    { id: 'sheep-5', x: -58, z: -112, rot: -1.8 },
    { id: 'sheep-6', x: -46, z: -120, rot: 0.3 },
    { id: 'sheep-7', x: -62, z: -95, rot: 1.9 },
    { id: 'sheep-8', x: -36, z: -115, rot: -1.2 },
  ];

  sheepConfigs.forEach((s) => {
    const sheepParts = buildRealisticSheep();
    const y = getHeight(s.x, s.z);
    sheepParts.meshGroup.position.set(s.x, y, s.z);
    sheepParts.meshGroup.rotation.y = s.rot;
    group.add(sheepParts.meshGroup);

    const entity: AnimalEntity = {
      id: s.id,
      species: 'sheep',
      position: { x: s.x, y, z: s.z },
      rotation: s.rot,
      targetRotation: s.rot,
      state: 'graze',
      stateTimer: 0,
      stateDuration: 8 + Math.random() * 12,
      speed: 0.95,
      headAngle: -0.62,
      tailAngle: 0,
      legPhase: Math.random() * Math.PI * 2,
      soundTimer: 18 + Math.random() * 32,
      boundingRadius: 1.3,
    };

    animalInstances.push({
      entity,
      meshGroup: sheepParts.meshGroup,
      bodyMesh: sheepParts.bodyMesh,
      neckPivot: sheepParts.neckPivot,
      headPivot: sheepParts.headPivot,
      tailPivot: sheepParts.tailPivot,
      legs: sheepParts.legs,
      currentGaitPhase: Math.random() * Math.PI * 2,
      currentBodyBob: 0,
      currentSway: 0,
      grazingWeight: 1.0,
    });
  });

  // 3. 5 Goats on Rocky Western Plateau
  const goatConfigs = [
    { id: 'goat-1', x: -58, z: 22, rot: -0.8 },
    { id: 'goat-2', x: -66, z: 28, rot: 0.3 },
    { id: 'goat-3', x: -52, z: 32, rot: 2.1 },
    { id: 'goat-4', x: -74, z: 15, rot: -1.5 },
    { id: 'goat-5', x: -62, z: 38, rot: 0.9 },
  ];

  goatConfigs.forEach((g) => {
    const goatParts = buildRealisticGoat();
    const y = getHeight(g.x, g.z);
    goatParts.meshGroup.position.set(g.x, y, g.z);
    goatParts.meshGroup.rotation.y = g.rot;
    group.add(goatParts.meshGroup);

    const entity: AnimalEntity = {
      id: g.id,
      species: 'goat',
      position: { x: g.x, y, z: g.z },
      rotation: g.rot,
      targetRotation: g.rot,
      state: 'idle',
      stateTimer: 0,
      stateDuration: 6 + Math.random() * 8,
      speed: 1.25,
      headAngle: 0,
      tailAngle: 0,
      legPhase: Math.random() * Math.PI * 2,
      soundTimer: 15 + Math.random() * 30,
      boundingRadius: 1.2,
    };

    animalInstances.push({
      entity,
      meshGroup: goatParts.meshGroup,
      bodyMesh: goatParts.bodyMesh,
      neckPivot: goatParts.neckPivot,
      headPivot: goatParts.headPivot,
      tailPivot: goatParts.tailPivot,
      legs: goatParts.legs,
      currentGaitPhase: Math.random() * Math.PI * 2,
      currentBodyBob: 0,
      currentSway: 0,
      grazingWeight: 0,
    });
  });

  // --- SKELETAL QUADRUPED GAIT & BEHAVIOR SIMULATION ---
  const update = (delta: number, playerPos: THREE.Vector3) => {
    animalInstances.forEach((inst) => {
      const e = inst.entity;
      e.stateTimer += delta;
      e.soundTimer -= delta;

      if (e.isPetted && e.petTimer) {
        e.petTimer -= delta;
        if (e.petTimer <= 0) {
          e.isPetted = false;
        }
      }

      // Spatial 3D vocalization
      if (e.soundTimer <= 0) {
        const distToPlayer = Math.hypot(e.position.x - playerPos.x, e.position.z - playerPos.z);
        if (distToPlayer < 55) {
          if (e.species === 'cow') {
            soundscape.playCowMoo(e.position.x, e.position.y, e.position.z);
          } else if (e.species === 'sheep') {
            soundscape.playSheepBaa(e.position.x, e.position.y, e.position.z);
          } else if (e.species === 'goat') {
            soundscape.playGoatBleat(e.position.x, e.position.y, e.position.z);
          }
        }
        e.soundTimer = 18 + Math.random() * 36;
      }

      // State transitions with smooth interpolation
      if (e.stateTimer >= e.stateDuration && !e.isPetted) {
        e.stateTimer = 0;
        const rand = Math.random();

        if (e.state === 'walk') {
          if (rand < 0.55) {
            e.state = 'graze';
            e.stateDuration = 9 + Math.random() * 15;
          } else if (rand < 0.85) {
            e.state = 'idle';
            e.stateDuration = 5 + Math.random() * 8;
          } else {
            e.state = 'lookAround';
            e.stateDuration = 4 + Math.random() * 6;
          }
        } else {
          if (rand < 0.42) {
            e.state = 'walk';
            e.stateDuration = 6 + Math.random() * 10;
            e.targetRotation = e.rotation + (Math.random() - 0.5) * 1.8;
          } else if (rand < 0.78) {
            e.state = 'graze';
            e.stateDuration = 8 + Math.random() * 14;
          } else if (rand < 0.92) {
            e.state = 'lookAround';
            e.stateDuration = 4 + Math.random() * 6;
          } else {
            e.state = 'rest';
            e.stateDuration = 12 + Math.random() * 18;
          }
        }
      }

      // Smooth turning
      let rotDiff = e.targetRotation - e.rotation;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      e.rotation += rotDiff * Math.min(1, delta * 2.0);

      // Smooth Grazing Neck Interpolation (0 = up, 1 = lowered to grass)
      const targetGrazing = e.state === 'graze' ? 1.0 : 0.0;
      inst.grazingWeight = THREE.MathUtils.lerp(inst.grazingWeight, targetGrazing, delta * 1.8);

      // Perform Quadruped Walking Gait
      const isWalking = e.state === 'walk' && !e.isPetted;

      if (isWalking) {
        const moveDist = e.speed * delta;
        const forwardX = Math.sin(e.rotation) * moveDist;
        const forwardZ = Math.cos(e.rotation) * moveDist;

        const nextX = e.position.x + forwardX;
        const nextZ = e.position.z + forwardZ;

        let allowMove = true;
        if (e.species === 'cow') {
          if (nextX < 16 || nextX > 75 || nextZ < 18 || nextZ > 85) allowMove = false;
        } else if (e.species === 'goat') {
          if (nextX > -40 || nextX < -85 || nextZ < 5 || nextZ > 50) allowMove = false;
        } else if (e.species === 'sheep') {
          if (nextX > -25 || nextX < -75 || nextZ > -75 || nextZ < -135) allowMove = false;
        }

        if (allowMove) {
          e.position.x = nextX;
          e.position.z = nextZ;
        } else {
          e.targetRotation += Math.PI * 0.75;
          e.state = 'idle';
          e.stateTimer = 0;
        }

        // Realistic Quadruped Diagonal Gait Cycle
        inst.currentGaitPhase += delta * e.speed * 4.6;
        const p = inst.currentGaitPhase;

        // Front-Left & Back-Right diagonal pair
        const swing1 = Math.sin(p);
        // Front-Right & Back-Left diagonal pair (180 deg out of phase)
        const swing2 = Math.sin(p + Math.PI);

        // Legs: [FL, FR, BL, BR]
        inst.legs[0].upper.rotation.x = swing1 * 0.38;
        inst.legs[0].lower.rotation.x = Math.max(0, -swing1) * 0.42;

        inst.legs[1].upper.rotation.x = swing2 * 0.38;
        inst.legs[1].lower.rotation.x = Math.max(0, -swing2) * 0.42;

        inst.legs[2].upper.rotation.x = swing2 * 0.35;
        inst.legs[2].lower.rotation.x = Math.max(0, swing2) * 0.38;

        inst.legs[3].upper.rotation.x = swing1 * 0.35;
        inst.legs[3].lower.rotation.x = Math.max(0, swing1) * 0.38;

        // Body Vertical Bobbing (2 bobs per full 4-leg cycle)
        inst.currentBodyBob = Math.abs(Math.sin(p)) * 0.045;
        // Body Lateral Sway & Roll
        inst.currentSway = Math.sin(p) * 0.025;

        inst.bodyMesh.position.y = inst.currentBodyBob;
        inst.bodyMesh.rotation.z = inst.currentSway;
        inst.bodyMesh.rotation.y = inst.currentSway * 0.4;
      } else {
        // Return legs smoothly to neutral standing stance
        inst.legs.forEach((l) => {
          l.upper.rotation.x = THREE.MathUtils.lerp(l.upper.rotation.x, 0, delta * 4);
          l.lower.rotation.x = THREE.MathUtils.lerp(l.lower.rotation.x, 0, delta * 4);
        });
        inst.bodyMesh.position.y = THREE.MathUtils.lerp(inst.bodyMesh.position.y, 0, delta * 3);
        inst.bodyMesh.rotation.z = THREE.MathUtils.lerp(inst.bodyMesh.rotation.z, 0, delta * 3);
        inst.bodyMesh.rotation.y = THREE.MathUtils.lerp(inst.bodyMesh.rotation.y, 0, delta * 3);
      }

      // Smooth Neck & Head Grazing Animation
      const chew = e.state === 'graze' ? Math.sin(e.stateTimer * 4.2) * 0.04 : 0;
      const neckAngle = THREE.MathUtils.lerp(-0.15, -0.72, inst.grazingWeight);
      const headAngle = THREE.MathUtils.lerp(-0.1, -0.35 + chew, inst.grazingWeight);

      inst.neckPivot.rotation.x = neckAngle;
      inst.headPivot.rotation.x = headAngle;

      if (e.state === 'lookAround') {
        inst.neckPivot.rotation.y = Math.sin(e.stateTimer * 1.4) * 0.35;
      } else {
        inst.neckPivot.rotation.y = THREE.MathUtils.lerp(inst.neckPivot.rotation.y, 0, delta * 3);
      }

      // Organic tail swishing
      inst.tailPivot.rotation.z = Math.sin(e.stateTimer * 3.2) * 0.32;
      inst.tailPivot.rotation.x = Math.sin(e.stateTimer * 1.6) * 0.12;

      // Update position on terrain height
      e.position.y = getHeight(e.position.x, e.position.z);
      inst.meshGroup.position.set(e.position.x, e.position.y, e.position.z);
      inst.meshGroup.rotation.y = e.rotation;
    });
  };

  const getInteractables = (playerPos: THREE.Vector3): InteractionTarget[] => {
    const list: InteractionTarget[] = [];
    animalInstances.forEach((inst) => {
      const e = inst.entity;
      const d = Math.hypot(e.position.x - playerPos.x, e.position.z - playerPos.z);
      if (d < 4.2) {
        let name = 'Meadow Cow';
        if (e.species === 'cow') name = e.subType ? `${e.subType} Cow` : 'Pasture Cow';
        else if (e.species === 'sheep') name = 'Suffolk Woolly Sheep';
        else if (e.species === 'goat') name = 'Alpine Farm Goat';

        list.push({
          id: e.id,
          type: 'animal',
          name,
          description: `A calm ${e.species} resting peacefully in the countryside meadow.`,
          position: [e.position.x, e.position.y, e.position.z],
          distance: d,
          actionText: e.isPetted ? 'Calm & Contented' : `Pet ${name}`,
          canPet: !e.isPetted,
        });
      }
    });
    return list;
  };

  const petAnimal = (id: string): boolean => {
    const inst = animalInstances.find((i) => i.entity.id === id);
    if (!inst) return false;
    const e = inst.entity;
    e.isPetted = true;
    e.petTimer = 4.0;
    e.state = 'idle';

    if (e.species === 'cow') {
      soundscape.playCowMoo(e.position.x, e.position.y, e.position.z);
    } else if (e.species === 'sheep') {
      soundscape.playSheepBaa(e.position.x, e.position.y, e.position.z);
    } else if (e.species === 'goat') {
      soundscape.playGoatBleat(e.position.x, e.position.y, e.position.z);
    }
    return true;
  };

  const dispose = () => {
    scene.remove(group);
  };

  return {
    group,
    animals: animalInstances,
    update,
    getInteractables,
    petAnimal,
    dispose,
  };
}
