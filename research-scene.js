(() => {
  const scene = document.getElementById('research-scene');
  const canvas = document.getElementById('research-scene-canvas');

  if (!scene || !canvas) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const points = [];
  const cityNodes = [];
  const nodeLinks = [
    [0, 2], [0, 5], [1, 3], [1, 6], [2, 4], [2, 7], [3, 5], [4, 6], [5, 7]
  ];
  const stars = [];

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frameId = 0;
  let isVisible = true;
  let yaw = -0.24;
  let pitch = 0.46;
  let targetYaw = yaw;
  let targetPitch = pitch;

  let seed = 314159;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const addPoint = (x, y, z, kind = 'structure', size = 1) => {
    points.push({ x, y, z, kind, size, phase: random() * Math.PI * 2 });
  };

  const addBuilding = ({ x, z, width: buildingWidth, depth, height: buildingHeight }) => {
    const spacing = 28;
    const halfWidth = buildingWidth / 2;
    const halfDepth = depth / 2;

    for (let y = 0; y <= buildingHeight; y += spacing) {
      for (let offsetX = -halfWidth; offsetX <= halfWidth; offsetX += spacing) {
        addPoint(x + offsetX, y, z - halfDepth, 'structure', y === buildingHeight ? 1.35 : 1);
        addPoint(x + offsetX, y, z + halfDepth, 'structure', y === buildingHeight ? 1.35 : 1);
      }

      for (let offsetZ = -halfDepth + spacing; offsetZ < halfDepth; offsetZ += spacing) {
        addPoint(x - halfWidth, y, z + offsetZ, 'structure');
        addPoint(x + halfWidth, y, z + offsetZ, 'structure');
      }
    }

    for (let roofX = -halfWidth; roofX <= halfWidth; roofX += spacing) {
      for (let roofZ = -halfDepth; roofZ <= halfDepth; roofZ += spacing) {
        if (random() > 0.24) {
          addPoint(x + roofX, buildingHeight, z + roofZ, 'roof', 1.25);
        }
      }
    }

    cityNodes.push({ x, y: buildingHeight + 18, z });
  };

  const buildScene = () => {
    for (let x = -940; x <= 940; x += 48) {
      for (let z = -620; z <= 620; z += 48) {
        const isRoad = Math.abs(x + 70) < 70 || Math.abs(z - 40) < 64;
        const keepPoint = isRoad ? random() > 0.08 : random() > 0.34;

        if (keepPoint) {
          addPoint(x, (random() - 0.5) * 4, z, isRoad ? 'road' : 'ground', isRoad ? 1.25 : 0.85);
        }
      }
    }

    [
      { x: -590, z: -245, width: 150, depth: 145, height: 230 },
      { x: -365, z: -115, width: 190, depth: 150, height: 355 },
      { x: -120, z: -285, width: 145, depth: 150, height: 190 },
      { x: 115, z: -75, width: 180, depth: 170, height: 430 },
      { x: 350, z: -265, width: 165, depth: 150, height: 285 },
      { x: 560, z: -35, width: 215, depth: 185, height: 375 },
      { x: 735, z: -340, width: 130, depth: 145, height: 215 },
      { x: 805, z: 150, width: 175, depth: 165, height: 305 }
    ].forEach(addBuilding);

    for (let index = 0; index < 82; index += 1) {
      stars.push({
        x: random(),
        y: random() * 0.76,
        size: 0.45 + random() * 1.3,
        phase: random() * Math.PI * 2
      });
    }
  };

  const project = (point) => {
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const rotatedX = point.x * cosYaw - point.z * sinYaw;
    const rotatedZ = point.x * sinYaw + point.z * cosYaw;
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const rotatedY = point.y * cosPitch - rotatedZ * sinPitch;
    const depth = point.y * sinPitch + rotatedZ * cosPitch;
    const cameraDistance = 1540;
    const perspectiveDepth = Math.max(240, cameraDistance - depth);
    const focalLength = Math.max(620, Math.min(1080, width * 0.9));
    const scale = focalLength / perspectiveDepth;

    return {
      x: width * (width < 900 ? 0.68 : 0.72) + rotatedX * scale,
      y: height * 0.69 - rotatedY * scale,
      depth,
      scale
    };
  };

  const drawLine = (start, end, color, lineWidth = 1) => {
    const projectedStart = project(start);
    const projectedEnd = project(end);
    context.beginPath();
    context.moveTo(projectedStart.x, projectedStart.y);
    context.lineTo(projectedEnd.x, projectedEnd.y);
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.stroke();
  };

  const drawGroundGrid = () => {
    context.save();
    for (let x = -900; x <= 900; x += 150) {
      drawLine({ x, y: -2, z: -620 }, { x, y: -2, z: 620 }, 'rgba(139, 92, 246, 0.09)');
    }
    for (let z = -600; z <= 600; z += 120) {
      drawLine({ x: -940, y: -2, z }, { x: 940, y: -2, z }, 'rgba(129, 140, 248, 0.075)');
    }
    context.restore();
  };

  const drawStars = (time) => {
    context.save();
    for (const star of stars) {
      const pulse = 0.42 + Math.sin(time * 0.0011 + star.phase) * 0.22;
      context.fillStyle = `rgba(196, 181, 253, ${Math.max(0.12, pulse)})`;
      context.fillRect(star.x * width, star.y * height, star.size, star.size);
    }
    context.restore();
  };

  const drawLinks = (time) => {
    context.save();
    context.globalCompositeOperation = 'screen';

    nodeLinks.forEach(([startIndex, endIndex], linkIndex) => {
      const start = project(cityNodes[startIndex]);
      const end = project(cityNodes[endIndex]);
      const lift = 30 + Math.abs(end.x - start.x) * 0.08;
      const flow = (Math.sin(time * 0.0015 + linkIndex) + 1) / 2;
      const gradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.08)');
      gradient.addColorStop(flow, 'rgba(216, 180, 254, 0.5)');
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0.08)');

      context.beginPath();
      context.moveTo(start.x, start.y);
      context.quadraticCurveTo((start.x + end.x) / 2, Math.min(start.y, end.y) - lift, end.x, end.y);
      context.strokeStyle = gradient;
      context.lineWidth = 0.8;
      context.stroke();
    });

    cityNodes.forEach((node, index) => {
      const projected = project(node);
      const pulse = 2.7 + (Math.sin(time * 0.002 + index) + 1) * 1.4;

      context.beginPath();
      context.arc(projected.x, projected.y, pulse + 4, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(167, 139, 250, 0.2)';
      context.lineWidth = 0.8;
      context.stroke();

      context.beginPath();
      context.arc(projected.x, projected.y, 2.1, 0, Math.PI * 2);
      context.fillStyle = '#ddd6fe';
      context.shadowColor = '#a78bfa';
      context.shadowBlur = 12;
      context.fill();
      context.shadowBlur = 0;
    });
    context.restore();
  };

  const drawPointCloud = (time) => {
    const scanProgress = reduceMotion ? 0.62 : (time % 9200) / 9200;
    const scanX = -980 + scanProgress * 1960;
    const highlighted = [];

    for (const point of points) {
      const projected = project(point);
      if (projected.x < -12 || projected.x > width + 12 || projected.y < -12 || projected.y > height + 12) continue;

      const scanDistance = Math.abs(point.x - scanX);
      const scanStrength = Math.max(0, 1 - scanDistance / 105);
      const pulse = 0.84 + Math.sin(time * 0.0014 + point.phase) * 0.16;
      let color = `rgba(129, 140, 248, ${0.2 * pulse})`;

      if (point.kind === 'structure') color = `rgba(167, 139, 250, ${0.36 * pulse})`;
      if (point.kind === 'roof') color = `rgba(216, 180, 254, ${0.48 * pulse})`;
      if (point.kind === 'road') color = `rgba(96, 165, 250, ${0.3 * pulse})`;

      const size = Math.max(0.65, point.size * projected.scale * 1.65);
      context.fillStyle = color;
      context.fillRect(projected.x, projected.y, size, size);

      if (scanStrength > 0.16) {
        highlighted.push({ ...projected, strength: scanStrength, size });
      }
    }

    context.save();
    context.globalCompositeOperation = 'screen';
    context.shadowColor = '#c4b5fd';
    context.shadowBlur = 9;
    for (const point of highlighted) {
      context.fillStyle = `rgba(238, 231, 255, ${0.2 + point.strength * 0.7})`;
      context.fillRect(point.x, point.y, point.size + point.strength * 1.35, point.size + point.strength * 1.35);
    }
    context.restore();

    const scanStart = project({ x: scanX, y: -4, z: -620 });
    const scanEnd = project({ x: scanX, y: -4, z: 620 });
    const scanGradient = context.createLinearGradient(scanStart.x, scanStart.y, scanEnd.x, scanEnd.y);
    scanGradient.addColorStop(0, 'rgba(196, 181, 253, 0)');
    scanGradient.addColorStop(0.45, 'rgba(196, 181, 253, 0.36)');
    scanGradient.addColorStop(1, 'rgba(129, 140, 248, 0)');
    context.beginPath();
    context.moveTo(scanStart.x, scanStart.y);
    context.lineTo(scanEnd.x, scanEnd.y);
    context.strokeStyle = scanGradient;
    context.lineWidth = 1.1;
    context.stroke();
  };

  const render = (time = 0) => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(7, 3, 15, 0.08)';
    context.fillRect(0, 0, width, height);

    yaw += (targetYaw - yaw) * 0.055;
    pitch += (targetPitch - pitch) * 0.055;

    drawStars(time);
    drawGroundGrid();
    drawLinks(time);
    drawPointCloud(time);

    if (!reduceMotion && isVisible && !document.hidden) {
      frameId = window.requestAnimationFrame(render);
    }
  };

  const start = () => {
    if (reduceMotion || frameId || !isVisible || document.hidden) return;
    frameId = window.requestAnimationFrame(render);
  };

  const stop = () => {
    if (!frameId) return;
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const resize = () => {
    const bounds = scene.getBoundingClientRect();
    width = Math.max(1, Math.floor(bounds.width));
    height = Math.max(1, Math.floor(bounds.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    if (reduceMotion || !frameId) render(performance.now());
  };

  if (finePointer && !reduceMotion) {
    scene.addEventListener('pointermove', (event) => {
      const bounds = scene.getBoundingClientRect();
      const relativeX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      const relativeY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));

      targetYaw = -0.24 + (relativeX - 0.5) * 0.2;
      targetPitch = 0.46 + (relativeY - 0.5) * 0.08;
      scene.style.setProperty('--scene-pointer-x', `${(relativeX * 100).toFixed(1)}%`);
      scene.style.setProperty('--scene-pointer-y', `${(relativeY * 100).toFixed(1)}%`);
    });

    scene.addEventListener('pointerleave', () => {
      targetYaw = -0.24;
      targetPitch = 0.46;
      scene.style.setProperty('--scene-pointer-x', '72%');
      scene.style.setProperty('--scene-pointer-y', '36%');
    });
  }

  buildScene();
  resize();

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(scene);
  } else {
    window.addEventListener('resize', resize);
  }

  if ('IntersectionObserver' in window) {
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) {
        start();
      } else {
        stop();
      }
    }, { threshold: 0.02 });
    visibilityObserver.observe(scene);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });

  if (reduceMotion) {
    render(0);
  } else {
    start();
  }
})();
