// src/tools/ArcTool.js
import Arc from '../models/Arc';
import { AddArcCommand } from '../core/history/Commands';

export default class ArcTool {
  constructor(pixiRenderer, arcRenderer, historyManager = null) {
    this.pixiRenderer = pixiRenderer;
    this.arcRenderer = arcRenderer;
    this.arcs = [];
    this.currentArc = null;
    this.active = false;
    this.drawingStage = 0; // 0: not drawing, 1: center set, 2: radius set
    this.mousePosition = null;
    this.centerPoint = null;
    this.startPoint = null;
    this.onArcAdded = null;
    this.historyManager = historyManager;
    
    // Default properties
    this.defaultThickness = 0.05; // 5cm thickness
    
    // Bind methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    
    console.log('ArcTool initialized');
  }
  
  activate() {
    this.active = true;
    this.setupEventListeners();
    console.log('ArcTool activated');
  }
  
  deactivate() {
    this.active = false;
    this.removeEventListeners();
    this.cancelDrawing();
    console.log('ArcTool deactivated');
  }
  
  setupEventListeners() {
    const canvas = this.pixiRenderer.app.canvas;
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyDown);
  }
  
  removeEventListeners() {
    const canvas = this.pixiRenderer.app.canvas;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
  }
  
  onKeyDown(e) {
    // If ESC key is pressed, cancel arc drawing
    if (e.keyCode === 27 || e.key === 'Escape') {
      this.cancelDrawing();
    }
  }
  
  cancelDrawing() {
    // Reset all drawing state
    this.drawingStage = 0;
    this.centerPoint = null;
    this.startPoint = null;
    this.currentArc = null;
    
    // Update renderer to clear preview
    if (this.arcRenderer) {
      this.arcRenderer.render(this.arcs, null, this.mousePosition);
    }
  }
  
  onMouseDown(e) {
    if (!this.active) return;
    
    // Get current mouse world position
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) return;
    
    // Drawing process has three stages:
    // 1. Set center
    // 2. Set radius/start angle
    // 3. Set end angle
    
    switch (this.drawingStage) {
      case 0: // Set center
        this.centerPoint = { ...worldPos };
        this.drawingStage = 1;
        break;
        
      case 1: // Set radius and start angle
        // Calculate distance from center (radius)
        const dx = worldPos.x - this.centerPoint.x;
        const dy = worldPos.y - this.centerPoint.y;
        const radius = Math.hypot(dx, dy);
        
        // Minimum radius check
        if (radius < 0.01) { // 1cm minimum
          console.log('Radius must be at least 1cm');
          return;
        }
        
        // Calculate start angle
        const startAngle = Math.atan2(dy, dx);
        
        // Initialize the arc with end angle equal to start angle + a small amount
        // This creates a very small arc initially
        this.currentArc = new Arc(this.centerPoint, startAngle, startAngle + 0.01, radius);
        this.currentArc.thickness = this.defaultThickness;
        
        // Store start point for reference
        this.startPoint = { ...worldPos };
        
        // Advance to next stage
        this.drawingStage = 2;
        break;
        
      case 2: // Set end angle and finalize arc
        if (!this.currentArc) {
          this.cancelDrawing();
          return;
        }
        
        // Calculate angle from center to current point
        const endDx = worldPos.x - this.centerPoint.x;
        const endDy = worldPos.y - this.centerPoint.y;
        const endAngle = Math.atan2(endDy, endDx);
        
        // Update the arc's end angle
        this.currentArc.updateAngles(this.currentArc.startAngle, endAngle);
        
        // Check for minimum arc length (at least 5 degrees)
        const angleDiff = Math.abs(this.currentArc.endAngle - this.currentArc.startAngle);
        if (angleDiff < 0.09) { // About 5 degrees (0.09 radians)
          console.log('Arc angle must be at least 5 degrees');
          this.cancelDrawing();
          return;
        }
        
        // Add the arc to history manager or directly to the array
        if (this.historyManager) {
          const command = new AddArcCommand(this, this.currentArc);
          this.historyManager.executeCommand(command);
        } else {
          this.arcs.push(this.currentArc);
        }
        
        // Call the callback to notify that an arc was added
        if (this.onArcAdded) {
          this.onArcAdded(this.currentArc);
        }
        
        // Reset state for next arc
        this.drawingStage = 0;
        this.centerPoint = null;
        this.startPoint = null;
        this.currentArc = null;
        
        // Update renderer
        this.arcRenderer.render(this.arcs, null, this.mousePosition);
        break;
    }
  }
  
  onMouseMove(e) {
    if (!this.active) return;
    
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) return;
    
    // Store mouse position for hover effects
    this.mousePosition = { ...worldPos };
    
    // Preview arc based on current drawing stage
    switch (this.drawingStage) {
      case 0: // Not drawing, just show hover effects
        this.arcRenderer.render(this.arcs, null, this.mousePosition);
        break;
        
      case 1: // Center set, show radius preview
        if (this.centerPoint) {
          // Calculate radius
          const dx = worldPos.x - this.centerPoint.x;
          const dy = worldPos.y - this.centerPoint.y;
          const radius = Math.hypot(dx, dy);
          
          // Preview a full circle with this radius
          const previewArc = new Arc(
            this.centerPoint,
            0,
            2 * Math.PI,
            radius
          );
          previewArc.thickness = this.defaultThickness;
          
          // Render the preview
          this.arcRenderer.render(this.arcs, previewArc, this.mousePosition);
        }
        break;
        
      case 2: // Radius set, show arc preview
        if (this.currentArc && this.centerPoint) {
          // Calculate angle from center to current point
          const dx = worldPos.x - this.centerPoint.x;
          const dy = worldPos.y - this.centerPoint.y;
          const currentAngle = Math.atan2(dy, dx);
          
          // Create a temporary arc for preview
          const previewArc = new Arc(
            this.centerPoint,
            this.currentArc.startAngle,
            currentAngle,
            this.currentArc.radius
          );
          previewArc.thickness = this.defaultThickness;
          
          // Render the preview
          this.arcRenderer.render(this.arcs, previewArc, this.mousePosition);
        }
        break;
    }
  }
  
  onMouseUp(e) {
    // No special handling needed for mouse up
  }
  
  // Find the arc closest to a point
  findArcNearPoint(point, threshold = 0.1) {
    if (!this.arcs || !this.arcs.length) return null;
    
    let closestArc = null;
    let minDistance = threshold; // Only return arcs within threshold
    
    this.arcs.forEach(arc => {
      if (arc.isPointNear(point, threshold)) {
        // Calculate exact distance to the arc
        const dx = point.x - arc.center.x;
        const dy = point.y - arc.center.y;
        const distanceToCenter = Math.hypot(dx, dy);
        const distanceToArc = Math.abs(distanceToCenter - arc.radius);
        
        if (distanceToArc < minDistance) {
          minDistance = distanceToArc;
          closestArc = arc;
        }
      }
    });
    
    return closestArc;
  }
  
  setDefaultThickness(thickness) {
    this.defaultThickness = thickness;
  }
  
  destroy() {
    this.deactivate();
  }
}