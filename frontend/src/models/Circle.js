// src/models/Circle.js
export default class Circle {
  constructor(center, radius, id = Date.now().toString()) {
    this.center = { ...center };
    this.radius = radius; // In meters
    this.id = id;
    
    // For area calculation
    this.area = Math.PI * radius * radius;
    
    // For circumference calculation
    this.circumference = 2 * Math.PI * radius;
  }
  
  updateCenter(newCenter) {
    this.center = { ...newCenter };
  }
  
  updateRadius(newRadius) {
    this.radius = newRadius;
    
    // Update derived measurements
    this.area = Math.PI * newRadius * newRadius;
    this.circumference = 2 * Math.PI * newRadius;
  }
  
  // Helper method to check if a point is inside the circle
  containsPoint(point) {
    const dx = point.x - this.center.x;
    const dy = point.y - this.center.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared <= this.radius * this.radius;
  }
  
  // Get bounding box for culling
  getBounds() {
    return {
      minX: this.center.x - this.radius,
      minY: this.center.y - this.radius,
      maxX: this.center.x + this.radius,
      maxY: this.center.y + this.radius
    };
  }
}