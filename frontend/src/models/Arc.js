// src/models/Arc.js
export default class Arc {
  constructor(center, startAngle, endAngle, radius, id = Date.now().toString()) {
    this.center = { ...center };
    this.startAngle = startAngle; // In radians
    this.endAngle = endAngle; // In radians
    this.radius = radius; // In meters
    this.id = id;
    this.thickness = 0.05; // Default 5cm thickness in meters
    this.color = 0x0000FF; // Blue by default
    
    // Ensure angles are in the range [0, 2π]
    this.normalizeAngles();
    
    // Calculate arc length
    this.updateMeasurements();
  }
  
  normalizeAngles() {
    const TWO_PI = Math.PI * 2;
    
    // Normalize both angles to [0, 2π] range
    this.startAngle = ((this.startAngle % TWO_PI) + TWO_PI) % TWO_PI;
    this.endAngle = ((this.endAngle % TWO_PI) + TWO_PI) % TWO_PI;
    
    // If angles are equal, make it a full circle
    if (Math.abs(this.startAngle - this.endAngle) < 0.0001) {
      this.endAngle = this.startAngle + TWO_PI;
    }
    
    // If endAngle is less than startAngle, add 2π to make it always draw counter-clockwise
    if (this.endAngle < this.startAngle) {
      this.endAngle += TWO_PI;
    }
  }
  
  updateCenter(newCenter) {
    this.center = { ...newCenter };
    this.updateMeasurements();
  }
  
  updateRadius(newRadius) {
    this.radius = newRadius;
    this.updateMeasurements();
  }
  
  updateAngles(startAngle, endAngle) {
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.normalizeAngles();
    this.updateMeasurements();
  }
  
  updateMeasurements() {
    // Calculate arc length: r * (endAngle - startAngle)
    this.arcLength = this.radius * Math.abs(this.endAngle - this.startAngle);
    
    // Calculate chord length: 2 * r * sin((endAngle - startAngle) / 2)
    const angleDiff = Math.abs(this.endAngle - this.startAngle);
    this.chordLength = 2 * this.radius * Math.sin(angleDiff / 2);
    
    // Calculate area of sector: (r^2 * (endAngle - startAngle)) / 2
    this.sectorArea = (this.radius * this.radius * angleDiff) / 2;
  }
  
  // Get the point at a specific angle on the arc
  getPointAtAngle(angle) {
    // Normalize the angle
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    
    // Check if the angle is within the arc's range
    let inRange = false;
    
    // Handle the case where the arc crosses the 0/2π boundary
    if (this.startAngle <= this.endAngle) {
      inRange = normalizedAngle >= this.startAngle && normalizedAngle <= this.endAngle;
    } else {
      inRange = normalizedAngle >= this.startAngle || normalizedAngle <= this.endAngle;
    }
    
    if (!inRange) {
      return null; // Angle is not within the arc's range
    }
    
    // Calculate the point
    return {
      x: this.center.x + this.radius * Math.cos(angle),
      y: this.center.y + this.radius * Math.sin(angle)
    };
  }
  
  // Get the start and end points of the arc
  getEndpoints() {
    return {
      start: {
        x: this.center.x + this.radius * Math.cos(this.startAngle),
        y: this.center.y + this.radius * Math.sin(this.startAngle)
      },
      end: {
        x: this.center.x + this.radius * Math.cos(this.endAngle),
        y: this.center.y + this.radius * Math.sin(this.endAngle)
      }
    };
  }
  
  // Check if a point is near this arc
  isPointNear(point, threshold = 0.1) {
    // Calculate distance from point to center
    const dx = point.x - this.center.x;
    const dy = point.y - this.center.y;
    const distanceToCenter = Math.hypot(dx, dy);
    
    // Check if the distance to the center is close to the radius
    const distanceToArc = Math.abs(distanceToCenter - this.radius);
    if (distanceToArc > threshold) {
      return false; // Point is not near the arc's radius
    }
    
    // Calculate the angle of the point relative to the center
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2; // Normalize to [0, 2π]
    
    // Check if the angle is within the arc's range
    if (this.startAngle <= this.endAngle) {
      return angle >= this.startAngle && angle <= this.endAngle;
    } else {
      // Arc crosses the 0/2π boundary
      return angle >= this.startAngle || angle <= this.endAngle;
    }
  }
  
  // Get bounding box for culling
  getBounds() {
    // For simplicity, we'll use a bounding box that encompasses the entire circle
    // and refine this later if needed for performance
    return {
      minX: this.center.x - this.radius - this.thickness/2,
      minY: this.center.y - this.radius - this.thickness/2,
      maxX: this.center.x + this.radius + this.thickness/2,
      maxY: this.center.y + this.radius + this.thickness/2
    };
  }
}