import * as THREE from 'three';
import {
  getWoodPlanksTexture,
  getBarnWoodTexture,
  getStoneTexture,
  getFarmhouseSidingTexture,
  getRoofShingleTexture,
} from './procedural-textures';
import { InteractionTarget } from './types';

export interface ArchitectureSystem {
  group: THREE.Group;
  interactables: InteractionTarget[];
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

  // --- 1. GRAND TWO-STORY FARMHOUSE HOMESTEAD ---
  // Positioned at x: -12, z: -4
  const houseX = -12;
  const houseZ = -4;
  const houseY = getHeight(houseX, houseZ);

  const houseGroup = new THREE.Group();
  houseGroup.position.set(houseX, houseY, houseZ);

  // Fieldstone foundation
  const foundGeom = new THREE.BoxGeometry(13.5, 1.4, 10.5);
  const foundMesh = new THREE.Mesh(foundGeom, stoneMat);
  foundMesh.position.set(0, 0.7, 0);
  foundMesh.castShadow = true;
  foundMesh.receiveShadow = true;
  houseGroup.add(foundMesh);

  // Ground floor main body
  const bodyGeom = new THREE.BoxGeometry(13.0, 4.2, 10.0);
  const bodyMesh = new THREE.Mesh(bodyGeom, houseSidingMat);
  bodyMesh.position.set(0, 3.5, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  houseGroup.add(bodyMesh);

  // Second floor upper level
  const upperGeom = new THREE.BoxGeometry(12.6, 3.8, 9.6);
  const upperMesh = new THREE.Mesh(upperGeom, houseSidingMat);
  upperMesh.position.set(0, 7.5, 0);
  upperMesh.castShadow = true;
  upperMesh.receiveShadow = true;
  houseGroup.add(upperMesh);

  // Gable Cedar Roof
  const roofGeom = new THREE.ConeGeometry(9.0, 4.4, 4);
  roofGeom.rotateY(Math.PI / 4);
  roofGeom.scale(1.28, 1.0, 0.95);
  const roofMesh = new THREE.Mesh(roofGeom, roofMat);
  roofMesh.position.set(0, 11.6, 0);
  roofMesh.castShadow = true;
  houseGroup.add(roofMesh);

  // Roof Dormer Windows (Front)
  [-3.2, 3.2].forEach((dx) => {
    const dormerGeom = new THREE.BoxGeometry(2.0, 2.0, 2.4);
    const dormer = new THREE.Mesh(dormerGeom, houseSidingMat);
    dormer.position.set(dx, 10.2, 3.8);
    dormer.castShadow = true;
    houseGroup.add(dormer);

    const dormerWin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.1), windowGlassMat);
    dormerWin.position.set(dx, 10.2, 5.02);
    houseGroup.add(dormerWin);
  });

  // Wraparound Covered Porch (Facing Front + Right)
  const porchFloorGeom = new THREE.BoxGeometry(15.2, 0.35, 4.2);
  const porchFloor = new THREE.Mesh(porchFloorGeom, woodMat);
  porchFloor.position.set(0, 1.45, 6.4);
  porchFloor.receiveShadow = true;
  houseGroup.add(porchFloor);

  // Porch roof
  const porchRoofGeom = new THREE.BoxGeometry(15.6, 0.3, 4.5);
  const porchRoof = new THREE.Mesh(porchRoofGeom, roofMat);
  porchRoof.position.set(0, 4.8, 6.4);
  porchRoof.rotation.x = 0.12;
  porchRoof.castShadow = true;
  houseGroup.add(porchRoof);

  // Porch turned pillars & railings
  const pillarGeom = new THREE.CylinderGeometry(0.12, 0.14, 3.4, 6);
  [-6.8, -3.4, 0, 3.4, 6.8].forEach((px) => {
    const pillar = new THREE.Mesh(pillarGeom, whiteTrimMat);
    pillar.position.set(px, 3.1, 8.2);
    pillar.castShadow = true;
    houseGroup.add(pillar);
  });

  // Porch Railing
  const railGeom = new THREE.BoxGeometry(14.8, 0.1, 0.08);
  const railTop = new THREE.Mesh(railGeom, whiteTrimMat);
  railTop.position.set(0, 2.4, 8.2);
  houseGroup.add(railTop);

  // Steps leading down to courtyard
  const stepsGeom = new THREE.BoxGeometry(2.8, 0.25, 0.6);
  for (let st = 0; st < 3; st++) {
    const step = new THREE.Mesh(stepsGeom, woodMat);
    step.position.set(0, 1.2 - st * 0.28, 8.6 + st * 0.55);
    step.receiveShadow = true;
    houseGroup.add(step);
  }

  // Windows with white frames
  const winGeom = new THREE.BoxGeometry(1.4, 1.8, 0.1);
  const winPositions = [
    [-4.5, 3.6, 5.05],
    [4.5, 3.6, 5.05],
    [-4.2, 7.5, 4.85],
    [0, 7.5, 4.85],
    [4.2, 7.5, 4.85],
  ];
  winPositions.forEach(([wx, wy, wz]) => {
    const win = new THREE.Mesh(winGeom, windowGlassMat);
    win.position.set(wx, wy, wz);
    houseGroup.add(win);
  });

  // Solid Timber Front Door with white casing
  const doorGeom = new THREE.BoxGeometry(1.6, 2.8, 0.16);
  const door = new THREE.Mesh(doorGeom, darkWoodMat);
  door.position.set(0, 2.85, 5.05);
  door.castShadow = true;
  houseGroup.add(door);

  // Brick & Stone Chimney
  const chimneyGeom = new THREE.BoxGeometry(1.4, 12.0, 1.6);
  const chimney = new THREE.Mesh(chimneyGeom, stoneMat);
  chimney.position.set(-6.2, 7.5, -1.8);
  chimney.castShadow = true;
  houseGroup.add(chimney);

  // Stacked Firewood Cord beside porch
  const woodCordGeom = new THREE.BoxGeometry(2.4, 1.2, 0.9);
  const woodCord = new THREE.Mesh(woodCordGeom, darkWoodMat);
  woodCord.position.set(-7.5, 0.8, 4.5);
  woodCord.castShadow = true;
  houseGroup.add(woodCord);

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

  // --- 4. THE GREAT RED GAMBREL BARN ---
  // Positioned at x: 28, z: 8
  const barnX = 28;
  const barnZ = 8;
  const barnY = getHeight(barnX, barnZ);

  const barnGroup = new THREE.Group();
  barnGroup.position.set(barnX, barnY, barnZ);

  // Main high barn structure
  const barnBodyGeom = new THREE.BoxGeometry(18, 9.5, 24);
  const barnBody = new THREE.Mesh(barnBodyGeom, barnMat);
  barnBody.position.set(0, 4.75, 0);
  barnBody.castShadow = true;
  barnBody.receiveShadow = true;
  barnGroup.add(barnBody);

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

  // Double Sliding Barn Doors (with white X cross-bracing)
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

  // Wagon wheel leaning against barn wall
  const wheelGeom = new THREE.TorusGeometry(0.8, 0.08, 6, 16);
  const wheel = new THREE.Mesh(wheelGeom, darkWoodMat);
  wheel.position.set(9.2, 0.85, 11.2);
  wheel.rotation.y = 0.25;
  wheel.rotation.x = 0.15;
  wheel.castShadow = true;
  barnGroup.add(wheel);

  // Metal milk cans
  const canGeom = new THREE.CylinderGeometry(0.24, 0.28, 0.75, 8);
  [
    [-3.8, 0.45, 12.6],
    [-4.5, 0.45, 12.8],
  ].forEach(([cx, cy, cz]) => {
    const can = new THREE.Mesh(canGeom, ironMat);
    can.position.set(cx, cy, cz);
    can.castShadow = true;
    barnGroup.add(can);
  });

  group.add(barnGroup);

  // --- 5. WOODEN POST-AND-RAIL FENCES & INTERACTIVE SWING GATES ---
  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x645444,
    roughness: 0.88,
  });

  const postGeom = new THREE.CylinderGeometry(0.11, 0.13, 1.6, 6);

  const buildFenceSegment = (x1: number, z1: number, x2: number, z2: number) => {
    const dist = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.ceil(dist / 3.2);
    const angle = Math.atan2(x2 - x1, z2 - z1);

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
  buildInteractiveGate('pasture-gate', 'Main Meadow Pasture Gate', 14, 22, Math.PI / 2);
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
    toggleGate,
    isGateOpen,
    dispose,
  };
}
