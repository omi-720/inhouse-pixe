// src/core/geometry/MeasurementUtils.js
export const PIXELS_PER_METER = 100; // Configurable

export function pixelsToMeters(pixels) {
  return pixels / PIXELS_PER_METER;
}

export function metersToPixels(meters) {
  return meters * PIXELS_PER_METER;
}

export function formatDistance(pixelDistance) {
  const meters = pixelsToMeters(pixelDistance);
  
  if (meters < 0.01) {
    return `${(meters * 1000).toFixed(0)}mm`;
  } else if (meters < 1) {
    return `${(meters * 100).toFixed(1)}cm`;
  } else {
    return `${meters.toFixed(2)}m`;
  }
}

export function calculateWallMidpoint(wall) {
  return {
    x: (wall.start.x + wall.end.x) / 2,
    y: (wall.start.y + wall.end.y) / 2
  };
}

export function calculateWallAngle(wall) {
  return Math.atan2(
    wall.end.y - wall.start.y,
    wall.end.x - wall.start.x
  );
}

export function isObjectInViewport(objectBounds, cameraBounds) {
  return !(
    objectBounds.maxX < cameraBounds.minX ||
    objectBounds.minX > cameraBounds.maxX ||
    objectBounds.maxY < cameraBounds.minY ||
    objectBounds.minY > cameraBounds.maxY
  );
}

export function getWallBounds(wall, thickness) {
  const t = thickness / 2;
  const angle = calculateWallAngle(wall);
  const perpendicular = angle + Math.PI / 2;
  
  const dx = Math.cos(perpendicular) * t;
  const dy = Math.sin(perpendicular) * t;
  
  const points = [
    { x: wall.start.x + dx, y: wall.start.y + dy },
    { x: wall.start.x - dx, y: wall.start.y - dy },
    { x: wall.end.x - dx, y: wall.end.y - dy },
    { x: wall.end.x + dx, y: wall.end.y + dy }
  ];
  
  // Calculate bounding box
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}