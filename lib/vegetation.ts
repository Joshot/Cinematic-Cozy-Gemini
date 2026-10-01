import * as THREE from 'three';
import { getBarkTexture, getBirchBarkTexture, getLeafClusterTexture } from './procedural-textures';
import { isNearPath } from './terrain';

export interface VegetationSystem {
  group: THREE.Group;
  update: (time: number, windStrength: number) => void;
  dispose: () => void;
}

export function createVegetation(
  scene: THREE.Scene,
  getHeight: (x: number, z: number) => number,
  densityRatio = 1.0
): VegetationSystem {
  const group = new THREE.Group();
  scene.add(group);

  // --- 1. REALISTIC 3D INSTANCED WIND-SWAYING GRASS ---
  const bladeH = 0.82;
  const bladeW = 0.12;
  const grassGeom = new THREE.PlaneGeometry(bladeW, bladeH, 1, 4);
  grassGeom.translate(0, bladeH / 2, 0);

  const grassUniforms = {
    uTime: { value: 0 },
    uWindStrength: { value: 1.0 },
  };

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x486b2a,
    roughness: 0.62,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = grassUniforms.uTime;
    shader.uniforms.uWindStrength = grassUniforms.uWindStrength;

    shader.vertexShader = `
      uniform float uTime;
      uniform float uWindStrength;
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float heightFactor = clamp(position.y / 0.82, 0.0, 1.0);
      vec4 worldInstancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      
      // Multi-octave natural rolling wind waves across the meadow
      float wave1 = sin(uTime * 2.2 + worldInstancePos.x * 0.15 + worldInstancePos.z * 0.12);
      float wave2 = cos(uTime * 3.6 + worldInstancePos.x * 0.32 - worldInstancePos.z * 0.26);
      float gust = sin(uTime * 0.75 + worldInstancePos.x * 0.05 + worldInstancePos.z * 0.04);
      
      float totalSway = (wave1 * 0.6 + wave2 * 0.3 + gust * 0.35) * uWindStrength * heightFactor * heightFactor * 0.26;
      
      transformed.x += totalSway;
      transformed.z += totalSway * 0.72;
      `
    );
  };

  const baseBladeCount = Math.floor(22000 * densityRatio);
  const grassInstanced = new THREE.InstancedMesh(grassGeom, grassMat, baseBladeCount);
  grassInstanced.receiveShadow = true;
  grassInstanced.castShadow = false;

  const dummy = new THREE.Object3D();
  let validBlades = 0;

  for (let i = 0; i < baseBladeCount * 2.4 && validBlades < baseBladeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * 135;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    // Exclusion zones: homestead yard, pond, carriage roads
    if (Math.hypot(x - 8, z + 2) < 26) continue;
    if (Math.hypot(x - 35, (z + 48) * 0.85) < 26) continue;
    if (isNearPath(x, z).near) continue;

    const y = getHeight(x, z);
    dummy.position.set(x + (Math.random() - 0.5) * 0.9, y, z + (Math.random() - 0.5) * 0.9);

    const scale = 0.75 + Math.random() * 0.65;
    dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.5), scale);
    dummy.rotation.set((Math.random() - 0.5) * 0.15, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.15);
    dummy.updateMatrix();

    grassInstanced.setMatrixAt(validBlades, dummy.matrix);
    validBlades++;
  }

  grassInstanced.instanceMatrix.needsUpdate = true;
  group.add(grassInstanced);

  // --- 2. WILDFLOWERS (Poppies, Dandelions, Lavender, Daisies) ---
  const flowerCount = 900;
  const flowerPetalGeom = new THREE.ConeGeometry(0.14, 0.12, 5);
  flowerPetalGeom.rotateX(Math.PI);

  const poppyMat = new THREE.MeshStandardMaterial({ color: 0xcc2820, roughness: 0.55 });
  const dandelionMat = new THREE.MeshStandardMaterial({ color: 0xe6b822, roughness: 0.5 });
  const lavenderMat = new THREE.MeshStandardMaterial({ color: 0x7562a6, roughness: 0.6 });
  const daisyMat = new THREE.MeshStandardMaterial({ color: 0xf2efe4, roughness: 0.55 });

  const flowerMats = [poppyMat, dandelionMat, lavenderMat, daisyMat];
  const flowerInstancedList: THREE.InstancedMesh[] = [];

  flowerMats.forEach((mat) => {
    const mesh = new THREE.InstancedMesh(flowerPetalGeom, mat, Math.floor(flowerCount / 4));
    mesh.castShadow = true;
    flowerInstancedList.push(mesh);
    group.add(mesh);
  });

  let flowerIdx = 0;
  for (let i = 0; i < flowerCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 120;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    if (Math.hypot(x - 8, z + 2) < 22) continue;
    if (Math.hypot(x - 35, (z + 48) * 0.85) < 25) continue;
    if (isNearPath(x, z).near) continue;

    const y = getHeight(x, z);
    dummy.position.set(x, y + 0.38, z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.updateMatrix();

    const bucket = flowerIdx % flowerMats.length;
    const idxInBucket = Math.floor(flowerIdx / flowerMats.length);
    if (idxInBucket < flowerCount / 4) {
      flowerInstancedList[bucket].setMatrixAt(idxInBucket, dummy.matrix);
    }
    flowerIdx++;
  }

  flowerInstancedList.forEach((m) => {
    m.instanceMatrix.needsUpdate = true;
  });

  // --- 3. REALISTIC ARTICULATED TREES (ZERO DODECAHEDRON SPHERES!) ---
  // Beautiful branched trees with textured leaf cards and wind animation
  const treeUniforms = {
    uTime: { value: 0 },
    uWindStrength: { value: 1.0 },
  };

  const leafTexture = getLeafClusterTexture();
  leafTexture.repeat.set(1, 1);

  // Shared Realistic Foliage Material with Subsurface Scattering & Wind Shader
  const foliageMat = new THREE.MeshStandardMaterial({
    map: leafTexture,
    roughness: 0.65,
    metalness: 0.02,
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.22,
  });

  foliageMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = treeUniforms.uTime;
    shader.uniforms.uWindStrength = treeUniforms.uWindStrength;

    shader.vertexShader = `
      uniform float uTime;
      uniform float uWindStrength;
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      
      // Branch level gentle sway
      float branchSway = sin(uTime * 1.5 + worldPos.x * 0.15 + worldPos.z * 0.12) * 0.14 * uWindStrength;
      // High-frequency leaf flutter
      float leafFlutter = sin(uTime * 5.2 + position.y * 6.0 + position.x * 8.0) * 0.045 * uWindStrength;
      
      transformed.x += branchSway + leafFlutter;
      transformed.z += branchSway * 0.7 + leafFlutter * 0.5;
      `
    );
  };

  // Birch Foliage (golden-lime tint)
  const birchFoliageMat = new THREE.MeshStandardMaterial({
    map: leafTexture,
    color: 0xc8db78,
    roughness: 0.62,
    metalness: 0.02,
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.22,
  });
  birchFoliageMat.onBeforeCompile = foliageMat.onBeforeCompile;

  // Pine Needle Material
  const pineNeedleMat = new THREE.MeshStandardMaterial({
    color: 0x1c3820,
    roughness: 0.78,
    metalness: 0.02,
    flatShading: true,
  });

  // Bark Materials
  const oakBarkTex = getBarkTexture();
  oakBarkTex.repeat.set(2, 6);
  const oakBarkMat = new THREE.MeshStandardMaterial({
    map: oakBarkTex,
    roughness: 0.88,
    metalness: 0.04,
  });

  const birchBarkTex = getBirchBarkTexture();
  birchBarkTex.repeat.set(2, 5);
  const birchBarkMat = new THREE.MeshStandardMaterial({
    map: birchBarkTex,
    roughness: 0.84,
    metalness: 0.02,
  });

  const pineBarkMat = new THREE.MeshStandardMaterial({
    color: 0x362b24,
    roughness: 0.92,
  });

  // Reusable leaf cluster geometry: 3 crossed plane cards with organic offset
  const leafClusterGeom = new THREE.Group();
  const cardGeom = new THREE.PlaneGeometry(2.4, 2.4);
  [-0.3, 0, 0.3].forEach((rot, idx) => {
    const card = new THREE.Mesh(cardGeom, foliageMat);
    card.rotation.y = rot * Math.PI + (idx * Math.PI) / 3;
    card.rotation.x = (idx % 2 === 0 ? 0.2 : -0.2);
    leafClusterGeom.add(card);
  });

  // Tree Generators:

  // 1. REALISTIC OAK TREE (Trunk + 4 spreading boughs + leaf clusters)
  const spawnOakTree = (x: number, z: number, scale = 1.0) => {
    const y = getHeight(x, z);
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);

    // Main Trunk
    const trunkH = 5.8 * scale;
    const trunkGeom = new THREE.CylinderGeometry(0.36 * scale, 0.68 * scale, trunkH, 8);
    trunkGeom.translate(0, trunkH / 2, 0);
    const trunk = new THREE.Mesh(trunkGeom, oakBarkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // 4 Spreading Main Boughs
    const boughAngles = [0.2, 1.8, 3.4, 4.9];
    boughAngles.forEach((bAngle, bIdx) => {
      const boughLen = (3.2 + (bIdx % 2) * 0.8) * scale;
      const boughGeom = new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, boughLen, 6);
      boughGeom.translate(0, boughLen / 2, 0);
      const bough = new THREE.Mesh(boughGeom, oakBarkMat);
      bough.position.set(0, trunkH * 0.78, 0);
      bough.rotation.y = bAngle;
      bough.rotation.z = 0.55 + (bIdx % 2) * 0.15;
      bough.castShadow = true;
      treeGroup.add(bough);

      // Leaf clusters at branch ends
      const clusterCount = 3;
      for (let c = 0; c < clusterCount; c++) {
        const cluster = leafClusterGeom.clone(true);
        const distOut = boughLen * (0.6 + c * 0.22);
        const cx = Math.sin(bAngle) * Math.sin(bough.rotation.z) * distOut;
        const cy = trunkH * 0.78 + Math.cos(bough.rotation.z) * distOut;
        const cz = Math.cos(bAngle) * Math.sin(bough.rotation.z) * distOut;

        cluster.position.set(cx, cy, cz);
        cluster.scale.set(scale * 1.3, scale * 1.3, scale * 1.3);
        cluster.rotation.set(Math.random(), Math.random(), Math.random());
        treeGroup.add(cluster);
      }
    });

    // Top Crown Clusters
    for (let c = 0; c < 4; c++) {
      const cluster = leafClusterGeom.clone(true);
      cluster.position.set((Math.random() - 0.5) * 1.5 * scale, trunkH + (0.5 + c * 0.6) * scale, (Math.random() - 0.5) * 1.5 * scale);
      cluster.scale.set(scale * 1.4, scale * 1.4, scale * 1.4);
      cluster.rotation.set(Math.random(), Math.random(), Math.random());
      treeGroup.add(cluster);
    }

    group.add(treeGroup);
  };

  // 2. REALISTIC PAPER BIRCH TREE
  const spawnBirchTree = (x: number, z: number, scale = 1.0) => {
    const y = getHeight(x, z);
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);

    const trunkH = 7.5 * scale;
    const trunkGeom = new THREE.CylinderGeometry(0.18 * scale, 0.32 * scale, trunkH, 7);
    trunkGeom.translate(0, trunkH / 2, 0);
    const trunk = new THREE.Mesh(trunkGeom, birchBarkMat);
    trunk.rotation.z = (Math.random() - 0.5) * 0.08;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Slender side branches with light fluttering leaf clusters
    for (let b = 0; b < 6; b++) {
      const frac = 0.45 + (b / 6) * 0.5;
      const bAngle = (b * Math.PI) / 2.5;
      const cluster = leafClusterGeom.clone(true);
      const bRad = (1.8 - (b / 6) * 0.8) * scale;

      cluster.position.set(Math.sin(bAngle) * bRad, trunkH * frac, Math.cos(bAngle) * bRad);
      cluster.scale.set(scale * 1.1, scale * 1.1, scale * 1.1);
      cluster.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = birchFoliageMat;
        }
      });
      treeGroup.add(cluster);
    }

    group.add(treeGroup);
  };

  // 3. REALISTIC SCOTS PINE TREE
  const spawnPineTree = (x: number, z: number, scale = 1.0) => {
    const y = getHeight(x, z);
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);

    const trunkH = 9.0 * scale;
    const trunkGeom = new THREE.CylinderGeometry(0.22 * scale, 0.48 * scale, trunkH, 6);
    trunkGeom.translate(0, trunkH / 2, 0);
    const trunk = new THREE.Mesh(trunkGeom, pineBarkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Layered tiered needle fronds (multi-cone silhouettes)
    for (let t = 0; t < 5; t++) {
      const tierR = (2.8 - t * 0.45) * scale;
      const tierH = 2.2 * scale;
      const coneGeom = new THREE.ConeGeometry(tierR, tierH, 7);
      const cone = new THREE.Mesh(coneGeom, pineNeedleMat);
      cone.position.set(0, trunkH * 0.35 + t * 1.5 * scale, 0);
      cone.castShadow = true;
      cone.receiveShadow = true;
      treeGroup.add(cone);
    }

    group.add(treeGroup);
  };

  // 4. WEEPING WILLOW near pond
  const spawnWillowTree = (x: number, z: number, scale = 1.1) => {
    const y = getHeight(x, z);
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);

    const trunkH = 5.2 * scale;
    const trunkGeom = new THREE.CylinderGeometry(0.35 * scale, 0.58 * scale, trunkH, 8);
    trunkGeom.translate(0, trunkH / 2, 0);
    const trunk = new THREE.Mesh(trunkGeom, oakBarkMat);
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Weeping branches
    for (let b = 0; b < 6; b++) {
      const angle = (b * Math.PI) / 3;
      const cluster = leafClusterGeom.clone(true);
      cluster.position.set(Math.sin(angle) * 3.2 * scale, trunkH * 0.95 - (b % 2) * 0.5, Math.cos(angle) * 3.2 * scale);
      cluster.scale.set(scale * 1.5, scale * 2.0, scale * 1.5);
      treeGroup.add(cluster);
    }

    group.add(treeGroup);
  };

  // Place trees in natural groupings (homestead shade, pondside, pasture, and forest perimeter)
  // 1. Homestead shade trees (safely away from behind the farmhouse roof)
  spawnOakTree(-28, 18, 1.25);
  spawnOakTree(-32, -18, 1.35);
  spawnBirchTree(-18, 28, 1.15);
  spawnBirchTree(-8, 32, 1.1);

  // 2. Pondside Willows & Birches
  spawnWillowTree(22, -62, 1.2);
  spawnWillowTree(52, -65, 1.25);
  spawnWillowTree(55, -36, 1.15);
  spawnBirchTree(18, -42, 1.2);
  spawnBirchTree(45, -34, 1.1);

  // 3. Eastern Pasture & Cattle Hill
  spawnOakTree(58, 48, 1.3);
  spawnOakTree(72, 38, 1.4);
  spawnOakTree(82, 65, 1.2);
  spawnBirchTree(65, 22, 1.15);
  spawnBirchTree(85, 42, 1.1);

  // 4. Rocky Goat Ridge Pines
  spawnPineTree(-68, -22, 1.2);
  spawnPineTree(-78, -38, 1.35);
  spawnPineTree(-88, -18, 1.15);
  spawnPineTree(-72, 12, 1.25);

  // 5. Northern Sheep Knoll Trees
  spawnOakTree(-45, -98, 1.2);
  spawnOakTree(-62, -118, 1.3);
  spawnBirchTree(-38, -88, 1.2);
  spawnBirchTree(-65, -108, 1.15);

  // 6. Perimeter Forest Ring (80+ trees creating rich natural horizon depth)
  for (let i = 0; i < 85; i++) {
    const angle = (i / 85) * Math.PI * 2;
    const r = 150 + Math.random() * 45;
    const tx = Math.cos(angle) * r;
    const tz = Math.sin(angle) * r;
    const treeType = i % 3;

    if (treeType === 0) {
      spawnOakTree(tx, tz, 0.95 + Math.random() * 0.45);
    } else if (treeType === 1) {
      spawnBirchTree(tx, tz, 0.9 + Math.random() * 0.4);
    } else {
      spawnPineTree(tx, tz, 1.0 + Math.random() * 0.5);
    }
  }

  // --- 4. EXPANDED GOLDEN WHEAT FIELD ---
  const wheatCount = 2600;
  const wheatGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.15, 3);
  wheatGeom.translate(0, 0.58, 0);

  const wheatMat = new THREE.MeshStandardMaterial({
    color: 0xd4a843,
    roughness: 0.75,
  });

  const wheatInstanced = new THREE.InstancedMesh(wheatGeom, wheatMat, wheatCount);
  wheatInstanced.castShadow = false;
  wheatInstanced.receiveShadow = true;

  let wIdx = 0;
  for (let r = 0; r < 40; r++) {
    for (let c = 0; c < 65; c++) {
      if (wIdx >= wheatCount) break;
      const wx = 38 + (r * 0.75) + (Math.random() - 0.5) * 0.15;
      const wz = 10 + (c * 0.45) + (Math.random() - 0.5) * 0.15;
      const wy = getHeight(wx, wz);

      dummy.position.set(wx, wy, wz);
      dummy.scale.set(1, 0.85 + Math.random() * 0.35, 1);
      dummy.rotation.set((Math.random() - 0.5) * 0.1, Math.random() * Math.PI, (Math.random() - 0.5) * 0.1);
      dummy.updateMatrix();

      wheatInstanced.setMatrixAt(wIdx, dummy.matrix);
      wIdx++;
    }
  }
  wheatInstanced.instanceMatrix.needsUpdate = true;
  group.add(wheatInstanced);

  // --- 5. FIELDSTONE BOULDERS (Organic Rounded Mesh, zero faceted dodecahedrons) ---
  const rockGeom = new THREE.SphereGeometry(1.2, 8, 8);
  rockGeom.scale(1.2, 0.75, 1.1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x5a5650,
    roughness: 0.88,
    metalness: 0.04,
  });

  const rockPositions = [
    { x: -55, z: 28, s: 1.6 },
    { x: -50, z: 32, s: 1.1 },
    { x: -75, z: -25, s: 2.6 },
    { x: -82, z: -32, s: 2.2 },
    { x: 42, z: -32, s: 1.3 },
    { x: 46, z: -36, s: 0.9 },
    { x: 72, z: 38, s: 2.1 },
    { x: 78, z: 42, s: 1.5 },
    { x: -45, z: -85, s: 1.8 },
  ];

  rockPositions.forEach((pos) => {
    const rock = new THREE.Mesh(rockGeom, rockMat);
    const ry = getHeight(pos.x, pos.z);
    rock.position.set(pos.x, ry + 0.35 * pos.s, pos.z);
    rock.scale.set(pos.s * (0.8 + Math.random() * 0.4), pos.s * 0.65, pos.s * (0.8 + Math.random() * 0.4));
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  });

  const update = (time: number, windStrength: number) => {
    grassUniforms.uTime.value = time;
    grassUniforms.uWindStrength.value = windStrength;
    treeUniforms.uTime.value = time;
    treeUniforms.uWindStrength.value = windStrength;
  };

  const dispose = () => {
    scene.remove(group);
  };

  return {
    group,
    update,
    dispose,
  };
}
