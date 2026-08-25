(() => {
  const mapElement = document.getElementById('activity-world-map');
  const listElement = document.getElementById('activity-location-list');
  const statusElement = document.getElementById('activity-map-status');
  const summaryElement = document.getElementById('activity-map-summary');

  if (!mapElement || !listElement) return;

  const activityRecords = [
    { id: 'activity-dubai-apr-2025', city: 'Dubai', region: 'UAE', date: 'April 2025', coordinates: [25.2048, 55.2708] },
    { id: 'activity-zhuhai-jun-2025', city: 'Zhuhai', region: 'China', date: 'June 2025', coordinates: [22.271, 113.5767] },
    { id: 'activity-hong-kong-jul-2025', city: 'HongKong', label: 'Hong Kong', region: 'China', date: 'July 2025', coordinates: [22.3193, 114.1694] },
    { id: 'activity-shenzhen-jul-2025', city: 'Shenzhen', region: 'China', date: 'July 2025', coordinates: [22.5431, 114.0579] },
    { id: 'activity-guangzhou-jul-2025', city: 'Guangzhou', region: 'China', date: 'July 2025', coordinates: [23.1291, 113.2644] },
    { id: 'activity-hangzhou-jul-2025', city: 'Hangzhou', region: 'China', date: 'July 2025', coordinates: [30.2741, 120.1551] },
    { id: 'activity-brisbane-aug-2025', city: 'Brisbane', region: 'Australia', date: 'August 2025', coordinates: [-27.4698, 153.0251] },
    { id: 'activity-zhuhai-aug-2025', city: 'Zhuhai', region: 'China', date: 'August 2025', coordinates: [22.271, 113.5767] },
    { id: 'activity-beijing-sep-2025', city: 'Beijing', region: 'China', date: 'September 2025', coordinates: [39.9042, 116.4074] },
    { id: 'activity-minneapolis-nov-2025', city: 'Minneapolis', region: 'USA', date: 'November 2025', coordinates: [44.9778, -93.265] },
    { id: 'activity-zhengzhou-apr-2026', city: 'Zhengzhou', region: 'China', date: 'April 2026', coordinates: [34.7466, 113.6254] }
  ];

  const albums = Array.from(document.querySelectorAll('.album'));
  activityRecords.forEach((record) => {
    const album = albums.find((candidate) => {
      const heading = candidate.querySelector('h3')?.textContent || '';
      return heading.includes(record.city) && heading.includes(record.date);
    });

    if (album) {
      album.id = record.id;
      album.dataset.activityLocation = record.label || record.city;
    }
  });

  const groupedLocations = Array.from(
    activityRecords.reduce((groups, record) => {
      const key = record.city;
      if (!groups.has(key)) {
        groups.set(key, {
          city: record.label || record.city,
          region: record.region,
          coordinates: record.coordinates,
          records: []
        });
      }
      groups.get(key).records.push(record);
      return groups;
    }, new Map()).values()
  );

  if (summaryElement) {
    summaryElement.textContent = `${groupedLocations.length} cities · ${activityRecords.length} activities`;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const markerByCity = new Map();
  let map = null;

  const setActiveLocation = (city) => {
    document.querySelectorAll('.activity-location-button').forEach((button) => {
      const isActive = button.dataset.city === city;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  const focusAlbum = (recordId) => {
    const album = document.getElementById(recordId);
    if (!album) return;

    document.querySelectorAll('.album.is-map-highlighted').forEach((item) => {
      item.classList.remove('is-map-highlighted');
    });
    album.classList.add('is-map-highlighted');
    album.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => album.classList.remove('is-map-highlighted'), 2200);
  };

  const createLocationButton = (location) => {
    const button = document.createElement('button');
    button.className = 'activity-location-button';
    button.type = 'button';
    button.dataset.city = location.city;
    button.setAttribute('aria-pressed', 'false');

    const name = document.createElement('span');
    name.className = 'activity-location-name';
    name.textContent = location.city;

    const meta = document.createElement('span');
    meta.className = 'activity-location-meta';
    meta.textContent = `${location.region} · ${location.records.length} ${location.records.length === 1 ? 'activity' : 'activities'}`;

    button.append(name, meta);
    button.addEventListener('click', () => {
      setActiveLocation(location.city);
      const marker = markerByCity.get(location.city);
      if (map && marker) {
        map.flyTo(location.coordinates, Math.max(map.getZoom(), 4), {
          animate: !reduceMotion,
          duration: reduceMotion ? 0 : 0.8
        });
        marker.openPopup();
      } else {
        focusAlbum(location.records[0].id);
      }
    });

    return button;
  };

  groupedLocations.forEach((location) => {
    listElement.appendChild(createLocationButton(location));
  });

  if (!window.L) {
    mapElement.classList.add('is-unavailable');
    if (statusElement) {
      statusElement.textContent = 'The interactive map is unavailable. Use the location index to open each activity.';
    }
    return;
  }

  map = window.L.map(mapElement, {
    center: [27, 62],
    zoom: 1.75,
    zoomSnap: 0.25,
    minZoom: 1.5,
    maxZoom: 8,
    maxBounds: [[-85, -190], [85, 190]],
    worldCopyJump: true,
    scrollWheelZoom: false,
    attributionControl: true
  });

  window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 1,
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const routeCoordinates = activityRecords.map((record) => record.coordinates);
  window.L.polyline(routeCoordinates, {
    color: '#a78bfa',
    weight: 1.5,
    opacity: 0.55,
    dashArray: '5 8',
    interactive: false
  }).addTo(map);

  const markerIcon = window.L.divIcon({
    className: 'activity-marker-icon',
    html: '<span class="activity-marker-pulse"></span><span class="activity-marker-core"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -13]
  });

  groupedLocations.forEach((location) => {
    const eventLinks = location.records.map((record) => (
      `<li><a href="#${record.id}" data-activity-target="${record.id}">${record.date}</a></li>`
    )).join('');

    const popupContent = `
      <div class="activity-map-popup">
        <strong>${location.city}</strong>
        <span>${location.region}</span>
        <ul>${eventLinks}</ul>
      </div>
    `;

    const marker = window.L.marker(location.coordinates, { icon: markerIcon })
      .addTo(map)
      .bindPopup(popupContent, { closeButton: false, offset: [0, -4] });

    marker.on('click', () => {
      setActiveLocation(location.city);
    });

    markerByCity.set(location.city, marker);
  });

  mapElement.addEventListener('click', (event) => {
    const activityLink = event.target.closest('[data-activity-target]');
    if (!activityLink) return;
    event.preventDefault();
    focusAlbum(activityLink.dataset.activityTarget);
  });

  if (statusElement) {
    statusElement.textContent = 'Interactive map ready. Drag to explore, use +/− to zoom, and select a glowing location.';
  }

  window.setTimeout(() => map.invalidateSize(), 0);
})();
