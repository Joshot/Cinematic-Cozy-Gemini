import * as THREE from 'three';
import { TimeOfDayPreset, WeatherPreset } from './types';

export interface SkyWeatherSystem {
  group: THREE.Group;
  dirLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  ambientLight: THREE.AmbientLight;
  setTimeOfDay: (time: TimeOfDayPreset) => void;
  setWeather: (weather: WeatherPreset) => void;
  update: (delta: number) => void;
  dispose: () => void;
}

export function createSkyAndWeather(scene: THREE.Scene): SkyWeatherSystem {
  const group = new THREE.Group();
  scene.add(group);

  // --- DIRECTIONAL SUNLIGHT (Photorealistic Outdoor Lighting) ---
  const dirLight = new THREE.DirectionalLight(0xfffaed, 2.9);
  dirLight.position.set(80, 85, 60);
  dirLight.castShadow = true;

  // Shadow camera tuned to cover the farm with soft transitions
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  dirLight.shadow.camera.near = 2.0;
  dirLight.shadow.camera.far = 300;
  dirLight.shadow.camera.left = -120;
  dirLight.shadow.camera.right = 120;
  dirLight.shadow.camera.top = 120;
  dirLight.shadow.camera.bottom = -120;
  dirLight.shadow.bias = -0.0003;
  dirLight.shadow.radius = 2.8; // Soft natural shadow edges
  group.add(dirLight);

  // Hemisphere Light (sky light to meadow bounce)
  const hemiLight = new THREE.HemisphereLight(0xa5cbf5, 0x4e613b, 0.88);
  group.add(hemiLight);

  // Ambient Light for soft shadow lift
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.32);
  group.add(ambientLight);

  // Atmospheric distance haze
  scene.fog = new THREE.FogExp2(0xdfe8ee, 0.0042);

  // --- PHOTOREALISTIC PROCEDURAL ATMOSPHERIC SKY & VOLUMETRIC CLOUD SHADER ---
  // Completely eliminates any low-poly faceted polygons!
  // Uses analytical Rayleigh scattering + Mie solar corona + procedural FBM cumulus clouds.
  const skyGeom = new THREE.SphereGeometry(380, 48, 36);
  const skyUniforms = {
    uTime: { value: 0 },
    uTopColor: { value: new THREE.Color(0x275fa5) },
    uBottomColor: { value: new THREE.Color(0xdce7ef) },
    uSunColor: { value: new THREE.Color(0xfff6e6) },
    uSunDir: { value: new THREE.Vector3(80, 85, 60).normalize() },
    uExponent: { value: 0.58 },
    uSunIntensity: { value: 1.0 },
    uCloudCoverage: { value: 0.5 },
    uIsNight: { value: 0.0 },
  };

  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
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
      varying vec3 vWorldPosition;

      // 2D Hash function
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      // Smooth Value Noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // Fractional Brownian Motion for natural soft clouds
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 4; ++i) {
          v += a * noise(p);
          p = rot * p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 rayDir = normalize(vWorldPosition);
        float h = max(rayDir.y, 0.0);

        // Rayleigh atmospheric gradient
        vec3 skyColor = mix(uBottomColor, uTopColor, pow(h, uExponent));

        // Atmospheric sun rendering (realistic solar disc with forward Mie scattering corona)
        if (uIsNight < 0.5) {
          float cosAngle = dot(rayDir, uSunDir);
          
          // Solar disc with smooth edge
          float sunDisc = smoothstep(0.9993, 0.9998, cosAngle);
          
          // Mie forward-scattering corona halo
          float corona = pow(max(cosAngle, 0.0), 36.0) * 0.75 + pow(max(cosAngle, 0.0), 6.0) * 0.28;
          
          skyColor += uSunColor * (sunDisc * 4.5 + corona * 0.85) * uSunIntensity;
        } else {
          // Soft lunar disc & subtle moon haze
          float cosMoon = dot(rayDir, uSunDir);
          float moonDisc = smoothstep(0.9994, 0.9998, cosMoon);
          float moonHalo = pow(max(cosMoon, 0.0), 24.0) * 0.35;
          skyColor += vec3(0.92, 0.94, 1.0) * (moonDisc * 2.2 + moonHalo * 0.4);
        }

        // Soft Photorealistic Procedural Cumulus Clouds in Upper Atmosphere
        if (h > 0.08 && uCloudCoverage > 0.05) {
          // Project onto planar cloud deck
          vec2 cloudUV = (rayDir.xz / (rayDir.y + 0.12)) * 0.85;
          cloudUV += vec2(uTime * 0.012, uTime * 0.006);

          float density = fbm(cloudUV);
          density = smoothstep(0.62 - uCloudCoverage * 0.28, 0.82, density);

          if (density > 0.01) {
            // Cloud shading: sunlit tops, soft shaded bases
            vec3 cloudBaseCol = mix(uBottomColor * 0.85, vec3(0.95), 0.5);
            vec3 cloudSunCol = uSunColor * 1.1;
            
            float sunFacing = max(dot(rayDir, uSunDir), 0.0);
            vec3 cloudColor = mix(cloudBaseCol, cloudSunCol, sunFacing * 0.4 + 0.5);

            float cloudAlpha = density * smoothstep(0.08, 0.35, h) * 0.88;
            skyColor = mix(skyColor, cloudColor, cloudAlpha);
          }
        }

        gl_FragColor = vec4(skyColor, 1.0);
      }
    `,
    side: THREE.BackSide,
  });

  const skyMesh = new THREE.Mesh(skyGeom, skyMat);
  group.add(skyMesh);

  // --- NIGHT STARFIELD ---
  const starCount = 2000;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 360;
    const sinPhi = Math.sin(phi);
    starPositions[i * 3] = r * sinPhi * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 15;
    starPositions[i * 3 + 2] = r * sinPhi * Math.sin(theta);
  }

  const starGeom = new THREE.BufferGeometry();
  starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    transparent: true,
    opacity: 0.0,
  });
  const starPoints = new THREE.Points(starGeom, starMat);
  group.add(starPoints);

  // --- GENTLE SUMMER RAIN PARTICLES ---
  const rainCount = 3000;
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 150;
    rainPositions[i * 3 + 1] = Math.random() * 45;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 150;
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
  const fireflyCount = 90;
  const fireflyPositions = new Float32Array(fireflyCount * 3);
  const fireflyInitialY = new Float32Array(fireflyCount);

  for (let i = 0; i < fireflyCount; i++) {
    fireflyPositions[i * 3] = (Math.random() - 0.5) * 110;
    const y = 0.8 + Math.random() * 2.5;
    fireflyPositions[i * 3 + 1] = y;
    fireflyInitialY[i] = y;
    fireflyPositions[i * 3 + 2] = (Math.random() - 0.5) * 110;
  }

  const fireflyGeom = new THREE.BufferGeometry();
  fireflyGeom.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));

  const fireflyMat = new THREE.PointsMaterial({
    color: 0xe6ff66,
    size: 0.35,
    transparent: true,
    opacity: 0,
  });

  const fireflyPoints = new THREE.Points(fireflyGeom, fireflyMat);
  group.add(fireflyPoints);

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

    let sunIntensity = 2.9;
    let hemiIntensity = 0.88;
    let sunPos = new THREE.Vector3(75, 80, 55);
    let isNight = 0.0;
    let starAlpha = 0;
    let fireflyAlpha = 0;
    let cloudCoverage = 0.5;

    switch (tod) {
      case 'morning':
        topCol = new THREE.Color(0x356fb2);
        botCol = new THREE.Color(0xffe4c6);
        fogCol = new THREE.Color(0xf5dcc8);
        sunCol = new THREE.Color(0xffdeb2);
        hemiSky = new THREE.Color(0xa8c8ec);
        hemiGnd = new THREE.Color(0x566042);
        sunIntensity = 2.5;
        hemiIntensity = 0.82;
        sunPos.set(95, 35, 40);
        cloudCoverage = 0.55;
        break;

      case 'midday':
        topCol = new THREE.Color(0x225ea8);
        botCol = new THREE.Color(0xd5e6f2);
        fogCol = new THREE.Color(0xd5e6f2);
        sunCol = new THREE.Color(0xfffaf2);
        hemiSky = new THREE.Color(0xa4c6ee);
        hemiGnd = new THREE.Color(0x4e623a);
        sunIntensity = 3.3;
        hemiIntensity = 0.92;
        sunPos.set(20, 110, 20);
        cloudCoverage = 0.45;
        break;

      case 'afternoon':
        topCol = new THREE.Color(0x2b65a8);
        botCol = new THREE.Color(0xe8ddc5);
        fogCol = new THREE.Color(0xe4d9bf);
        sunCol = new THREE.Color(0xfff3d6);
        hemiSky = new THREE.Color(0x9fc3ec);
        hemiGnd = new THREE.Color(0x4d5e38);
        sunIntensity = 2.9;
        hemiIntensity = 0.88;
        sunPos.set(70, 72, 60);
        cloudCoverage = 0.5;
        break;

      case 'sunset':
        topCol = new THREE.Color(0x293166);
        botCol = new THREE.Color(0xe5773e);
        fogCol = new THREE.Color(0xd1754a);
        sunCol = new THREE.Color(0xff8844);
        hemiSky = new THREE.Color(0xb05e62);
        hemiGnd = new THREE.Color(0x4a372c);
        sunIntensity = 2.1;
        hemiIntensity = 0.72;
        sunPos.set(110, 14, 25);
        fireflyAlpha = 0.55;
        cloudCoverage = 0.6;
        break;

      case 'night':
        isNight = 1.0;
        topCol = new THREE.Color(0x050713);
        botCol = new THREE.Color(0x0b1122);
        fogCol = new THREE.Color(0x0a101e);
        sunCol = new THREE.Color(0x9db2dc); // soft cool moonlight
        hemiSky = new THREE.Color(0x18243c);
        hemiGnd = new THREE.Color(0x0e1418);
        sunIntensity = 0.55;
        hemiIntensity = 0.45;
        sunPos.set(-60, 75, -50);
        starAlpha = 0.9;
        fireflyAlpha = 0.85;
        cloudCoverage = 0.35;
        break;
    }

    if (weather === 'overcast') {
      topCol.multiplyScalar(0.72);
      botCol = new THREE.Color(0xafbac0);
      fogCol = new THREE.Color(0xacb7bd);
      sunIntensity *= 0.55;
      hemiIntensity *= 0.85;
      cloudCoverage = 0.85;
    } else if (weather === 'gentleRain') {
      topCol = new THREE.Color(0x4c5a68);
      botCol = new THREE.Color(0x8f9ba4);
      fogCol = new THREE.Color(0x88949d);
      sunIntensity *= 0.45;
      hemiIntensity *= 0.8;
      cloudCoverage = 0.95;
    } else if (weather === 'partlyCloudy') {
      cloudCoverage = 0.65;
    }

    skyUniforms.uTopColor.value.copy(topCol);
    skyUniforms.uBottomColor.value.copy(botCol);
    skyUniforms.uSunColor.value.copy(sunCol);
    skyUniforms.uSunDir.value.copy(sunPos).normalize();
    skyUniforms.uSunIntensity.value = weather === 'sunny' ? 1.0 : weather === 'partlyCloudy' ? 0.85 : 0.4;
    skyUniforms.uCloudCoverage.value = cloudCoverage;
    skyUniforms.uIsNight.value = isNight;

    if (scene.fog) {
      scene.fog.color.copy(fogCol);
    }

    dirLight.color.copy(sunCol);
    dirLight.intensity = sunIntensity;
    dirLight.position.copy(sunPos);

    hemiLight.color.copy(hemiSky);
    hemiLight.groundColor.copy(hemiGnd);
    hemiLight.intensity = hemiIntensity;

    starMat.opacity = starAlpha;
    fireflyMat.opacity = fireflyAlpha;
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
  const update = (delta: number) => {
    totalTime += delta;
    skyUniforms.uTime.value = totalTime;

    // Rain particles fall
    if (currentWeather === 'gentleRain') {
      const positions = rainGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] -= delta * 26;
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 45;
        }
      }
      rainGeom.attributes.position.needsUpdate = true;
    }

    // Fireflies hover over the grass
    if (currentTimeOfDay === 'sunset' || currentTimeOfDay === 'night') {
      const fPos = fireflyGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < fireflyCount; i++) {
        fPos[i * 3] += Math.sin(totalTime * 1.2 + i) * delta * 0.45;
        fPos[i * 3 + 1] = fireflyInitialY[i] + Math.sin(totalTime * 2.0 + i * 2) * 0.4;
        fPos[i * 3 + 2] += Math.cos(totalTime * 1.1 + i) * delta * 0.45;
      }
      fireflyGeom.attributes.position.needsUpdate = true;
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
