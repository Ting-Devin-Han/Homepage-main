const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

(() => {
  const card = document.querySelector('.visitor-globe-card');
  const canvas = document.getElementById('visitor-globe');
  const stage = document.getElementById('visitor-globe-stage');
  const message = document.getElementById('visitor-globe-message');
  const locationButton = document.getElementById('visitor-location-button');
  const statusText = document.getElementById('visitor-globe-status-text');

  if (!card || !canvas || !stage || !message || !locationButton || !statusText) {
    return;
  }

  const feedPulseSiteId = (card.dataset.feedpulseSiteId || '').trim();

  if (feedPulseSiteId && feedPulseSiteId !== 'YOUR_SITE_ID') {
    const liveMount = document.createElement('div');
    const liveScript = document.createElement('script');

    liveMount.className = 'visitor-globe-live-mount';
    liveScript.async = true;
    liveScript.referrerPolicy = 'strict-origin-when-cross-origin';
    liveScript.src = `https://feed-pulse.com/api/embed/visitor-globe.js?site_id=${encodeURIComponent(feedPulseSiteId)}&map=globe&sz=md&theme=indigo&speed=slow`;
    liveScript.addEventListener('load', () => {
      canvas.hidden = true;
      card.classList.add('feedpulse-active');
      statusText.textContent = 'Live';
    });
    liveScript.addEventListener('error', () => {
      liveMount.remove();
      statusText.textContent = 'Interactive';
      message.textContent = 'Live data is temporarily unavailable';
    });
    liveMount.appendChild(liveScript);
    stage.appendChild(liveMount);
  }

  const context = canvas.getContext('2d');
  if (!context) {
    message.textContent = 'Your browser cannot render the visitor globe';
    locationButton.hidden = true;
    return;
  }

  const radians = Math.PI / 180;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visitorMarkers = [];
  let rotation = -112 * radians;
  let tilt = 12 * radians;
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let frameId = 0;
  let canvasSize = 0;
  let pixelRatio = 1;

  const landOutlines = [
    [[72,-168],[68,-145],[58,-136],[50,-125],[43,-124],[33,-117],[24,-108],[19,-98],[15,-92],[9,-83],[16,-77],[25,-80],[31,-75],[40,-73],[48,-59],[55,-60],[61,-73],[70,-88],[73,-112],[72,-140],[72,-168]],
    [[12,-81],[8,-77],[4,-78],[-5,-80],[-15,-75],[-28,-70],[-42,-73],[-55,-68],[-51,-55],[-35,-50],[-20,-45],[-5,-50],[4,-60],[10,-70],[12,-81]],
    [[83,-72],[78,-48],[70,-28],[61,-42],[64,-58],[72,-65],[83,-72]],
    [[36,-10],[43,2],[50,-5],[58,5],[71,27],[72,60],[67,92],[60,130],[50,154],[42,145],[34,130],[23,121],[11,105],[8,80],[22,60],[31,45],[37,28],[45,15],[36,-10]],
    [[35,-17],[31,3],[24,10],[15,15],[5,10],[-5,12],[-18,18],[-34,20],[-35,33],[-25,44],[-13,51],[2,43],[13,40],[23,32],[31,25],[35,10],[35,-17]],
    [[-11,113],[-20,115],[-31,125],[-39,138],[-38,151],[-28,154],[-18,146],[-12,132],[-11,113]],
    [[-13,48],[-18,44],[-25,46],[-26,51],[-20,50],[-13,48]],
    [[34,129],[37,136],[41,141],[45,142],[43,135],[38,130],[34,129]],
    [[-62,-180],[-68,-135],[-72,-90],[-74,-45],[-72,0],[-74,45],[-72,90],[-68,135],[-62,180]]
  ];

  const project = (latitude, longitude) => {
    const lat = latitude * radians;
    const lon = longitude * radians + rotation;
    const cosLat = Math.cos(lat);
    const x = cosLat * Math.sin(lon);
    const rawY = Math.sin(lat);
    const rawZ = cosLat * Math.cos(lon);
    const y = rawY * Math.cos(tilt) - rawZ * Math.sin(tilt);
    const z = rawY * Math.sin(tilt) + rawZ * Math.cos(tilt);
    const radius = canvasSize * 0.405;

    return {
      x: canvasSize / 2 + x * radius,
      y: canvasSize / 2 - y * radius,
      z,
      radius
    };
  };

  const resizeCanvas = () => {
    const bounds = stage.getBoundingClientRect();
    const nextSize = Math.max(180, Math.floor(Math.min(bounds.width, bounds.height || bounds.width)));
    const nextRatio = Math.min(window.devicePixelRatio || 1, 2);

    if (nextSize === canvasSize && nextRatio === pixelRatio) {
      return;
    }

    canvasSize = nextSize;
    pixelRatio = nextRatio;
    canvas.width = Math.round(canvasSize * pixelRatio);
    canvas.height = Math.round(canvasSize * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const drawVisibleLine = (coordinates, strokeStyle, lineWidth) => {
    let drawing = false;
    context.beginPath();

    coordinates.forEach(([latitude, longitude]) => {
      const point = project(latitude, longitude);
      if (point.z <= 0) {
        drawing = false;
        return;
      }

      if (!drawing) {
        context.moveTo(point.x, point.y);
        drawing = true;
      } else {
        context.lineTo(point.x, point.y);
      }
    });

    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  };

  const range = (start, end, step) => {
    const values = [];
    for (let value = start; value <= end; value += step) {
      values.push(value);
    }
    return values;
  };

  const drawGlobe = (time) => {
    resizeCanvas();
    context.clearRect(0, 0, canvasSize, canvasSize);

    if (!dragging && !reducedMotion && !canvas.hidden) {
      rotation += 0.0017;
    }

    const center = canvasSize / 2;
    const radius = canvasSize * 0.405;
    const globeGradient = context.createRadialGradient(
      center - radius * 0.32,
      center - radius * 0.38,
      radius * 0.08,
      center,
      center,
      radius * 1.08
    );
    globeGradient.addColorStop(0, 'rgba(196, 181, 253, 0.34)');
    globeGradient.addColorStop(0.38, 'rgba(109, 40, 217, 0.26)');
    globeGradient.addColorStop(0.78, 'rgba(46, 16, 101, 0.78)');
    globeGradient.addColorStop(1, 'rgba(15, 7, 34, 0.98)');

    context.save();
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fillStyle = globeGradient;
    context.shadowColor = 'rgba(192, 132, 252, 0.65)';
    context.shadowBlur = canvasSize * 0.07;
    context.fill();
    context.clip();
    context.shadowBlur = 0;

    range(-60, 60, 20).forEach((latitude) => {
      const points = range(-180, 180, 4).map((longitude) => [latitude, longitude]);
      drawVisibleLine(points, 'rgba(216, 180, 254, 0.13)', 0.7);
    });

    range(-150, 180, 30).forEach((longitude) => {
      const points = range(-88, 88, 3).map((latitude) => [latitude, longitude]);
      drawVisibleLine(points, 'rgba(216, 180, 254, 0.12)', 0.7);
    });

    landOutlines.forEach((outline) => {
      drawVisibleLine(outline, 'rgba(233, 213, 255, 0.62)', Math.max(0.9, canvasSize / 300));
    });

    visitorMarkers.forEach((marker, index) => {
      const point = project(marker.latitude, marker.longitude);
      if (point.z <= 0) {
        return;
      }

      const pulse = reducedMotion ? 0.5 : (Math.sin(time / 420 + index) + 1) / 2;
      const dotRadius = Math.max(3.2, canvasSize * 0.013);
      const glowRadius = dotRadius * (2.4 + pulse * 1.2);
      const markerGlow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, glowRadius);
      markerGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
      markerGlow.addColorStop(0.24, 'rgba(232, 121, 249, 0.95)');
      markerGlow.addColorStop(1, 'rgba(168, 85, 247, 0)');

      context.beginPath();
      context.arc(point.x, point.y, glowRadius, 0, Math.PI * 2);
      context.fillStyle = markerGlow;
      context.fill();

      context.beginPath();
      context.arc(point.x, point.y, dotRadius, 0, Math.PI * 2);
      context.fillStyle = '#f5d0fe';
      context.fill();
      context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      context.lineWidth = 1;
      context.stroke();
    });

    context.restore();

    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(221, 214, 254, 0.46)';
    context.lineWidth = Math.max(1, canvasSize / 220);
    context.stroke();

    frameId = window.requestAnimationFrame(drawGlobe);
  };

  const releasePointer = (event) => {
    dragging = false;
    if (event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) {
      return;
    }

    rotation += (event.clientX - lastPointerX) * 0.009;
    tilt = Math.max(-0.58, Math.min(0.58, tilt - (event.clientY - lastPointerY) * 0.006));
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  });

  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);

  locationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
      message.textContent = 'Location is not supported by this browser';
      locationButton.disabled = true;
      return;
    }

    message.textContent = 'Waiting for location permission...';
    locationButton.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        visitorMarkers.splice(0, visitorMarkers.length, {
          latitude: Math.round(position.coords.latitude * 10) / 10,
          longitude: Math.round(position.coords.longitude * 10) / 10
        });
        message.textContent = 'Your approximate location is marked';
        statusText.textContent = '1 visitor';
        locationButton.textContent = 'Visit marked';
        canvas.setAttribute('aria-label', 'Interactive purple globe with one approximate visitor location');
      },
      () => {
        message.textContent = 'Location permission was not granted';
        locationButton.disabled = false;
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 86400000
      }
    );
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(stage);
  } else {
    window.addEventListener('resize', resizeCanvas);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frameId);
    } else {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(drawGlobe);
    }
  });

  frameId = window.requestAnimationFrame(drawGlobe);
})();
