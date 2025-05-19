// src/tools/CircleTool.js
import Circle from '../models/Circle';
import { AddCircleCommand } from '../core/history/Commands';

export default class CircleTool {
  constructor(pixiRenderer, circleRenderer, historyManager = null) {
    this.pixiRenderer = pixiRenderer;
    this.circleRenderer = circleRenderer;
    this.circles = [];
    this.currentCircle = null;
    this.active = false;
    this.isDrawing = false;
    this.startPoint = null;
    this.mousePosition = null;
    this.onCircleAdded = null;
    this.historyManager = historyManager;
    this.outlineRenderer = null;
    
    // Snap settings
    this.snapThreshold = 0.01; // 1cm snap threshold in meters
    
    // Bind methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    
    console.log('CircleTool initialized');
  }
  
  activate() {
    this.active = true;
    this.setupEventListeners();
    console.log('CircleTool activated');
  }
  
  deactivate() {
    this.active = false;
    this.removeEventListeners();
    this.cancelDrawing();
    console.log('CircleTool deactivated');
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
    // If ESC key is pressed, cancel circle drawing
    if (e.keyCode === 27 || e.key === 'Escape') {
      this.cancelDrawing();
    }
  }
  
  cancelDrawing() {
    // Reset all drawing state
    this.isDrawing = false;
    this.startPoint = null;
    this.currentCircle = null;
    
    // Update renderer to clear preview
    if (this.circleRenderer) {
      this.circleRenderer.render(this.circles, null, this.mousePosition);
    }
    
    if (this.outlineRenderer) {
      this.outlineRenderer.render(this.circles, null);
    }
  }
  
  onMouseDown(e) {
    if (!this.active) return;
    
    // Get current mouse world position (already in meters)
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) return;
    
    // If we're already drawing, finish the circle
    if (this.isDrawing && this.currentCircle) {
      this.isDrawing = false;
      
      // Add the circle to history manager or directly to the array
      if (this.historyManager) {
        const command = new AddCircleCommand(this, this.currentCircle);
        this.historyManager.executeCommand(command);
      } else {
        this.circles.push(this.currentCircle);
      }
      
      // Call the callback to notify that a circle was added
      if (this.onCircleAdded) {
        this.onCircleAdded(this.currentCircle);
      }
      
      // Reset state for next circle
      this.currentCircle = null;
      this.startPoint = null;
      
      // Update renderer
      this.circleRenderer.render(this.circles, null, this.mousePosition);
      
      if (this.outlineRenderer) {
        this.outlineRenderer.render(this.circles, null);
      }
      
      return;
    }
    
    // Start drawing a new circle
    this.isDrawing = true;
    this.startPoint = { ...worldPos };
    
    // Create a circle with zero radius initially
    this.currentCircle = new Circle(this.startPoint, 0);
    
    // Update renderer with preview
    this.circleRenderer.render(this.circles, this.currentCircle, this.mousePosition);
  }
  
  onMouseMove(e) {
    if (!this.active) return;
    
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) return;
    
    // Store mouse position for hover effects
    this.mousePosition = { ...worldPos };
    
    // If we're not drawing, just update the renderer for hover effects
    if (!this.isDrawing || !this.startPoint) {
      this.circleRenderer.render(this.circles, null, this.mousePosition);
      return;
    }
    
    // Calculate radius based on distance from center
    const dx = worldPos.x - this.startPoint.x;
    const dy = worldPos.y - this.startPoint.y;
    const radius = Math.sqrt(dx * dx + dy * dy);
    
    // Update the current circle
    if (this.currentCircle) {
      this.currentCircle.updateRadius(radius);
      
      // Update renderer with preview
      this.circleRenderer.render(this.circles, this.currentCircle, this.mousePosition);
      
      if (this.outlineRenderer) {
        const allCircles = [...this.circles, this.currentCircle].filter(Boolean);
        this.outlineRenderer.render(allCircles, null);
      }
    }
  }
  
  onMouseUp(e) {
    if (!this.active || !this.isDrawing) return;
    
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) return;
    
    // If radius is too small, just cancel the drawing
    if (this.currentCircle && this.currentCircle.radius < 0.01) { // Less than 1cm
      this.cancelDrawing();
      return;
    }
    
    // Finalize the circle
    if (this.currentCircle) {
      // Calculate final radius
      const dx = worldPos.x - this.startPoint.x;
      const dy = worldPos.y - this.startPoint.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      
      this.currentCircle.updateRadius(radius);
      
      // Add the circle to history manager or directly to the array
      if (this.historyManager) {
        const command = new AddCircleCommand(this, this.currentCircle);
        this.historyManager.executeCommand(command);
      } else {
        this.circles.push(this.currentCircle);
      }
      
      // Call the callback to notify that a circle was added
      if (this.onCircleAdded) {
        this.onCircleAdded(this.currentCircle);
      }
    }
    
    // Reset state for next circle
    this.isDrawing = false;
    this.startPoint = null;
    this.currentCircle = null;
    
    // Update renderer
    this.circleRenderer.render(this.circles, null, this.mousePosition);
    
    if (this.outlineRenderer) {
      this.outlineRenderer.render(this.circles, null);
    }
  }
  
  // Find the nearest circle to a point
  findCircleNearPoint(point, threshold = 0.1) {
    if (!this.circles || !this.circles.length) return null;
    
    for (const circle of this.circles) {
      const dx = point.x - circle.center.x;
      const dy = point.y - circle.center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if point is near the circle's edge
      const edgeDistance = Math.abs(distance - circle.radius);
      if (edgeDistance < threshold) {
        return circle;
      }
    }
    
    return null;
  }
  
  destroy() {
    this.deactivate();
  }
}