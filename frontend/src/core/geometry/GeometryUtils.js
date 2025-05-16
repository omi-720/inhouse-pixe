// src/core/geometry/GeometryUtils.js
export const exactPointMatch = (p1, p2) => {
  if (!p1 || !p2) return false;
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y);
  return dx < 0.01 && dy < 0.01;
};

export const getNormalizedDirection = (start, end) => {
  if (!start || !end) return { x: 0, y: 0 };
  
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length < 0.0001) return { x: 0, y: 0 };
  
  return {
    x: dx / length,
    y: dy / length
  };
};

export const getPerpendicularOffset = (start, end, thickness) => {
  if (!start || !end) return { dx: 0, dy: 0 };
  
  const direction = getNormalizedDirection(start, end);
  
  // Calculate perpendicular direction (rotate 90 degrees)
  const perpX = -direction.y;
  const perpY = direction.x;
  
  // Half thickness for each side of centerline
  // This is exactly as in your original code, but ensuring thickness is in meters
  const halfThickness = thickness / 2;
  
  return {
    dx: perpX * halfThickness,
    dy: perpY * halfThickness
  };
};

export const calculateWallIntersection = (wall1, wall2) => {
  const { start: p1, end: p2 } = wall1;
  const { start: p3, end: p4 } = wall2;
  
  // Line 1 represented as a1x + b1y = c1 
  const a1 = p2.y - p1.y; 
  const b1 = p1.x - p2.x; 
  const c1 = a1 * p1.x + b1 * p1.y; 
  
  // Line 2 represented as a2x + b2y = c2 
  const a2 = p4.y - p3.y; 
  const b2 = p3.x - p4.x; 
  const c2 = a2 * p3.x + b2 * p3.y; 
  
  const determinant = a1 * b2 - a2 * b1; 
  
  if (Math.abs(determinant) < 0.001) {
    // Lines are parallel or almost parallel
    return null;
  }
  
  const x = (b2 * c1 - b1 * c2) / determinant; 
  const y = (a1 * c2 - a2 * c1) / determinant; 
  
  // Check if intersection is within both line segments
  const onSegment1 = 
    x >= Math.min(p1.x, p2.x) - 0.1 && x <= Math.max(p1.x, p2.x) + 0.1 && 
    y >= Math.min(p1.y, p2.y) - 0.1 && y <= Math.max(p1.y, p2.y) + 0.1;
  
  const onSegment2 = 
    x >= Math.min(p3.x, p4.x) - 0.1 && x <= Math.max(p3.x, p4.x) + 0.1 && 
    y >= Math.min(p3.y, p4.y) - 0.1 && y <= Math.max(p3.y, p4.y) + 0.1;
  
  if (onSegment1 && onSegment2) {
    return { x, y };
  }
  
  return null;
};

export const getMiteredCornerPoint = (prevWall, currentWall, thickness, isOutside) => {
  if (!prevWall || !currentWall) return null;
  
  // Determine the common point (junction)
  let junction;
  if (exactPointMatch(prevWall.end, currentWall.start)) {
    junction = { x: prevWall.end.x, y: prevWall.end.y };
  } else if (exactPointMatch(prevWall.start, currentWall.start)) {
    junction = { x: prevWall.start.x, y: prevWall.start.y };
  } else if (exactPointMatch(prevWall.end, currentWall.end)) {
    junction = { x: prevWall.end.x, y: prevWall.end.y };
  } else {
    // No exact match, use current wall start as fallback
    junction = { x: currentWall.start.x, y: currentWall.start.y };
  }
  
  // Get directions for both walls (ensure they point AWAY from junction)
  let dir1, dir2;
  
  if (exactPointMatch(prevWall.end, junction)) {
    dir1 = getNormalizedDirection(prevWall.start, prevWall.end);
  } else {
    dir1 = getNormalizedDirection(prevWall.end, prevWall.start);
  }
  
  if (exactPointMatch(currentWall.start, junction)) {
    dir2 = getNormalizedDirection(currentWall.start, currentWall.end);
  } else {
    dir2 = getNormalizedDirection(currentWall.end, currentWall.start);
  }
  
  // Calculate perpendicular directions 
  const perp1 = { x: -dir1.y, y: dir1.x };
  const perp2 = { x: -dir2.y, y: dir2.x };
  
  // For "outside" corner we use original perp directions,
  // for "inside" we flip them
  const finalPerp1 = isOutside ? perp1 : { x: -perp1.x, y: -perp1.y };
  const finalPerp2 = isOutside ? perp2 : { x: -perp2.x, y: -perp2.y };
  
  // Calculate half-thickness for offset - no change needed here
  // as long as thickness is consistently in meters
  const halfThickness = thickness / 2;
  
  // Calculate the offset points for each wall
  const offPoint1 = {
    x: junction.x + finalPerp1.x * halfThickness,
    y: junction.y + finalPerp1.y * halfThickness
  };
  
  const offPoint2 = {
    x: junction.x + finalPerp2.x * halfThickness,
    y: junction.y + finalPerp2.y * halfThickness
  };
  
  // Calculate the intersection of the two offset lines
  // Check for nearly parallel lines (avoid division by zero)
  const cross = dir1.x * dir2.y - dir1.y * dir2.x;
  if (Math.abs(cross) < 0.01) {
    // Lines are nearly parallel, use the midpoint of the offset points
    return {
      x: (offPoint1.x + offPoint2.x) / 2,
      y: (offPoint1.y + offPoint2.y) / 2
    };
  }
  
  // Calculate intersection
  const dx = offPoint2.x - offPoint1.x;
  const dy = offPoint2.y - offPoint1.y;
  
  const t = (dx * dir2.y - dy * dir2.x) / cross;
  
  // Calculate the intersection point
  const intersectionPoint = {
    x: offPoint1.x + dir1.x * t,
    y: offPoint1.y + dir1.y * t
  };
  
  // Check if the intersection point is too far
  const distToJunction = Math.sqrt(
    Math.pow(intersectionPoint.x - junction.x, 2) + 
    Math.pow(intersectionPoint.y - junction.y, 2)
  );
  
  // If distance is too large (more than 5x the thickness), use a controlled point
  if (distToJunction > halfThickness * 10) {
    // Calculate a bisector direction
    const bisector = {
      x: finalPerp1.x + finalPerp2.x,
      y: finalPerp1.y + finalPerp2.y
    };
    
    // Normalize the bisector
    const bisectorLength = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y);
    if (bisectorLength < 0.0001) {
      // If bisector is too small, use midpoint
      return {
        x: (offPoint1.x + offPoint2.x) / 2,
        y: (offPoint1.y + offPoint2.y) / 2
      };
    }
    
    const normalizedBisector = {
      x: bisector.x / bisectorLength,
      y: bisector.y / bisectorLength
    };
    
    // Use a capped distance
    return {
      x: junction.x + normalizedBisector.x * halfThickness * 5,
      y: junction.y + normalizedBisector.y * halfThickness * 5
    };
  }
  
  return intersectionPoint;
};

