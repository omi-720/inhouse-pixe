// src/models/ZoneDivider.js
export default class ZoneDivider {
  constructor(start, end, thickness = 0.05, id = Date.now().toString()) {
    this.start = { ...start };
    this.end = { ...end };
    this.thickness = thickness; // Default 5cm thickness in meters
    this.id = id;
    this.zoneId = null; // ID of the zone this divider belongs to
    this.color = 0x333333; // Dark gray by default
    this.dashPattern = [0.2, 0.1]; // 20cm dash, 10cm gap
    this.isDashed = true; // Dashed by default
    
    // Calculate length
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    this.length = Math.hypot(dx, dy);
    
    // Calculate angle in radians
    this.angle = Math.atan2(dy, dx);
  }
  
  updateEnd(newEnd) {
    this.end = { ...newEnd };
    
    // Recalculate length and angle
    const dx = this.end.x - this.start.x;
    const dy = this.end.y - this.start.y;
    this.length = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);
  }
  
  updateStart(newStart) {
    this.start = { ...newStart };
    
    // Recalculate length and angle
    const dx = this.end.x - this.start.x;
    const dy = this.end.y - this.start.y;
    this.length = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);
  }
  
  updatePosition(newStart, newEnd) {
    this.start = { ...newStart };
    this.end = { ...newEnd };
    
    // Recalculate length and angle
    const dx = this.end.x - this.start.x;
    const dy = this.end.y - this.start.y;
    this.length = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);
  }
  
  // Set the zone this divider belongs to
  setZoneId(zoneId) {
    this.zoneId = zoneId;
  }
  
  // Get bounding box for culling
  getBounds() {
    const padding = this.thickness / 2;
    return {
      minX: Math.min(this.start.x, this.end.x) - padding,
      minY: Math.min(this.start.y, this.end.y) - padding,
      maxX: Math.max(this.start.x, this.end.x) + padding,
      maxY: Math.max(this.start.y, this.end.y) + padding
    };
  }
  
  // Check if point is near this divider
  isPointNear(point, threshold = 0.1) {
    return this.distanceToPoint(point) < threshold;
  }
  
  // Calculate distance from a point to this divider
  distanceToPoint(point) {
    const dx = this.end.x - this.start.x;
    const dy = this.end.y - this.start.y;
    const lineLengthSq = dx * dx + dy * dy;
    
    if (lineLengthSq === 0) {
      // Divider is a point
      return Math.hypot(point.x - this.start.x, point.y - this.start.y);
    }
    
    // Calculate projection onto line
    const t = Math.max(0, Math.min(1, 
      ((point.x - this.start.x) * dx + (point.y - this.start.y) * dy) / lineLengthSq
    ));
    
    // Calculate closest point on line
    const closestX = this.start.x + t * dx;
    const closestY = this.start.y + t * dy;
    
    // Return distance to closest point
    return Math.hypot(point.x - closestX, point.y - closestY);
  }
}