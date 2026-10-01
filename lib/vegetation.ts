import * as THREE from 'three';
import { getBarkTexture, getBirchBarkTexture, getLeafClusterTexture, getGrassBladeTexture } from './procedural-textures';
import { isNearPath } from './terrain';

export interface VegetationSystem {
  group: THREE.Group;
  update: (time: number, windStrength: number) => void;
  dispose: () => void;
  treeColliders: { x: number; z: number; radius: number }[];
}

export function createVegetation(
  scene: THREE.Scene,
  getHeight: (x: number, z: number) => number,
  densityRatio = 1.0
): VegetationSystem {
  const group = new THREE.Group();
  scene.add(group);
  const treeColliders: { x: number; z: number; radius: number }[] = [];

  // ============================================
  // 1. CINEMATIC 3D CLUMPED GPU-INSTANCED GRASS SYSTEM
  // ============================================
  // 3-Plane Star-Crossed Clump Geometry (360-degree volume, never disappears edge-on)
  function createCrossedGrassGeometry(w: number, h: number, segments: number): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const angles = [0, Math.PI / 3, (Math.PI * 2) / 3];
    let vertOffset = 0;

    angles.forEach((rot) => {
      const cosA = Math.cos(rot);
      const sinA = Math.sin(rot);
      const hw = w * 0.5;

      for (let yIdx = 0; yIdx <= segments; yIdx++) {
        const fracY = yIdx / segments;
        const curY = fracY * h;
        // Blade tip tapering
        const taper = 1.0 - fracY * 0.72;
        const curW = hw * taper;

        // Left vertex
        positions.push(-curW * cosA, curY, -curW * sinA);
        normals.push(-sinA, 0.25, cosA);
        uvs.push(0, fracY);

        // Right vertex
        positions.push(curW * cosA, curY, curW * sinA);
        normals.push(-sinA, 0.25, cosA);
        uvs.push(1, fracY);
      }

      for (let yIdx = 0; yIdx < segments; yIdx++) {
        const row = vertOffset + yIdx * 2;
        indices.push(row, row + 1, row + 2);
        indices.push(row + 1, row + 3, row + 2);
        // Double-sided triangle winding
        indices.push(row, row + 2, row + 1);
        indices.push(row + 1, row + 2, row + 3);
      }
      vertOffset += (segments + 1) * 2;
    });

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }

  const bladeH = 0.88;
  const bladeW = 0.16;
  const grassGeom = createCrossedGrassGeometry(bladeW, bladeH, 4);

  const grassUniforms = {
    uTime: { value: 0 },
    uWindStrength: { value: 1.0 },
    uWindDirection: { value: new THREE.Vector2(0.7, 0.3) },
  };

  const bladeTexture = getGrassBladeTexture();

  // Custom grass material with advanced wind shader & translucency
  const grassMat = new THREE.MeshStandardMaterial({
    map: bladeTexture,
    roughness: 0.55,
    metalness: 0.01,
    side: THREE.DoubleSide,
    alphaTest: 0.15,
  });

  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = grassUniforms.uTime;
    shader.uniforms.uWindStrength = grassUniforms.uWindStrength;
    shader.uniforms.uWindDirection = grassUniforms.uWindDirection;

    shader.vertexShader = `
      uniform float uTime;
      uniform float uWindStrength;
      uniform vec2 uWindDirection;
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      
      // World position of instance
      vec4 worldInstancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      
      // Height factor (quadratic: tips bend significantly more than base)
      float heightFactor = clamp(position.y / ${bladeH.toFixed(2)}, 0.0, 1.0);
      float bendPower = heightFactor * heightFactor;
      
      // Multi-frequency wind wave calculation
      float windPhase = worldInstancePos.x * uWindDirection.x * 0.14 + worldInstancePos.z * uWindDirection.y * 0.14;
      
      // Primary rolling breeze
      float primaryWave = sin(uTime * 1.9 + windPhase) * 0.55;
      
      // Medium turbulent gust
      float gustWave = sin(uTime * 3.4 + worldInstancePos.x * 0.3 - worldInstancePos.z * 0.25) * 0.32;
      
      // Breathing gust burst envelope ("angin sepoi-sepoi")
      float gustEnvelope = 0.65 + 0.35 * sin(uTime * 0.38 + worldInstancePos.x * 0.05);
      
      // Subtle tip vibration
      float flutter = sin(uTime * 8.0 + worldInstancePos.x * 2.0 + worldInstancePos.z * 2.4) * 0.07;
      
      float totalSway = (primaryWave + gustWave * gustEnvelope + flutter) * uWindStrength * bendPower * 0.32;
      float lateralSway = totalSway * 0.55;
      
      transformed.x += totalSway;
      transformed.z += lateralSway;
      transformed.y -= abs(totalSway) * 0.16 * heightFactor;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      // Sun-drenched tips, rich dark meadow bases
      float tipFade = smoothstep(0.05, 0.9, vUv.y);
      diffuseColor.rgb = mix(
        diffuseColor.rgb * 0.72,
        diffuseColor.rgb * 1.25,
        tipFade
      );
      diffuseColor.rgb += vec3(0.02, 0.03, -0.01) * tipFade;
      `
    );
  };

  // Cinematic Grass Clump Density (360,000 3-blade tufts = 1,080,000 blades!)
  const baseBladeCount = Math.floor(360000 * densityRatio);
  const grassInstanced = new THREE.InstancedMesh(grassGeom, grassMat, baseBladeCount);
  grassInstanced.receiveShadow = true;
  grassInstanced.castShadow = false;
  grassInstanced.frustumCulled = true;

  const dummy = new THREE.Object3D();
  const instanceColors = new Float32Array(baseBladeCount * 3);
  let validBlades = 0;

  for (let i = 0; i < baseBladeCount * 2.2 && validBlades < baseBladeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    // Lush distribution radius covering the farm and meadows
    const dist = Math.random() * 95;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    // Only exclude inside building walls and deep pond water
    // House interior: x: -18.5 to -5.5, z: -9.5 to 1.5
    if (x > -18.5 && x < -5.5 && z > -9.5 && z < 1.5) continue;
    // Barn interior: x: 19 to 37, z: -4 to 20
    if (x > 19 && x < 37 && z > -4 && z < 20) continue;
    // Pond water basin
    if (Math.hypot(x - 35, (z + 48) * 0.85) < 18) continue;

    // Carriage road: only skip central wheel rut (factor > 0.85), grass flourishes along edges!
    const road = isNearPath(x, z);
    if (road.near && road.factor > 0.82) continue;

    const y = getHeight(x, z);
    dummy.position.set(x + (Math.random() - 0.5) * 0.8, y, z + (Math.random() - 0.5) * 0.8);

    // Natural height variation
    const heightVariation = 0.65 + Math.random() * 0.75;
    const widthVariation = 0.85 + Math.random() * 0.35;
    dummy.scale.set(widthVariation, heightVariation, widthVariation);
    dummy.rotation.set(
      (Math.random() - 0.5) * 0.12,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.12
    );
    dummy.updateMatrix();

    grassInstanced.setMatrixAt(validBlades, dummy.matrix);

    // Natural multi-tonal meadow coloring
    const colorNoise = (Math.random() - 0.5) * 0.07;
    const isDryPatch = Math.random() < 0.12;
    if (isDryPatch) {
      // Warm golden rye / dry grass tips
      instanceColors[validBlades * 3] = 0.44 + colorNoise;
      instanceColors[validBlades * 3 + 1] = 0.46 + colorNoise;
      instanceColors[validBlades * 3 + 2] = 0.20 + colorNoise * 0.2;
    } else {
      // Vibrant lush meadow green
      instanceColors[validBlades * 3] = 0.29 + colorNoise;
      instanceColors[validBlades * 3 + 1] = 0.48 + colorNoise;
      instanceColors[validBlades * 3 + 2] = 0.16 + colorNoise * 0.2;
    }

    validBlades++;
  }

  grassInstanced.instanceMatrix.needsUpdate = true;
  grassInstanced.instanceColor = new THREE.InstancedBufferAttribute(instanceColors, 3);
  grassInstanced.computeBoundingSphere();
  group.add(grassInstanced);

  // ============================================
  // 2. PROCEDURAL WILDFLOWERS WITH STEMS & GROUND CLUTTER
  // ============================================
  const flowerCount = 1800;
  const stemGeom = new THREE.CylinderGeometry(0.012, 0.018, 0.38, 4);
  stemGeom.translate(0, 0.19, 0);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3d6628, roughness: 0.8 });
  const stemMesh = new THREE.InstancedMesh(stemGeom, stemMat, flowerCount);
  group.add(stemMesh);

  const flowerPetalGeom = new THREE.ConeGeometry(0.14, 0.12, 5);
  flowerPetalGeom.rotateX(Math.PI);

  const poppyMat = new THREE.MeshStandardMaterial({ color: 0xcc2820, roughness: 0.55, metalness: 0.02 });
  const dandelionMat = new THREE.MeshStandardMaterial({ color: 0xe6b822, roughness: 0.5, metalness: 0.02 });
  const lavenderMat = new THREE.MeshStandardMaterial({ color: 0x7562a6, roughness: 0.6, metalness: 0.02 });
  const daisyMat = new THREE.MeshStandardMaterial({ color: 0xf2efe4, roughness: 0.55, metalness: 0.02 });
  const cloverMat = new THREE.MeshStandardMaterial({ color: 0xd4508a, roughness: 0.55, metalness: 0.02 });

  const flowerMats = [poppyMat, dandelionMat, lavenderMat, daisyMat, cloverMat];
  const flowerInstancedList: THREE.InstancedMesh[] = [];
  const flowersPerType = Math.floor(flowerCount / flowerMats.length);

  flowerMats.forEach((mat) => {
    const mesh = new THREE.InstancedMesh(flowerPetalGeom, mat, flowersPerType);
    mesh.castShadow = true;
    flowerInstancedList.push(mesh);
    group.add(mesh);
  });

  const dummyBlossom = new THREE.Object3D();
  let flowerIdx = 0;
  for (let i = 0; i < flowerCount; i++) {
    const angle = (i * 1.618033) * Math.PI * 2; // Golden ratio deterministic dispersion
    const dist = 5 + ((i * 17) % 135);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    // Exclude inside buildings and deep pond water
    if (x > -18.5 && x < -5.5 && z > -9.5 && z < 1.5) continue;
    if (x > 19 && x < 37 && z > -4 && z < 20) continue;
    if (Math.hypot(x - 35, (z + 48) * 0.85) < 18) continue;
    const road = isNearPath(x, z);
    if (road.near && road.factor > 0.85) continue;

    const y = getHeight(x, z);
    const flowerScale = 0.75 + Math.random() * 0.55;

    // Grounded stem
    dummy.position.set(x, y, z);
    dummy.scale.set(1, flowerScale, 1);
    dummy.rotation.set((Math.random() - 0.5) * 0.15, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.15);
    dummy.updateMatrix();
    stemMesh.setMatrixAt(flowerIdx, dummy.matrix);

    // Blossom atop stem
    dummyBlossom.position.set(x, y + 0.38 * flowerScale, z);
    dummyBlossom.scale.set(flowerScale, flowerScale, flowerScale);
    dummyBlossom.rotation.copy(dummy.rotation);
    dummyBlossom.updateMatrix();

    const bucket = flowerIdx % flowerMats.length;
    const idxInBucket = Math.floor(flowerIdx / flowerMats.length);
    if (idxInBucket < flowersPerType) {
      flowerInstancedList[bucket].setMatrixAt(idxInBucket, dummyBlossom.matrix);
    }
    flowerIdx++;
  }

  stemMesh.instanceMatrix.needsUpdate = true;
  stemMesh.computeBoundingSphere();

  flowerInstancedList.forEach((m) => {
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  });

  // --- 2b. PROCEDURAL FALLEN STICKS & FOREST PEBBLES ---
  const stickCount = 280;
  const stickGeom = new THREE.CylinderGeometry(0.022, 0.032, 0.85, 4);
  stickGeom.rotateZ(Math.PI / 2);
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x483a2d, roughness: 0.95 });
  const stickMesh = new THREE.InstancedMesh(stickGeom, stickMat, stickCount);
  stickMesh.receiveShadow = true;
  group.add(stickMesh);

  for (let s = 0; s < stickCount; s++) {
    const angle = (s / stickCount) * Math.PI * 2 * 6.7;
    const dist = 10 + ((s * 31) % 115);
    const sx = Math.cos(angle) * dist;
    const sz = Math.sin(angle) * dist;
    if (Math.hypot(sx - 8, sz + 2) < 18) continue;
    const sy = getHeight(sx, sz);

    dummy.position.set(sx, sy + 0.02, sz);
    dummy.rotation.set(0.04, Math.random() * Math.PI, 0.04);
    dummy.scale.set(0.6 + Math.random() * 0.8, 1, 0.6 + Math.random() * 0.8);
    dummy.updateMatrix();
    stickMesh.setMatrixAt(s, dummy.matrix);
  }
  stickMesh.instanceMatrix.needsUpdate = true;
  stickMesh.computeBoundingSphere();

  // ============================================
  // 3. REALISTIC ARTICULATED TREES WITH WIND SHADERS
  // ============================================
  const treeUniforms = {
    uTime: { value: 0 },
    uWindStrength: { value: 1.0 },
  };

  const leafTexture = getLeafClusterTexture();
  leafTexture.repeat.set(1, 1);

  // Advanced Foliage Material — wind deformation, subsurface scattering approximation
  const foliageMat = new THREE.MeshStandardMaterial({
    map: leafTexture,
    roughness: 0.58,
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
      
      // Large branch sway (slow, heavy movement)
      float branchPhase = worldPos.x * 0.08 + worldPos.z * 0.06;
      float branchSway = sin(uTime * 1.2 + branchPhase) * 0.18 * uWindStrength;
      
      // Medium branch movement
      float medBranch = sin(uTime * 2.4 + worldPos.x * 0.2 + worldPos.z * 0.15) * 0.08 * uWindStrength;
      
      // High-frequency leaf flutter (different per leaf cluster)
      float leafFlutter = sin(uTime * 5.8 + position.y * 7.0 + position.x * 9.0) * 0.05 * uWindStrength;
      float leafFlutter2 = cos(uTime * 4.2 + position.z * 6.0) * 0.03 * uWindStrength;
      
      // Gust envelope (makes wind feel alive with bursts)
      float gustEnvelope = 0.6 + 0.4 * sin(uTime * 0.45 + worldPos.x * 0.03);
      
      float totalX = (branchSway + medBranch + leafFlutter) * gustEnvelope;
      float totalZ = (branchSway * 0.65 + leafFlutter2) * gustEnvelope;
      
      transformed.x += totalX;
      transformed.z += totalZ;
      transformed.y -= abs(totalX) * 0.05; // Leaves dip slightly when blown
      `
    );

    // Subsurface scattering approximation for leaves
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      // Subtle translucency — leaves glow faintly when lit from behind
      vec3 viewDir = normalize(vViewPosition);
      float translucency = max(0.0, dot(normalize(vNormal), -viewDir)) * 0.12;
      diffuseColor.rgb += vec3(0.08, 0.12, 0.02) * translucency;
      `
    );
  };

  // Birch Foliage (golden-lime tint)
  const birchFoliageMat = new THREE.MeshStandardMaterial({
    map: leafTexture,
    color: 0xc8db78,
    roughness: 0.55,
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

  // Reusable leaf cluster geometry: 8 spherically crossed plane cards for dense volumetric canopy
  const cardGeom = new THREE.PlaneGeometry(3.2, 3.2);
  const makeLeafCluster = (mat: THREE.Material) => {
    const cluster = new THREE.Group();
    const angles = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75]; // 8 planes
    angles.forEach((rot, idx) => {
      const card = new THREE.Mesh(cardGeom, mat);
      card.rotation.y = rot * Math.PI;
      card.rotation.x = (idx % 2 === 0 ? 0.38 : -0.32);
      card.rotation.z = (idx % 3 === 0 ? 0.22 : -0.22);
      card.castShadow = true;
      card.receiveShadow = true;
      cluster.add(card);
    });
    return cluster;
  };

  // ============================================
  // TREE GENERATORS
  // ============================================

  // 1. REALISTIC OAK TREE (Trunk + spreading boughs + dense leaf clusters)
  const spawnOakTree = (x: number, z: number, scale = 1.0) => {
    const y = getHeight(x, z);
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);
    treeColliders.push({ x, z, radius: 0.72 * scale });

    // Main Trunk with slight taper and lean
    const trunkH = (6.2 + Math.random() * 1.6) * scale;
    const trunkGeom = new THREE.CylinderGeometry(0.38 * scale, 0.78 * scale, trunkH, 10);
    trunkGeom.translate(0, trunkH / 2, 0);
    const trunk = new THREE.Mesh(trunkGeom, oakBarkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Deep Root flare (sinks firmly into ground, never floats!)
    const rootGeom = new THREE.CylinderGeometry(0.78 * scale, 1.1 * scale, 0.9 * scale, 8);
    rootGeom.translate(0, 0.15 * scale, 0);
    const roots = new THREE.Mesh(rootGeom, oakBarkMat);
    roots.castShadow = true;
    treeGroup.add(roots);

    // 5 Spreading Main Boughs
    const boughCount = 5 + Math.floor(Math.random() * 2);
    for (let bIdx = 0; bIdx < boughCount; bIdx++) {
      const bAngle = (bIdx / boughCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const boughLen = (3.2 + Math.random() * 1.8) * scale;
      const boughGeom = new THREE.CylinderGeometry(0.16 * scale, 0.28 * scale, boughLen, 6);
      boughGeom.translate(0, boughLen / 2, 0);
      const bough = new THREE.Mesh(boughGeom, oakBarkMat);
      bough.position.set(0, trunkH * (0.68 + Math.random() * 0.16), 0);
      bough.rotation.y = bAngle;
      bough.rotation.z = 0.48 + Math.random() * 0.32;
      bough.castShadow = true;
      treeGroup.add(bough);

      // Leaf clusters along each bough
      const clusterCount = 3 + Math.floor(Math.random() * 2);
      for (let c = 0; c < clusterCount; c++) {
        const cluster = makeLeafCluster(foliageMat);
        const distOut = boughLen * (0.45 + c * 0.22);
        const cx = Math.sin(bAngle) * Math.sin(bough.rotation.z) * distOut;
        const cy = trunkH * 0.72 + Math.cos(bough.rotation.z) * distOut;
        const cz = Math.cos(bAngle) * Math.sin(bough.rotation.z) * distOut;

        cluster.position.set(cx, cy + (Math.random() - 0.5) * 0.8, cz);
        const cScale = scale * (1.2 + Math.random() * 0.5);
        cluster.scale.set(cScale, cScale, cScale);
        cluster.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.5);
        treeGroup.add(cluster);
      }
    }

    // Top Crown Clusters (dense canopy top)
    for (let c = 0; c < 8; c++) {
      const cluster = makeLeafCluster(foliageMat);
      const spread = 2.4 * scale;
      cluster.position.set(
        (Math.random() - 0.5) * spread,
        trunkH + (0.2 + c * 0.45) * scale,
        (Math.random() - 0.5) * spread
      );
      const cScale = scale * (1.3 + Math.random() * 0.5);
      cluster.scale.set(cScale, cScale, cScale);
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
    treeColliders.push({ x, z, radius: 0.45 * scale });

    const trunkH = (7.5 + Math.random() * 2.0) * scale;
    const trunkGeom = new THREE.CylinderGeometry(0.18 * scale, 0.38 * scale, trunkH, 8);
    trunkGeom.translate(0, trunkH / 2, 0);
    const trunk = new THREE.Mesh(trunkGeom, birchBarkMat);
    trunk.rotation.z = (Math.random() - 0.5) * 0.08;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Slender side branches with light fluttering leaf clusters
    const branchCount = 8 + Math.floor(Math.random() * 3);
    for (let b = 0; b < branchCount; b++) {
      const frac = 0.38 + (b / branchCount) * 0.58;
      const bAngle = (b * Math.PI) / 2.5 + Math.random() * 0.5;
      const cluster = makeLeafCluster(birchFoliageMat);
      const bRad = (2.2 - (b / branchCount) * 0.8) * scale;

      cluster.position.set(
        Math.sin(bAngle) * bRad,
        trunkH * frac,
        Math.cos(bAngle) * bRad
      );
      const cScale = scale * (0.95 + Math.random() * 0.4);
      cluster.scale.set(cScale, cScale, cScale);
      treeGroup.add(cluster);
    }

    // Top crown
    for (let c = 0; c < 4; c++) {
      const cluster = makeLeafCluster(birchFoliageMat);
      cluster.position.set(
        (Math.random() - 0.5) * scale,
        trunkH * (0.85 + c * 0.1),
        (Math.random() - 0.5) * scale
      );
      const cScale = scale * (1.1 + Math.random() * 0.3);
      cluster.scale.set(cScale, cScale, cScale);
      treeGroup.add(cluster);
    }

    group.add(treeGroup);
  };

  // 3. REALISTIC SCOTS PINE TREE
  const spawnPineTree = (x: number, z: number, scale = 1.0) => {
    const y = getHeight(x, z);
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);
    treeColliders.push({ x, z, radius: 0.52 * scale });

    const trunkH = (9.0 + Math.random() * 2.5) * scale;
    const trunkGeom = new THREE.CylinderGeometry(0.22 * scale, 0.54 * scale, trunkH, 7);
    trunkGeom.translate(0, trunkH / 2, 0);
    const trunk = new THREE.Mesh(trunkGeom, pineBarkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Layered tiered needle fronds
    const tierCount = 6 + Math.floor(Math.random() * 2);
    for (let t = 0; t < tierCount; t++) {
      const tierR = (3.2 - t * 0.42) * scale;
      const tierH = 2.2 * scale;
      const coneGeom = new THREE.ConeGeometry(tierR, tierH, 8);
      const cone = new THREE.Mesh(coneGeom, pineNeedleMat);
      cone.position.set(0, trunkH * 0.3 + t * 1.35 * scale, 0);
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
    treeColliders.push({ x, z, radius: 0.75 * scale });

    const trunkH = 5.5 * scale;
    const trunkGeom = new THREE.CylinderGeometry(0.4 * scale, 0.75 * scale, trunkH, 8);
    trunkGeom.translate(0, trunkH / 2, 0);
    const trunk = new THREE.Mesh(trunkGeom, oakBarkMat);
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Weeping branches with cascading foliage
    for (let b = 0; b < 10; b++) {
      const angle = (b * Math.PI) / 5;
      const cluster = makeLeafCluster(foliageMat);
      cluster.position.set(
        Math.sin(angle) * 3.8 * scale,
        trunkH * 0.9 - (b % 3) * 0.45,
        Math.cos(angle) * 3.8 * scale
      );
      cluster.scale.set(scale * 1.8, scale * 2.4, scale * 1.8);
      treeGroup.add(cluster);
    }

  };

  // 5. SMALL BUSH / SHRUB
  const spawnBush = (x: number, z: number, scale = 0.6) => {
    const y = getHeight(x, z);
    const bushGroup = new THREE.Group();
    bushGroup.position.set(x, y, z);

    // Dense low foliage cluster
    for (let c = 0; c < 3; c++) {
      const cluster = makeLeafCluster(foliageMat);
      cluster.position.set(
        (Math.random() - 0.5) * 1.2 * scale,
        0.5 * scale + c * 0.3 * scale,
        (Math.random() - 0.5) * 1.2 * scale
      );
      const cScale = scale * (0.8 + Math.random() * 0.4);
      cluster.scale.set(cScale, cScale, cScale);
      cluster.rotation.set(Math.random(), Math.random(), Math.random());
      bushGroup.add(cluster);
    }

    group.add(bushGroup);
  };

  // ============================================
  // PLACE TREES IN NATURAL GROUPINGS
  // ============================================

  // 1. Homestead shade trees
  spawnOakTree(-28, 18, 1.3);
  spawnOakTree(-32, -18, 1.4);
  spawnOakTree(-22, -28, 1.2);
  spawnBirchTree(-18, 28, 1.2);
  spawnBirchTree(-8, 32, 1.15);
  spawnBirchTree(5, 25, 1.1);

  // 2. Pondside Willows & Birches
  spawnWillowTree(22, -62, 1.25);
  spawnWillowTree(52, -65, 1.3);
  spawnWillowTree(55, -36, 1.2);
  spawnBirchTree(18, -42, 1.25);
  spawnBirchTree(45, -34, 1.15);
  spawnBirchTree(60, -55, 1.1);

  // 3. Eastern Pasture & Cattle Hill
  spawnOakTree(58, 48, 1.35);
  spawnOakTree(72, 38, 1.45);
  spawnOakTree(82, 65, 1.25);
  spawnOakTree(48, 68, 1.3);
  spawnBirchTree(65, 22, 1.2);
  spawnBirchTree(85, 42, 1.15);
  spawnBirchTree(75, 58, 1.1);

  // 4. Rocky Goat Ridge Pines
  spawnPineTree(-68, -22, 1.25);
  spawnPineTree(-78, -38, 1.4);
  spawnPineTree(-88, -18, 1.2);
  spawnPineTree(-72, 12, 1.3);
  spawnPineTree(-65, -5, 1.15);
  spawnPineTree(-82, -8, 1.35);

  // 5. Northern Sheep Knoll Trees
  spawnOakTree(-45, -98, 1.25);
  spawnOakTree(-62, -118, 1.35);
  spawnOakTree(-38, -108, 1.2);
  spawnBirchTree(-38, -88, 1.25);
  spawnBirchTree(-65, -108, 1.2);
  spawnBirchTree(-55, -132, 1.15);

  // 6. Scattered mid-field trees (make the world feel lusher)
  spawnOakTree(15, -75, 1.2);
  spawnOakTree(-15, -55, 1.15);
  spawnBirchTree(35, 85, 1.1);
  spawnOakTree(90, -15, 1.25);
  spawnBirchTree(-45, 55, 1.1);
  spawnPineTree(-35, 65, 1.2);
  spawnOakTree(20, 55, 1.15);
  spawnBirchTree(-5, -90, 1.1);

  // 7. Hedgerows along paths (bushes)
  for (let i = 0; i < 25; i++) {
    const t = i / 25;
    const hx = -16 + t * 30;
    const hz = 20 + Math.sin(t * 4) * 3;
    // Keep player spawn view (0, 26) and carriage road clear
    if (Math.hypot(hx, hz - 26) < 7.0 || (Math.abs(hx) < 3.5 && hz > 14 && hz < 35)) continue;
    spawnBush(hx, hz, 0.5 + Math.random() * 0.3);
  }

  // 8. Pond-edge bushes
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const r = 25 + Math.random() * 4;
    spawnBush(35 + Math.cos(angle) * r, -48 + Math.sin(angle) * r, 0.4 + Math.random() * 0.3);
  }

  // 9. Perimeter Forest Ring (120+ trees — much denser)
  for (let i = 0; i < 130; i++) {
    const angle = (i / 130) * Math.PI * 2;
    const r = 145 + Math.random() * 50;
    const tx = Math.cos(angle) * r;
    const tz = Math.sin(angle) * r;
    const treeType = i % 4;

    if (treeType === 0) {
      spawnOakTree(tx, tz, 0.9 + Math.random() * 0.5);
    } else if (treeType === 1) {
      spawnBirchTree(tx, tz, 0.85 + Math.random() * 0.45);
    } else if (treeType === 2) {
      spawnPineTree(tx, tz, 0.95 + Math.random() * 0.55);
    } else {
      // Add some bushes in the perimeter too
      spawnBush(tx + (Math.random() - 0.5) * 5, tz + (Math.random() - 0.5) * 5, 0.4 + Math.random() * 0.4);
      spawnPineTree(tx, tz, 0.8 + Math.random() * 0.4);
    }
  }

  // 10. Second ring of forest (creates depth)
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2 + 0.1;
    const r = 120 + Math.random() * 25;
    const tx = Math.cos(angle) * r;
    const tz = Math.sin(angle) * r;
    
    if (i % 3 === 0) spawnOakTree(tx, tz, 0.8 + Math.random() * 0.4);
    else if (i % 3 === 1) spawnBirchTree(tx, tz, 0.75 + Math.random() * 0.35);
    else spawnPineTree(tx, tz, 0.85 + Math.random() * 0.5);
  }

  // ============================================
  // 4. EXPANDED GOLDEN WHEAT FIELD
  // ============================================
  const wheatCount = 3500;
  const wheatGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.15, 3);
  wheatGeom.translate(0, 0.58, 0);

  const wheatMat = new THREE.MeshStandardMaterial({
    color: 0xd4a843,
    roughness: 0.75,
  });

  // Wheat wind shader
  wheatMat.onBeforeCompile = (shader) => {
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
      vec4 wheatWorld = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float wheatHeight = clamp(position.y / 1.15, 0.0, 1.0);
      float wheatWave = sin(uTime * 2.0 + wheatWorld.x * 0.2 + wheatWorld.z * 0.15) * 0.4;
      float wheatGust = sin(uTime * 0.5 + wheatWorld.x * 0.05) * 0.3;
      transformed.x += (wheatWave + wheatGust) * uWindStrength * wheatHeight * wheatHeight * 0.22;
      transformed.z += wheatWave * 0.5 * uWindStrength * wheatHeight * wheatHeight * 0.15;
      `
    );
  };

  const wheatInstanced = new THREE.InstancedMesh(wheatGeom, wheatMat, wheatCount);
  wheatInstanced.castShadow = false;
  wheatInstanced.receiveShadow = true;

  let wIdx = 0;
  for (let r = 0; r < 50; r++) {
    for (let c = 0; c < 70; c++) {
      if (wIdx >= wheatCount) break;
      const wx = 38 + (r * 0.72) + (Math.random() - 0.5) * 0.15;
      const wz = 10 + (c * 0.45) + (Math.random() - 0.5) * 0.15;
      const wy = getHeight(wx, wz);

      dummy.position.set(wx, wy, wz);
      dummy.scale.set(1, 0.8 + Math.random() * 0.4, 1);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.1,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.1
      );
      dummy.updateMatrix();

      wheatInstanced.setMatrixAt(wIdx, dummy.matrix);
      wIdx++;
    }
  }
  wheatInstanced.instanceMatrix.needsUpdate = true;
  group.add(wheatInstanced);

  // ============================================
  // 5. FIELDSTONE BOULDERS & SMALL ROCKS
  // ============================================
  const rockGeom = new THREE.SphereGeometry(1.2, 10, 10);
  rockGeom.scale(1.2, 0.75, 1.1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x5a5650,
    roughness: 0.88,
    metalness: 0.04,
  });

  // Small rock for scattering
  const smallRockGeom = new THREE.SphereGeometry(0.4, 6, 6);
  smallRockGeom.scale(1.1, 0.7, 1.0);
  const smallRockMat = new THREE.MeshStandardMaterial({
    color: 0x625b52,
    roughness: 0.9,
    metalness: 0.03,
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
    { x: -70, z: 5, s: 1.4 },
    { x: -60, z: -15, s: 1.9 },
    { x: 85, z: 55, s: 1.6 },
    { x: 30, z: -65, s: 1.2 },
  ];

  rockPositions.forEach((pos) => {
    treeColliders.push({ x: pos.x, z: pos.z, radius: 0.95 * pos.s });
    const rock = new THREE.Mesh(rockGeom, rockMat);
    const ry = getHeight(pos.x, pos.z);
    rock.position.set(pos.x, ry + 0.35 * pos.s, pos.z);
    rock.scale.set(
      pos.s * (0.8 + Math.random() * 0.4),
      pos.s * 0.65,
      pos.s * (0.8 + Math.random() * 0.4)
    );
    rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);

    // Small rocks around big ones
    for (let sr = 0; sr < 3; sr++) {
      const smallRock = new THREE.Mesh(smallRockGeom, smallRockMat);
      const srx = pos.x + (Math.random() - 0.5) * 4;
      const srz = pos.z + (Math.random() - 0.5) * 4;
      const sry = getHeight(srx, srz);
      smallRock.position.set(srx, sry + 0.1, srz);
      smallRock.scale.set(
        0.4 + Math.random() * 0.6,
        0.3 + Math.random() * 0.4,
        0.4 + Math.random() * 0.6
      );
      smallRock.rotation.set(Math.random(), Math.random(), Math.random());
      smallRock.castShadow = true;
      group.add(smallRock);
    }
  });

  // ============================================
  // 6. SMALL ENVIRONMENTAL DETAILS
  // ============================================

  // Fallen logs
  const logGeom = new THREE.CylinderGeometry(0.2, 0.25, 3.5, 6);
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2d24, roughness: 0.9 });
  const logPositions = [
    { x: -25, z: -40, rot: 0.8 },
    { x: 45, z: 65, rot: -1.2 },
    { x: -55, z: -100, rot: 2.1 },
    { x: 70, z: -20, rot: 0.5 },
  ];

  logPositions.forEach((pos) => {
    const log = new THREE.Mesh(logGeom, logMat);
    const ly = getHeight(pos.x, pos.z);
    log.position.set(pos.x, ly + 0.12, pos.z);
    log.rotation.set(0, pos.rot, Math.PI / 2);
    log.castShadow = true;
    log.receiveShadow = true;
    group.add(log);
  });

  // Mushroom clusters
  const mushroomCapGeom = new THREE.SphereGeometry(0.12, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const mushroomStemGeom = new THREE.CylinderGeometry(0.04, 0.05, 0.12, 5);
  const mushroomMat = new THREE.MeshStandardMaterial({ color: 0xc4956a, roughness: 0.7 });

  for (let m = 0; m < 30; m++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 15 + Math.random() * 100;
    const mx = Math.cos(angle) * dist;
    const mz = Math.sin(angle) * dist;
    if (Math.hypot(mx - 8, mz + 2) < 20) continue;

    const my = getHeight(mx, mz);
    const mushroomGroup = new THREE.Group();
    mushroomGroup.position.set(mx, my, mz);

    const cap = new THREE.Mesh(mushroomCapGeom, mushroomMat);
    cap.position.y = 0.12;
    const stem = new THREE.Mesh(mushroomStemGeom, mushroomMat);
    stem.position.y = 0.06;
    mushroomGroup.add(cap);
    mushroomGroup.add(stem);
    mushroomGroup.scale.setScalar(0.5 + Math.random() * 0.8);

    group.add(mushroomGroup);
  }

  // ============================================
  // UPDATE FUNCTION
  // ============================================
  const update = (time: number, windStrength: number) => {
    grassUniforms.uTime.value = time;
    grassUniforms.uWindStrength.value = windStrength;
    treeUniforms.uTime.value = time;
    treeUniforms.uWindStrength.value = windStrength;

    // Dynamic wind direction shift (subtle)
    const windAngle = time * 0.05;
    grassUniforms.uWindDirection.value.set(
      Math.cos(windAngle) * 0.7 + 0.3,
      Math.sin(windAngle) * 0.3 + 0.3
    );
  };

  const dispose = () => {
    scene.remove(group);
  };

  return {
    group,
    update,
    dispose,
    treeColliders,
  };
}
