// src/tools/CircleSelectTool.js
import { pixelsToMeters } from '../core/geometry/MeasurementUtils';
import { ModifyCircleCommand, DeleteCircleCommand } from '../core/history/Commands';

export default class CircleSelectTool {
  constructor(pixiRenderer, circleRenderer, circles, historyManager) {
    this.pixiRenderer = pixiRenderer;
    this.circleRenderer = circleRenderer;
    this.circles = circles || [];
    this.active = false;
    this.selectedObject = null;
    this.lastMousePosition = null;
    this.selectionThreshold = pixelsToMeters(15); // Distance threshold in meters
    this.historyManager = historyManager;
    
    // Selection change callback
    this.onSelectionChange = null;
    
    // Bind methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }
  
  setCircles(circles) {
    this.circles = circles;
  }
  
  setOnSelectionChange(callback) {
    this.onSelectionChange = callback;
  }
  
  activate() {
    this.active = true;
    this.setupEventListeners();
  }
  
  deactivate() {
    this.active = false;
    this.removeEventListeners();
    this.clearSelection();
  }
  
  setupEventListeners() {
    const canvas = this.pixiRenderer.app.canvas;
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
  }
  
  removeEventListeners() {
    const canvas = this.pixiRenderer.app.canvas;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
  }
  
  onMouseDown(e) {
    if (!this.active) return;
    
    // Use the getWorldMousePosition method from PixiRenderer
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    
    // Try to select a circle
    const selectedCircle = this.findCircleNearPoint(worldPos);
    
    // Update selection
    if (selectedCircle) {
      this.selectObject(selectedCircle);
    } else {
      this.clearSelection();
    }
    
    // Render with the selected circle
    if (this.circleRenderer) {
      this.circleRenderer.render(
        this.circles, 
        null, 
        worldPos,
        this.selectedObject ? this.selectedObject.object : null
      );
    }
  }
  
  onMouseMove(e) {
    if (!this.active) return;
    
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    // Store the position for later use
    this.lastMousePosition = worldPos;
    
    // Render circles with hover position for highlighting
    if (this.circleRenderer) {
      this.circleRenderer.render(
        this.circles, 
        null, 
        worldPos,
        this.selectedObject ? this.selectedObject.object : null
      );
    }
  }
  
  onMouseUp(e) {
    if (!this.active) return;
    // Nothing specific needed for now
  }
  
  // Find the closest circle to a point
  findCircleNearPoint(point) {
    if (!this.circles || !this.circles.length) return null;
    
    let closestCircle = null;
    let minDistance = Infinity;
    
    this.circles.forEach(circle => {
      const dx = point.x - circle.center.x;
      const dy = point.y - circle.center.y;
      const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate distance to the edge of the circle
      const distanceToEdge = Math.abs(distanceToCenter - circle.radius);
      
      // Check if point is within the threshold of the circle's edge
      if (distanceToEdge < this.selectionThreshold) {
        if (distanceToEdge < minDistance) {
          minDistance = distanceToEdge;
          closestCircle = circle;
        }
      }
    });
    
    return closestCircle;
  }
  
  selectObject(object) {
    if (object === this.selectedObject) return;
    
    this.selectedObject = {
      type: 'circle',
      object: object,
      id: object.id
    };
    
    if (this.onSelectionChange) {
      this.onSelectionChange(this.selectedObject);
    }
  }
  
  clearSelection() {
    const hadSelection = this.selectedObject !== null;
    this.selectedObject = null;
    
    if (hadSelection && this.onSelectionChange) {
      this.onSelectionChange(null);
    }
  }
  
  // Update selected object properties
  updateSelectedObject(property, value) {
    if (!this.selectedObject) return;
    
    const object = this.selectedObject.object;
    
    // Store old value for undo
    let oldValue;
    
    if (property === 'radius') {
      oldValue = object.radius;
      
      // Limit radius to sensible values
      if (value < 0.01) value = 0.01; // Minimum 1cm
      if (value > 1000) value = 1000; // Maximum 1km
    } else if (property === 'center') {
      oldValue = { ...object.center };
    }
    
    // Create and execute a ModifyCircleCommand
    if (this.historyManager) {
      const command = new ModifyCircleCommand(this, object, property, oldValue, value);
      this.historyManager.executeCommand(command);
    } else {
      // Fallback to original implementation
      if (property === 'radius') {
        object.updateRadius(value);
      } else if (property === 'center') {
        object.updateCenter(value);
      }
      
      // Update the circle's appearance
      this.renderSelectedCircle();
    }
    
    // Let the sidebar know about the change
    if (this.onSelectionChange) {
      // Create a new object reference to trigger React update
      this.onSelectionChange({ 
        ...this.selectedObject
      });
    }
  }
  
  deleteSelectedCircle() {
    if (!this.selectedObject) return;
    
    const circle = this.selectedObject.object;
    
    // Create and execute a DeleteCircleCommand
    if (this.historyManager) {
      const command = new DeleteCircleCommand(this, circle);
      this.historyManager.executeCommand(command);
    } else {
      // Fallback implementation
      const circleIndex = this.circles.findIndex(c => c.id === circle.id);
      
      if (circleIndex !== -1) {
        // Remove the circle from the array
        this.circles.splice(circleIndex, 1);
        
        // Clear selection
        this.clearSelection();
        
        // Update renderer
        this.renderSelectedCircle();
      }
    }
  }
  
  renderSelectedCircle() {
    // Update the circle's appearance after modifying its properties
    if (this.circleRenderer) {
      this.circleRenderer.render(
        this.circles, 
        null, 
        this.lastMousePosition,
        this.selectedObject ? this.selectedObject.object : null
      );
    }
  }
  
  destroy() {
    this.deactivate();
  }
}