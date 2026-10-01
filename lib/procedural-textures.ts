import * as THREE from 'three';

// Utility to create high-detail noise on canvas
function createNoisePattern(
  width: number,
  height: number,
  generator: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    generator(ctx, width, height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 1. Lush Multi-Tonal Grass Texture (1024x1024)
export function getGrassTexture(): THREE.CanvasTexture {
  return createNoisePattern(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#2f491c';
    ctx.fillRect(0, 0, w, h);

    const colors = ['#385a22', '#2a4016', '#466e28', '#527f2e', '#233614', '#3c5a24', '#5f8e36'];
    for (let i = 0; i < 110000; i++) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 3 + Math.random() * 8;
      ctx.fillRect(x, y, 1.8, len);
    }

    // Micro clover patches & dandelion florets
    for (let i = 0; i < 1200; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      ctx.fillStyle = Math.random() > 0.4 ? '#4a7526' : '#d2e482';
      for (let p = 0; p < 3; p++) {
        const a = (p * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 2.5, cy + Math.sin(a) * 2.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

// 2. Loamy Earth Dirt Carriage Road Texture (1024x1024)
export function getDirtPathTexture(): THREE.CanvasTexture {
  return createNoisePattern(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#564230';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 95000; i++) {
      const shade = Math.floor(55 + Math.random() * 60);
      const r = shade + 24;
      const g = shade + 4;
      const b = Math.max(0, shade - 20);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.9, 1.9);
    }

    // River pebbles and grit
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 1.2 + Math.random() * 3.5;
      ctx.fillStyle = Math.random() > 0.5 ? '#7f7466' : '#42372d';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// 3. Ultra-Dense Volumetric Leaf Cluster Texture (1024x1024 with natural alpha cutout)
export function getLeafClusterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 1024, 1024);

    // Branching twigs structure
    ctx.lineWidth = 4.0;
    ctx.strokeStyle = '#2d241c';
    ctx.lineCap = 'round';
    for (let b = 0; b < 16; b++) {
      const angle = (b * Math.PI * 2) / 16 + (Math.random() - 0.5) * 0.3;
      const len = 340 + Math.random() * 120;
      ctx.beginPath();
      ctx.moveTo(512, 512);
      const midX = 512 + Math.cos(angle) * (len * 0.5) + (Math.random() - 0.5) * 60;
      const midY = 512 + Math.sin(angle) * (len * 0.5) + (Math.random() - 0.5) * 60;
      const endX = 512 + Math.cos(angle) * len;
      const endY = 512 + Math.sin(angle) * len;
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
    }

    // 340+ organic foliage leaves with realistic depth, lobes, highlights & shadows
    const leafCount = 360;
    for (let i = 0; i < leafCount; i++) {
      const distFromCenter = Math.pow(Math.random(), 0.65) * 440;
      const angle = Math.random() * Math.PI * 2;
      const cx = 512 + Math.cos(angle) * distFromCenter;
      const cy = 512 + Math.sin(angle) * distFromCenter;

      const leafAngle = angle + (Math.random() - 0.5) * 1.5;
      const len = 38 + Math.random() * 32;
      const width = 22 + Math.random() * 16;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(leafAngle);

      // Multi-lobed natural oak/beech leaf
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.5);
      ctx.bezierCurveTo(width * 1.2, -len * 0.25, width * 1.1, len * 0.25, 0, len * 0.5);
      ctx.bezierCurveTo(-width * 1.1, len * 0.25, -width * 1.2, -len * 0.25, 0, -len * 0.5);

      // Layered gradient coloring: sunlit tips, deep shadowy leaf bases
      const tone = 35 + Math.floor(Math.random() * 45);
      const isTopHighlight = Math.random() < 0.35;
      const r = isTopHighlight ? tone + 28 : tone + 6;
      const g = isTopHighlight ? tone + 68 : tone + 38;
      const b = isTopHighlight ? tone - 8 : tone - 18;
      ctx.fillStyle = `rgb(${r}, ${g}, ${Math.max(4, b)})`;
      ctx.fill();

      // Leaf central vein and side ribs
      ctx.strokeStyle = `rgba(18, 42, 10, 0.45)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.45);
      ctx.lineTo(0, len * 0.45);
      ctx.stroke();

      // Subtle side veins
      for (let v = -2; v <= 2; v++) {
        if (v === 0) continue;
        const vy = (v / 3) * len * 0.35;
        ctx.beginPath();
        ctx.moveTo(0, vy);
        ctx.lineTo(width * 0.55, vy - 6);
        ctx.moveTo(0, vy);
        ctx.lineTo(-width * 0.55, vy - 6);
        ctx.stroke();
      }

      ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 4. Grass Blade Alpha & Shading Texture (256x512)
export function getGrassBladeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 512);

    // Tapering grass blade silhouette
    ctx.beginPath();
    ctx.moveTo(60, 512);
    ctx.lineTo(196, 512);
    ctx.quadraticCurveTo(170, 250, 134, 15);
    ctx.quadraticCurveTo(128, 0, 122, 15);
    ctx.quadraticCurveTo(86, 250, 60, 512);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 512, 0, 0);
    grad.addColorStop(0, '#2d4a18');
    grad.addColorStop(0.3, '#3c6420');
    grad.addColorStop(0.75, '#568b2a');
    grad.addColorStop(1, '#94b842');
    ctx.fillStyle = grad;
    ctx.fill();

    // Central midrib line
    ctx.strokeStyle = 'rgba(25, 45, 12, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(128, 512);
    ctx.lineTo(128, 30);
    ctx.stroke();

    // Micro vertical blade fibers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let f = 75; f < 185; f += 8) {
      ctx.beginPath();
      ctx.moveTo(f, 500);
      ctx.lineTo(128 + (f - 128) * 0.15, 60);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// 5. White Paper Birch Bark Texture (512x1024)
export function getBirchBarkTexture(): THREE.CanvasTexture {
  return createNoisePattern(512, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#e8e5dc';
    ctx.fillRect(0, 0, w, h);

    // Warm paper undertone grain
    ctx.fillStyle = 'rgba(175, 165, 150, 0.25)';
    for (let i = 0; i < 15000; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 2);
    }

    // Horizontal black lenticels and knot rings
    ctx.fillStyle = '#1c1a18';
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * (w - 35);
      const y = Math.random() * h;
      const len = 8 + Math.random() * 38;
      const thick = 1.5 + Math.random() * 2.5;
      ctx.fillRect(x, y, len, thick);
    }
  });
}

// 5. Deep Furrowed Oak Bark Texture (512x1024)
export function getBarkTexture(): THREE.CanvasTexture {
  return createNoisePattern(512, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#3a2d24';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 18000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 12 + Math.random() * 45;
      const tone = 40 + Math.random() * 40;
      ctx.fillStyle = `rgb(${tone + 8}, ${tone}, ${tone - 12})`;
      ctx.fillRect(x, y, 2.2, len);
    }

    // Moss / Lichen specks on bark
    ctx.fillStyle = '#4c5d36';
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// 6. Realistic Anatomical Holstein Cow Coat (1024x1024)
export function getHolsteinCoatTexture(): THREE.CanvasTexture {
  return createNoisePattern(1024, 1024, (ctx, w, h) => {
    // Ivory base coat
    ctx.fillStyle = '#f5f3ed';
    ctx.fillRect(0, 0, w, h);

    // Fine hair grain
    ctx.fillStyle = 'rgba(195, 190, 180, 0.28)';
    for (let i = 0; i < 40000; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 3.5);
    }

    // Organic irregular bovine black patches
    ctx.fillStyle = '#161514';
    const patches = [
      { x: 220, y: 300, r: 160 },
      { x: 740, y: 340, r: 180 },
      { x: 480, y: 680, r: 210 },
      { x: 180, y: 780, r: 130 },
      { x: 820, y: 800, r: 150 },
      { x: 520, y: 220, r: 110 },
      { x: 350, y: 520, r: 90 },
    ];

    patches.forEach((p) => {
      ctx.beginPath();
      const numPts = 24;
      for (let i = 0; i < numPts; i++) {
        const angle = (i / numPts) * Math.PI * 2;
        const rad = p.r * (0.65 + Math.random() * 0.7);
        const px = p.x + Math.cos(angle) * rad;
        const py = p.y + Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    });

    // Subtle edge softening of black spots for real fur look
    ctx.fillStyle = 'rgba(25, 24, 22, 0.35)';
    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillRect(x, y, 1.2, 2.0);
    }
  });
}

// 7. Realistic Jersey Cow Coat (1024x1024)
export function getJerseyCoatTexture(): THREE.CanvasTexture {
  return createNoisePattern(1024, 1024, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#754727');
    grad.addColorStop(0.35, '#9a633a');
    grad.addColorStop(0.7, '#b88355');
    grad.addColorStop(1, '#cb9a6e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Fine short hair fibers
    ctx.fillStyle = 'rgba(60, 35, 15, 0.15)';
    for (let i = 0; i < 45000; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 3.2);
    }
  });
}

// 8. Soft Crimped Sheep Wool Texture (512x512)
export function getSheepWoolTexture(): THREE.CanvasTexture {
  return createNoisePattern(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e8e4da';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 3.5 + Math.random() * 5.5;

      ctx.fillStyle = Math.random() > 0.4 ? '#d8d1c2' : '#f5f3ec';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// 9. Weatherboard Farmhouse Siding
export function getFarmhouseSidingTexture(): THREE.CanvasTexture {
  return createNoisePattern(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#dbd6cb';
    ctx.fillRect(0, 0, w, h);

    const boards = 16;
    const boardH = h / boards;

    for (let b = 0; b < boards; b++) {
      const y = b * boardH;
      const tone = 210 + Math.floor(Math.random() * 18);
      ctx.fillStyle = `rgb(${tone + 5}, ${tone}, ${tone - 10})`;
      ctx.fillRect(0, y, w, boardH - 2);

      ctx.fillStyle = 'rgba(90, 80, 70, 0.08)';
      for (let i = 0; i < 40; i++) {
        ctx.fillRect(0, y + Math.random() * boardH, w, 1);
      }

      ctx.fillStyle = 'rgba(40, 35, 30, 0.38)';
      ctx.fillRect(0, y + boardH - 3, w, 3);
    }
  });
}

// 10. Weathered Red Barn Wood Siding
export function getBarnWoodTexture(): THREE.CanvasTexture {
  return createNoisePattern(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#68221d';
    ctx.fillRect(0, 0, w, h);

    const battens = 14;
    const battenW = w / battens;

    for (let b = 0; b < battens; b++) {
      const x = b * battenW;
      const redTone = 85 + Math.floor(Math.random() * 26);
      ctx.fillStyle = `rgb(${redTone + 35}, ${Math.floor(redTone * 0.36)}, ${Math.floor(redTone * 0.3)})`;
      ctx.fillRect(x, 0, battenW - 3, h);

      ctx.fillStyle = 'rgba(125, 105, 85, 0.18)';
      for (let i = 0; i < 250; i++) {
        ctx.fillRect(x + Math.random() * (battenW - 3), Math.random() * h, 2, 8);
      }

      ctx.fillStyle = '#180a08';
      ctx.fillRect(x + battenW - 3, 0, 3, h);
    }
  });
}

// 11. Cedar Shake Roof Shingles
export function getRoofShingleTexture(): THREE.CanvasTexture {
  return createNoisePattern(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#322c28';
    ctx.fillRect(0, 0, w, h);

    const rows = 18;
    const rowH = h / rows;

    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const shingles = 11 + Math.floor(Math.random() * 4);
      const shingleW = w / shingles;
      const offset = (r % 2) * (shingleW * 0.5);

      for (let s = -1; s <= shingles + 1; s++) {
        const x = s * shingleW + offset;
        const val = 55 + Math.floor(Math.random() * 35);
        ctx.fillStyle = `rgb(${val + 5}, ${val}, ${val - 5})`;
        ctx.fillRect(x + 1, y, shingleW - 2, rowH - 2);

        ctx.fillStyle = 'rgba(15, 15, 15, 0.35)';
        ctx.fillRect(x + 1, y + rowH - 3, shingleW - 2, 3);
      }
    }
  });
}

// 12. Fieldstone Masonry
export function getStoneTexture(): THREE.CanvasTexture {
  return createNoisePattern(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#46433f';
    ctx.fillRect(0, 0, w, h);

    const rows = 14;
    const rowH = h / rows;

    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const stonesInRow = 7 + Math.floor(Math.random() * 3);
      const stoneW = w / stonesInRow;
      const offset = (r % 2) * (stoneW * 0.5);

      for (let s = -1; s <= stonesInRow + 1; s++) {
        const x = s * stoneW + offset;
        const stoneVal = 90 + Math.floor(Math.random() * 45);
        ctx.fillStyle = `rgb(${stoneVal}, ${stoneVal - 4}, ${stoneVal - 10})`;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, stoneW - 4, rowH - 4, 4);
        ctx.fill();

        if (Math.random() > 0.6) {
          ctx.fillStyle = '#526638';
          ctx.beginPath();
          ctx.arc(x + Math.random() * stoneW, y + Math.random() * rowH, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  });
}

// 13. Weathered Timber Wood Planks
export function getWoodPlanksTexture(): THREE.CanvasTexture {
  return createNoisePattern(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6f5d4b';
    ctx.fillRect(0, 0, w, h);

    const plankCount = 8;
    const plankHeight = h / plankCount;

    for (let p = 0; p < plankCount; p++) {
      const yStart = p * plankHeight;
      const baseTone = 100 + (Math.random() - 0.5) * 20;
      ctx.fillStyle = `rgb(${baseTone + 14}, ${baseTone}, ${baseTone - 16})`;
      ctx.fillRect(0, yStart, w, plankHeight - 2);

      ctx.strokeStyle = `rgba(40, 30, 20, 0.3)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const yLine = yStart + Math.random() * (plankHeight - 4);
        ctx.beginPath();
        ctx.moveTo(0, yLine);
        ctx.bezierCurveTo(
          w * 0.3, yLine + (Math.random() - 0.5) * 4,
          w * 0.7, yLine + (Math.random() - 0.5) * 4,
          w, yLine
        );
        ctx.stroke();
      }

      if (Math.random() > 0.4) {
        const kx = Math.random() * w;
        const ky = yStart + plankHeight * 0.5;
        ctx.fillStyle = '#362618';
        ctx.beginPath();
        ctx.ellipse(kx, ky, 3, 6, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#221710';
      ctx.fillRect(0, yStart + plankHeight - 3, w, 3);
    }
  });
}

// 14. Water Normal Map
export function getWaterNormalMap(): THREE.CanvasTexture {
  return createNoisePattern(512, 512, (ctx, w, h) => {
    const imgData = ctx.createImageData(w, h);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const x = (i / 4) % w;
      const y = Math.floor(i / 4 / w);

      const f1 = Math.sin((x / w) * Math.PI * 14) * Math.cos((y / h) * Math.PI * 14);
      const f2 = Math.sin((x / w) * Math.PI * 28 + 1.2) * Math.cos((y / h) * Math.PI * 24);
      const f3 = Math.sin(((x + y) / w) * Math.PI * 10) * 0.5;

      const nx = (f1 * 0.5 + f2 * 0.3 + f3 * 0.2) * 0.4 + 0.5;
      const ny = (Math.cos((x / w) * Math.PI * 14) * 0.5 + Math.sin((y / h) * Math.PI * 28) * 0.3) * 0.4 + 0.5;

      imgData.data[i] = Math.floor(nx * 255);
      imgData.data[i + 1] = Math.floor(ny * 255);
      imgData.data[i + 2] = 245;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  });
}
