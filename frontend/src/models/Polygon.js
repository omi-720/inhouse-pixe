// src/models/Polygon.js
export default class Polygon {
  constructor(id = Date.now().toString()) {
    this.points = []; // Array of {x, y} points
    this.id = id;
    this.isClosed = false;
    this.area = 0;
    this.perimeter = 0;
  }
  
  addPoint(point) {
    this.points.push({ ...point });
    this.updateMeasurements();
    return this.points.length - 1; // Return index of the added point
  }
  
  updatePoint(index, newPoint) {
    if (index >= 0 && index < this.points.length) {
      this.points[index] = { ...newPoint };
      this.updateMeasurements();
    }
  }
  
  removePoint(index) {
    if (index >= 0 && index < this.points.length) {
      this.points.splice(index, 1);
      this.updateMeasurements();
    }
  }
  
  closePolygon() {
    if (this.points.length >= 3) {
      this.isClosed = true;
      this.updateMeasurements();
    }
    return this.isClosed;
  }
  
  updateMeasurements() {
    this.calculatePerimeter();
    this.calculateArea();
  }
  
  calculatePerimeter() {
    let perimeter = 0;
    const pointCount = this.points.length;
    
    if (pointCount < 2) {
      this.perimeter = 0;
      return;
    }
    
    for (let i = 0; i < pointCount; i++) {
      const current = this.points[i];
      const next = this.points[(i + 1) % pointCount];
      
      // For non-closed polygons, don't calculate the last segment
      if (!this.isClosed && i === pointCount - 1) {
        break;
      }
      
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    this.perimeter = perimeter;
  }
  
  calculateArea() {
    // Only calculate area for closed polygons
    if (!this.isClosed || this.points.length < 3) {
      this.area = 0;
      return;
    }
    
    // Use the Shoelace formula to calculate the area
    let area = 0;
    const pointCount = this.points.length;
    
    for (let i = 0; i < pointCount; i++) {
      const current = this.points[i];
      const next = this.points[(i + 1) % pointCount];
      
      area += current.x * next.y - next.x * current.y;
    }
    
    // Take the absolute value and divide by 2
    this.area = Math.abs(area) / 2;
  }
  
  // Helper method to check if a point is inside the polygon
  // Uses the ray casting algorithm
  containsPoint(point) {
    if (!this.isClosed || this.points.length < 3) {
      return false;
    }
    
    let inside = false;
    const x = point.x;
    const y = point.y;
    
    for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
      const xi = this.points[i].x;
      const yi = this.points[i].y;
      const xj = this.points[j].x;
      const yj = this.points[j].y;
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        
      if (intersect) inside = !inside;
    }
    
    return inside;
  }
  
  // Get bounding box for culling
  getBounds() {
    if (this.points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    let minX = this.points[0].x;
    let minY = this.points[0].y;
    let maxX = this.points[0].x;
    let maxY = this.points[0].y;
    
    this.points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
    
    return { minX, minY, maxX, maxY };
  }
}