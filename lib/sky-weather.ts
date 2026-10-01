import * as THREE from 'three';
import { TimeOfDayPreset, WeatherPreset } from './types';

export interface SkyWeatherSystem {
  group: THREE.Group;
  dirLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  ambientLight: THREE.AmbientLight;
  setTimeOfDay: (time: TimeOfDayPreset) => void;
  setWeather: (weather: WeatherPreset) => void;
  update: (delta: number, cameraPos?: THREE.Vector3) => void;
  dispose: () => void;
}

export function createSkyAndWeather(scene: THREE.Scene): SkyWeatherSystem {
  const group = new THREE.Group();
  scene.add(group);

  // --- BALANCED NATURAL SUNLIGHT (NO OVEREXPOSURE) ---
  const dirLight = new THREE.DirectionalLight(0xfffaed, 1.85);
  dirLight.position.set(70, 75, 55);
  dirLight.castShadow = true;

  // Maximum quality shadow setup with safe bounds
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  dirLight.shadow.camera.near = 1.0;
  dirLight.shadow.camera.far = 280;
  dirLight.shadow.camera.left = -120;
  dirLight.shadow.camera.right = 120;
  dirLight.shadow.camera.top = 120;
  dirLight.shadow.camera.bottom = -120;
  dirLight.shadow.bias = -0.00015;
  dirLight.shadow.normalBias = 0.02;
  dirLight.shadow.radius = 2.4;
  group.add(dirLight);

  // Secondary fill light (soft warm meadow bounce)
  const fillLight = new THREE.DirectionalLight(0xffe8c4, 0.22);
  fillLight.position.set(-40, 20, -30);
  fillLight.castShadow = false;
  group.add(fillLight);

  // Hemisphere Light (sky light to grass bounce)
  const hemiLight = new THREE.HemisphereLight(0xa5cbf5, 0x4e613b, 0.55);
  group.add(hemiLight);

  // Ambient Light for soft, visible shadows
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  group.add(ambientLight);

  // Atmospheric distance haze (crisp natural visibility)
  scene.fog = new THREE.FogExp2(0xcfe2ea, 0.0022);

  // --- CINEMATIC PROCEDURAL ATMOSPHERIC SKY SHADER ---
  // Sphere geometry comfortably inside camera far plane (320m vs 480m)
  const skyGeom = new THREE.SphereGeometry(320, 48, 32);
  const skyUniforms = {
    uTime: { value: 0 },
    uTopColor: { value: new THREE.Color(0x275fa5) },
    uBottomColor: { value: new THREE.Color(0xdce7ef) },
    uSunColor: { value: new THREE.Color(0xfff6e6) },
    uSunDir: { value: new THREE.Vector3(70, 75, 55).normalize() },
    uExponent: { value: 0.58 },
    uSunIntensity: { value: 1.0 },
    uCloudCoverage: { value: 0.5 },
    uIsNight: { value: 0.0 },
    uHorizonHaze: { value: 0.3 },
  };

  // Safe background color fallback (never black!)
  scene.background = skyUniforms.uBottomColor.value.clone();

  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vPosition;
      void main() {
        vWorldPosition = position;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uExponent;
      uniform float uSunIntensity;
      uniform float uCloudCoverage;
      uniform float uIsNight;
      uniform float uHorizonHaze;
      varying vec3 vWorldPosition;
      varying vec3 vPosition;

      // Improved hash for better noise quality
      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      // Smooth value noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // quintic smoothing
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // High-quality FBM for volumetric cloud appearance
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 6; ++i) {
          v += a * noise(p);
          p = rot * p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 rayDir = normalize(vWorldPosition);
        float h = max(rayDir.y, 0.0);

        // Multi-layer atmospheric gradient
        vec3 skyColor = mix(uBottomColor, uTopColor, pow(h, uExponent));
        
        // Horizon haze (atmospheric perspective)
        float horizonFade = exp(-h * 4.0) * uHorizonHaze;
        vec3 hazeColor = mix(uBottomColor, uSunColor * 0.3, 0.3);
        skyColor = mix(skyColor, hazeColor, horizonFade);

        // Sun rendering
        if (uIsNight < 0.5) {
          float cosAngle = dot(rayDir, uSunDir);
          
          // Solar disc with limb darkening
          float sunDisc = smoothstep(0.9992, 0.9998, cosAngle);
          float limbDarkening = 1.0 - pow(clamp(1.0 - sunDisc, 0.0, 1.0), 0.3) * 0.2;
          
          // Mie forward-scattering corona (multiple rings)
          float mie1 = pow(max(cosAngle, 0.0), 48.0) * 0.85;
          float mie2 = pow(max(cosAngle, 0.0), 8.0) * 0.35;
          float mie3 = pow(max(cosAngle, 0.0), 3.0) * 0.12;
          
          skyColor += uSunColor * (sunDisc * limbDarkening * 5.0 + mie1 + mie2 + mie3) * uSunIntensity;
        } else {
          // Moonlight
          float cosMoon = dot(rayDir, uSunDir);
          float moonDisc = smoothstep(0.9994, 0.9998, cosMoon);
          float moonHalo = pow(max(cosMoon, 0.0), 24.0) * 0.35;
          skyColor += vec3(0.92, 0.94, 1.0) * (moonDisc * 2.5 + moonHalo * 0.4);
          
          // Stars (procedural)
          if (h > 0.05) {
            vec2 starUV = rayDir.xz / (rayDir.y + 0.01);
            float starField = hash(floor(starUV * 200.0));
            float starBrightness = smoothstep(0.992, 1.0, starField);
            // Twinkling
            starBrightness *= 0.6 + 0.4 * sin(uTime * 2.0 + starField * 100.0);
            skyColor += vec3(0.9, 0.92, 1.0) * starBrightness * 0.8 * smoothstep(0.05, 0.3, h);
          }
        }

        // Volumetric Cumulus Clouds
        if (h > 0.06 && uCloudCoverage > 0.05) {
          vec2 cloudUV = (rayDir.xz / (rayDir.y + 0.1)) * 0.75;
          
          // Moving cloud layers (two speeds for depth)
          vec2 cloudUV1 = cloudUV + vec2(uTime * 0.008, uTime * 0.004);
          vec2 cloudUV2 = cloudUV * 1.5 + vec2(uTime * 0.012, uTime * 0.006);
          
          float density1 = fbm(cloudUV1);
          float density2 = fbm(cloudUV2) * 0.5;
          float density = (density1 + density2) * 0.7;
          
          density = smoothstep(0.55 - uCloudCoverage * 0.25, 0.78, density);

          if (density > 0.01) {
            // Cloud lighting: sunlit edges, darker bases
            float sunFacing = max(dot(rayDir, uSunDir), 0.0);
            
            vec3 cloudBright = uSunColor * 1.15;
            vec3 cloudDark = uBottomColor * 0.6;
            vec3 cloudColor = mix(cloudDark, cloudBright, sunFacing * 0.5 + 0.45);
            
            // Silver lining effect (bright edges when sun is behind cloud)
            float silverLining = pow(sunFacing, 6.0) * density * 0.4;
            cloudColor += uSunColor * silverLining;

            float cloudAlpha = density * smoothstep(0.06, 0.3, h) * 0.9;
            skyColor = mix(skyColor, cloudColor, cloudAlpha);
          }
        }

        gl_FragColor = vec4(skyColor, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });

  const skyMesh = new THREE.Mesh(skyGeom, skyMat);
  skyMesh.renderOrder = -1000;
  group.add(skyMesh);

  // --- NIGHT STARFIELD (backup for non-shader stars) ---
  const starCount = 3000;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 390;
    const sinPhi = Math.sin(phi);
    starPositions[i * 3] = r * sinPhi * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 15;
    starPositions[i * 3 + 2] = r * sinPhi * Math.sin(theta);
  }

  const starGeom = new THREE.BufferGeometry();
  starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.2,
    transparent: true,
    opacity: 0.0,
  });
  const starPoints = new THREE.Points(starGeom, starMat);
  group.add(starPoints);

  // --- GENTLE SUMMER RAIN PARTICLES ---
  const rainCount = 4000;
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 180;
    rainPositions[i * 3 + 1] = Math.random() * 50;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 180;
  }

  const rainGeom = new THREE.BufferGeometry();
  rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

  const rainMat = new THREE.PointsMaterial({
    color: 0x99bbdd,
    size: 0.18,
    transparent: true,
    opacity: 0,
  });

  const rainPoints = new THREE.Points(rainGeom, rainMat);
  group.add(rainPoints);

  // --- FIREFLIES (Active during Golden Hour & Night) ---
  const fireflyCount = 120;
  const fireflyPositions = new Float32Array(fireflyCount * 3);
  const fireflyInitialY = new Float32Array(fireflyCount);

  for (let i = 0; i < fireflyCount; i++) {
    fireflyPositions[i * 3] = (Math.random() - 0.5) * 130;
    const y = 0.6 + Math.random() * 3.0;
    fireflyPositions[i * 3 + 1] = y;
    fireflyInitialY[i] = y;
    fireflyPositions[i * 3 + 2] = (Math.random() - 0.5) * 130;
  }

  const fireflyGeom = new THREE.BufferGeometry();
  fireflyGeom.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));

  const fireflyMat = new THREE.PointsMaterial({
    color: 0xe6ff66,
    size: 0.4,
    transparent: true,
    opacity: 0,
  });

  const fireflyPoints = new THREE.Points(fireflyGeom, fireflyMat);
  group.add(fireflyPoints);

  // --- DUST MOTES IN SUNLIGHT ---
  const dustCount = 200;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 80;
    dustPositions[i * 3 + 1] = 1.0 + Math.random() * 5.0;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
  }

  const dustGeom = new THREE.BufferGeometry();
  dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xffeedd,
    size: 0.15,
    transparent: true,
    opacity: 0.35,
  });
  const dustPoints = new THREE.Points(dustGeom, dustMat);
  group.add(dustPoints);

  // State
  let currentTimeOfDay: TimeOfDayPreset = 'afternoon';
  let currentWeather: WeatherPreset = 'sunny';

  // Apply Lighting presets
  const applyLighting = (tod: TimeOfDayPreset, weather: WeatherPreset) => {
    let topCol = new THREE.Color(0x275fa5);
    let botCol = new THREE.Color(0xdce7ef);
    let fogCol = new THREE.Color(0xdce7ef);
    let sunCol = new THREE.Color(0xfffaed);
    let hemiSky = new THREE.Color(0xa5cbf5);
    let hemiGnd = new THREE.Color(0x4e613b);
    let fillCol = new THREE.Color(0xffe8c4);

    let sunIntensity = 1.85;
    let hemiIntensity = 0.55;
    let fillIntensity = 0.22;
    let ambIntensity = 0.2;
    let sunPos = new THREE.Vector3(70, 75, 55);
    let isNight = 0.0;
    let starAlpha = 0;
    let fireflyAlpha = 0;
    let dustAlpha = 0.35;
    let cloudCoverage = 0.5;
    let horizonHaze = 0.25;

    switch (tod) {
      case 'morning':
        topCol = new THREE.Color(0x356fb2);
        botCol = new THREE.Color(0xffe4c6);
        fogCol = new THREE.Color(0xf5dcc8);
        sunCol = new THREE.Color(0xffdeb2);
        fillCol = new THREE.Color(0xffd4a0);
        hemiSky = new THREE.Color(0xa8c8ec);
        hemiGnd = new THREE.Color(0x566042);
        sunIntensity = 1.7;
        hemiIntensity = 0.5;
        fillIntensity = 0.2;
        ambIntensity = 0.22;
        sunPos.set(95, 35, 40);
        cloudCoverage = 0.55;
        horizonHaze = 0.4; // Morning mist
        dustAlpha = 0.45;
        break;

      case 'midday':
        topCol = new THREE.Color(0x1e5aab);
        botCol = new THREE.Color(0xd2e4f0);
        fogCol = new THREE.Color(0xd2e4f0);
        sunCol = new THREE.Color(0xfff8ef);
        fillCol = new THREE.Color(0xfff0d8);
        hemiSky = new THREE.Color(0xa4c6ee);
        hemiGnd = new THREE.Color(0x4e623a);
        sunIntensity = 2.0;
        hemiIntensity = 0.6;
        fillIntensity = 0.18;
        ambIntensity = 0.18;
        sunPos.set(20, 115, 20);
        cloudCoverage = 0.42;
        horizonHaze = 0.2;
        dustAlpha = 0.3;
        break;

      case 'afternoon':
        topCol = new THREE.Color(0x2b65a8);
        botCol = new THREE.Color(0xe8ddc5);
        fogCol = new THREE.Color(0xe4d9bf);
        sunCol = new THREE.Color(0xfff3d6);
        fillCol = new THREE.Color(0xffe8c4);
        hemiSky = new THREE.Color(0x9fc3ec);
        hemiGnd = new THREE.Color(0x4d5e38);
        sunIntensity = 1.85;
        hemiIntensity = 0.55;
        fillIntensity = 0.22;
        ambIntensity = 0.2;
        sunPos.set(70, 72, 60);
        cloudCoverage = 0.5;
        horizonHaze = 0.25;
        dustAlpha = 0.35;
        break;

      case 'sunset':
        topCol = new THREE.Color(0x1e2455);
        botCol = new THREE.Color(0xe5773e);
        fogCol = new THREE.Color(0xd1754a);
        sunCol = new THREE.Color(0xff7733);
        fillCol = new THREE.Color(0xff9955);
        hemiSky = new THREE.Color(0xb05e62);
        hemiGnd = new THREE.Color(0x4a372c);
        sunIntensity = 1.4;
        hemiIntensity = 0.45;
        fillIntensity = 0.25;
        ambIntensity = 0.16;
        sunPos.set(115, 12, 25);
        fireflyAlpha = 0.6;
        cloudCoverage = 0.6;
        horizonHaze = 0.45;
        dustAlpha = 0.5;
        break;

      case 'night':
        isNight = 1.0;
        topCol = new THREE.Color(0x040610);
        botCol = new THREE.Color(0x0a0f1e);
        fogCol = new THREE.Color(0x080e1a);
        sunCol = new THREE.Color(0x9db2dc); // soft cool moonlight
        fillCol = new THREE.Color(0x6688aa);
        hemiSky = new THREE.Color(0x15203a);
        hemiGnd = new THREE.Color(0x0c1215);
        sunIntensity = 0.35;
        hemiIntensity = 0.25;
        fillIntensity = 0.1;
        ambIntensity = 0.12;
        sunPos.set(-60, 75, -50);
        starAlpha = 0.95;
        fireflyAlpha = 0.9;
        cloudCoverage = 0.32;
        horizonHaze = 0.15;
        dustAlpha = 0;
        break;
    }

    if (weather === 'overcast') {
      topCol.multiplyScalar(0.7);
      botCol = new THREE.Color(0xafbac0);
      fogCol = new THREE.Color(0xacb7bd);
      sunIntensity *= 0.5;
      hemiIntensity *= 0.85;
      fillIntensity *= 0.6;
      cloudCoverage = 0.85;
      horizonHaze = 0.45;
      dustAlpha *= 0.3;
    } else if (weather === 'gentleRain') {
      topCol = new THREE.Color(0x4c5a68);
      botCol = new THREE.Color(0x8f9ba4);
      fogCol = new THREE.Color(0x88949d);
      sunIntensity *= 0.4;
      hemiIntensity *= 0.78;
      fillIntensity *= 0.4;
      cloudCoverage = 0.95;
      horizonHaze = 0.55;
      dustAlpha = 0;
    } else if (weather === 'partlyCloudy') {
      cloudCoverage = 0.65;
      horizonHaze += 0.1;
    }

    skyUniforms.uTopColor.value.copy(topCol);
    skyUniforms.uBottomColor.value.copy(botCol);
    skyUniforms.uSunColor.value.copy(sunCol);
    skyUniforms.uSunDir.value.copy(sunPos).normalize();
    skyUniforms.uSunIntensity.value = weather === 'sunny' ? 1.0 : weather === 'partlyCloudy' ? 0.85 : 0.35;
    skyUniforms.uCloudCoverage.value = cloudCoverage;
    skyUniforms.uIsNight.value = isNight;
    skyUniforms.uHorizonHaze.value = horizonHaze;

    if (scene.fog) {
      scene.fog.color.copy(fogCol);
    }
    scene.background = fogCol.clone();

    dirLight.color.copy(sunCol);
    dirLight.intensity = sunIntensity;
    dirLight.position.copy(sunPos);

    fillLight.color.copy(fillCol);
    fillLight.intensity = fillIntensity;

    hemiLight.color.copy(hemiSky);
    hemiLight.groundColor.copy(hemiGnd);
    hemiLight.intensity = hemiIntensity;

    ambientLight.intensity = ambIntensity;

    starMat.opacity = starAlpha;
    fireflyMat.opacity = fireflyAlpha;
    dustMat.opacity = dustAlpha;
    rainMat.opacity = weather === 'gentleRain' ? 0.65 : 0;
  };

  const setTimeOfDay = (time: TimeOfDayPreset) => {
    currentTimeOfDay = time;
    applyLighting(currentTimeOfDay, currentWeather);
  };

  const setWeather = (weather: WeatherPreset) => {
    currentWeather = weather;
    applyLighting(currentTimeOfDay, currentWeather);
  };

  applyLighting(currentTimeOfDay, currentWeather);

  let totalTime = 0;
  const update = (delta: number, cameraPos?: THREE.Vector3) => {
    totalTime += delta;
    skyUniforms.uTime.value = totalTime;

    // Follow camera position so sky and particles never clip or shift
    if (cameraPos) {
      skyMesh.position.copy(cameraPos);
      starPoints.position.copy(cameraPos);
      dustPoints.position.copy(cameraPos);
      rainPoints.position.set(cameraPos.x, cameraPos.y - 15, cameraPos.z);
    }

    // Rain particles fall
    if (currentWeather === 'gentleRain') {
      const positions = rainGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] -= delta * 28;
        // Slight horizontal drift
        positions[i * 3] += delta * 2.0;
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 50;
          positions[i * 3] = (Math.random() - 0.5) * 180;
        }
      }
      rainGeom.attributes.position.needsUpdate = true;
    }

    // Fireflies hover organically
    if (currentTimeOfDay === 'sunset' || currentTimeOfDay === 'night') {
      const fPos = fireflyGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < fireflyCount; i++) {
        fPos[i * 3] += Math.sin(totalTime * 1.2 + i * 1.7) * delta * 0.5;
        fPos[i * 3 + 1] = fireflyInitialY[i] + Math.sin(totalTime * 2.0 + i * 2.3) * 0.45;
        fPos[i * 3 + 2] += Math.cos(totalTime * 1.1 + i * 1.3) * delta * 0.5;
      }
      fireflyGeom.attributes.position.needsUpdate = true;
    }

    // Dust motes float slowly (daytime only)
    if (currentTimeOfDay !== 'night') {
      const dPos = dustGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        dPos[i * 3] += Math.sin(totalTime * 0.3 + i) * delta * 0.2;
        dPos[i * 3 + 1] += Math.sin(totalTime * 0.5 + i * 1.5) * delta * 0.08;
        dPos[i * 3 + 2] += Math.cos(totalTime * 0.25 + i) * delta * 0.2;
      }
      dustGeom.attributes.position.needsUpdate = true;
    }
  };

  const dispose = () => {
    scene.remove(group);
  };

  return {
    group,
    dirLight,
    hemiLight,
    ambientLight,
    setTimeOfDay,
    setWeather,
    update,
    dispose,
  };
}
