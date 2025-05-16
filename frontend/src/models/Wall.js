// src/models/Wall.js
export default class Wall {
  constructor(start, end, thickness = 1.0, id = Date.now().toString()) {
    this.start = { ...start };
    this.end = { ...end };
    this.thickness = thickness; // In meters
    this.id = id;
    this.originalStart = { ...start };
    this.originalEnd = { ...end };
   
    // Calculate length
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    this.length = Math.hypot(dx, dy);
  }
  
    updateEnd(newEnd) {
      this.end = { ...newEnd };
      this.originalEnd = { ...newEnd };
      
      // Recalculate length
      const dx = this.end.x - this.start.x;
      const dy = this.end.y - this.start.y;
      this.length = Math.hypot(dx, dy);
    }
    
    updateStart(newStart) {
      this.start = { ...newStart };
      this.originalStart = { ...newStart };
      
      // Recalculate length
      const dx = this.end.x - this.start.x;
      const dy = this.end.y - this.start.y;
      this.length = Math.hypot(dx, dy);
    }
    
    updatePosition(newStart, newEnd) {
      this.start = { ...newStart };
      this.end = { ...newEnd };
      this.originalStart = { ...newStart };
      this.originalEnd = { ...newEnd };
      
      // Recalculate length
      const dx = this.end.x - this.start.x;
      const dy = this.end.y - this.start.y;
      this.length = Math.hypot(dx, dy);
    }
  }