export const buildWallPolygon = (wall, allWalls) => {
  const { start, end, thickness } = wall;
 
  if (!start || !end) return null;
  
  // Calculate wall length
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const wallLength = Math.hypot(dx, dy);
  
  // Check for the case of preview wall that might not be in allWalls yet
  const wallsToCheck = allWalls.some(w => w === wall) ? allWalls : [...allWalls, wall];
  
  // More robust connection detection - check both directions for better connectivity
  const prevWalls = wallsToCheck.filter(w => 
    w !== wall && (
      exactPointMatch(w.end, wall.start) || 
      exactPointMatch(w.start, wall.start) ||
      (wall.originalStart && (
        exactPointMatch(w.end, wall.originalStart) || 
        exactPointMatch(w.start, wall.originalStart)
      ))
    )
  );
  
  const nextWalls = wallsToCheck.filter(w => 
    w !== wall && (
      exactPointMatch(w.start, wall.end) || 
      exactPointMatch(w.end, wall.end) ||
      (wall.originalEnd && (
        exactPointMatch(w.start, wall.originalEnd) || 
        exactPointMatch(w.end, wall.originalEnd)
      ))
    )
  );
  
  // HANDLE VERY SHORT WALLS
  let offset;
  if (wallLength < 0.001) { // Less than 2cm
    // For preview walls that are too short, create a special offset
    // This will prevent the "pencil tip" effect at junctions
    offset = {
      dx: 0,
      dy: thickness / 2
    };
  } else {
    // Normal offset calculation for regular walls
    offset = getPerpendicularOffset(start, end, thickness);
  }
  
  // Points for a simple rectangle (when no connections)
  let line1Start = { x: start.x + offset.dx, y: start.y + offset.dy };
  let line1End = { x: end.x + offset.dx, y: end.y + offset.dy };
  let line2Start = { x: start.x - offset.dx, y: start.y - offset.dy };
  let line2End = { x: end.x - offset.dx, y: end.y - offset.dy };
  
  // Handle start point (miter with previous wall if exists)
  if (prevWalls.length > 0 && wallLength >= 0.02) { // Only miter if wall has real length
    // Use the "closest" previous wall for mitering (in case of multiple)
    const prevWall = prevWalls[0];
    
    // Calculate mitered points for both sides (outside and inside corner)
    const outsideCorner = getMiteredCornerPoint(prevWall, wall, thickness, true);
    const insideCorner = getMiteredCornerPoint(prevWall, wall, thickness, false);
    
    if (outsideCorner && insideCorner) {
      // Update the appropriate start points
      line1Start = outsideCorner;
      line2Start = insideCorner;
    }
  }
  
  // Handle end point (miter with next wall if exists)
  if (nextWalls.length > 0 && wallLength >= 0.02) { // Only miter if wall has real length
    // Use the "closest" next wall for mitering (in case of multiple)
    const nextWall = nextWalls[0];
    
    // Calculate mitered points for both sides (outside and inside corner)
    const outsideCorner = getMiteredCornerPoint(wall, nextWall, thickness, true);
    const insideCorner = getMiteredCornerPoint(wall, nextWall, thickness, false);
    
    if (outsideCorner && insideCorner) {
      // Update the appropriate end points
      line1End = outsideCorner;
      line2End = insideCorner;
    }
  }
  console.log("Polygon Points:", {
  line1Start, line1End, line2Start, line2End
});

  
  return {
    line1Start,
    line1End,
    line2Start,
    line2End
  };
};