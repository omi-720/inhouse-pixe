// src/tools/ArcSelectTool.js
import { pixelsToMeters } from '../core/geometry/MeasurementUtils';
import { ModifyArcCommand, DeleteArcCommand } from '../core/history/Commands';

export default class ArcSelectTool {
  constructor(pixiRenderer, arcRenderer, arcs, historyManager) {
    this.pixiRenderer = pixiRenderer;
    this.arcRenderer = arcRenderer;
    this.arcs = arcs || [];
    this.active = false;
    this.selectedObject = null;
    this.draggingPart = null; // 'center', 'start', 'end', or 'radius'
    this.lastMousePosition = null;
    this.selectionThreshold = pixelsToMeters(15); // Distance threshold in meters
    this.historyManager = historyManager;
    
    // Selection change callback
    this.onSelectionChange = null;
    
    // Bind methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }
  
  setArcs(arcs) {
    this.arcs = arcs;
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
    // If Delete key is pressed, delete selected arc
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedObject) {
      e.preventDefault();
      this.deleteSelectedArc();
    }
  }
  
  onMouseDown(e) {
    if (!this.active) return;
    
    // Use the getWorldMousePosition method from PixiRenderer
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    
    // Check if clicked near a control point of the selected arc
    if (this.selectedObject) {
      const arc = this.selectedObject.object;
      
      // Check distance to center
      const distToCenter = Math.hypot(worldPos.x - arc.center.x, worldPos.y - arc.center.y);
      
      if (distToCenter < this.selectionThreshold) {
        this.draggingPart = 'center';
        return;
      }
      
      // Get endpoints
      const endpoints = arc.getEndpoints();
      
      // Check distance to start point
      const distToStart = Math.hypot(worldPos.x - endpoints.start.x, worldPos.y - endpoints.start.y);
      
      if (distToStart < this.selectionThreshold) {
        this.draggingPart = 'start';
        return;
      }
      
      // Check distance to end point
      const distToEnd = Math.hypot(worldPos.x - endpoints.end.x, worldPos.y - endpoints.end.y);
      
      if (distToEnd < this.selectionThreshold) {
        this.draggingPart = 'end';
        return;
      }
      
      // Check if clicking on the arc itself (for radius adjustment)
      if (arc.isPointNear(worldPos, this.selectionThreshold)) {
        this.draggingPart = 'radius';
        return;
      }
    }
    
    // Try to select an arc
    const selectedArc = this.findArcNearPoint(worldPos);
    
    // Update selection
    if (selectedArc) {
      this.selectObject(selectedArc);
    } else {
      this.clearSelection();
    }
    
    // Render with the selected arc
    if (this.arcRenderer) {
      this.arcRenderer.render(
        this.arcs, 
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
    
    // If we're dragging a part of the selected arc
    if (this.selectedObject && this.draggingPart && e.buttons === 1) {
      const arc = this.selectedObject.object;
      
      // Handle different dragging operations
      switch (this.draggingPart) {
        case 'center':
          this.handleCenterDrag(arc, worldPos);
          break;
        case 'start':
          this.handleStartDrag(arc, worldPos);
          break;
        case 'end':
          this.handleEndDrag(arc, worldPos);
          break;
        case 'radius':
          this.handleRadiusDrag(arc, worldPos);
          break;
      }
    }
    
    // Render arcs with hover position for highlighting
    if (this.arcRenderer) {
      this.arcRenderer.render(
        this.arcs, 
        null, 
        worldPos,
        this.selectedObject ? this.selectedObject.object : null
      );
    }
  }
  
  onMouseUp(e) {
    if (!this.active) return;
    
    // Reset dragging state
    this.draggingPart = null;
  }
  
  // Handle dragging the center of the arc
  handleCenterDrag(arc, newPosition) {
    // Store old values for undo
    const oldCenter = { ...arc.center };
    const newCenter = { ...newPosition };
    
    // Skip if the center hasn't moved significantly
    if (Math.abs(oldCenter.x - newCenter.x) < 0.001 && 
        Math.abs(oldCenter.y - newCenter.y) < 0.001) {
      return;
    }
    
    // Create and execute a command for the center movement
    if (this.historyManager) {
      const command = new ModifyArcCommand(
        this, 
        arc, 
        'center', 
        oldCenter, 
        newCenter
      );
      this.historyManager.executeCommand(command);
    } else {
      // Simple direct update without history
      arc.updateCenter(newCenter);
    }
  }
  
  // Handle dragging the start point of the arc
  handleStartDrag(arc, newPosition) {
    // Calculate angle from center to new position
    const dx = newPosition.x - arc.center.x;
    const dy = newPosition.y - arc.center.y;
    const newStartAngle = Math.atan2(dy, dx);
    
    // Store old values for undo
    const oldStartAngle = arc.startAngle;
    const oldEndAngle = arc.endAngle;
    
    // Skip if the angle hasn't changed significantly
    if (Math.abs(oldStartAngle - newStartAngle) < 0.001) {
      return;
    }
    
    // Create and execute a command for the angle change
    if (this.historyManager) {
      const command = new ModifyArcCommand(
        this, 
        arc, 
        'angles', 
        { startAngle: oldStartAngle, endAngle: oldEndAngle }, 
        { startAngle: newStartAngle, endAngle: oldEndAngle }
      );
      this.historyManager.executeCommand(command);
    } else {
      // Simple direct update without history
      arc.updateAngles(newStartAngle, arc.endAngle);
    }
  }
  
  // Handle dragging the end point of the arc
  handleEndDrag(arc, newPosition) {
    // Calculate angle from center to new position
    const dx = newPosition.x - arc.center.x;
    const dy = newPosition.y - arc.center.y;
    const newEndAngle = Math.atan2(dy, dx);
    
    // Store old values for undo
    const oldStartAngle = arc.startAngle;
    const oldEndAngle = arc.endAngle;
    
    // Skip if the angle hasn't changed significantly
    if (Math.abs(oldEndAngle - newEndAngle) < 0.001) {
      return;
    }
    
    // Create and execute a command for the angle change
    if (this.historyManager) {
      const command = new ModifyArcCommand(
        this, 
        arc, 
        'angles', 
        { startAngle: oldStartAngle, endAngle: oldEndAngle }, 
        { startAngle: oldStartAngle, endAngle: newEndAngle }
      );
      this.historyManager.executeCommand(command);
    } else {
      // Simple direct update without history
      arc.updateAngles(arc.startAngle, newEndAngle);
    }
  }
  
  // Handle dragging to change the radius
  handleRadiusDrag(arc, newPosition) {
    // Calculate distance from center to new position
    const dx = newPosition.x - arc.center.x;
    const dy = newPosition.y - arc.center.y;
    const newRadius = Math.hypot(dx, dy);
    
    // Store old value for undo
    const oldRadius = arc.radius;
    
    // Skip if the radius hasn't changed significantly
    if (Math.abs(oldRadius - newRadius) < 0.001) {
      return;
    }
    
    // Create and execute a command for the radius change
    if (this.historyManager) {
      const command = new ModifyArcCommand(
        this, 
        arc, 
        'radius', 
        oldRadius, 
        newRadius
      );
      this.historyManager.executeCommand(command);
    } else {
      // Simple direct update without history
      arc.updateRadius(newRadius);
    }
  }
  
  // Find the arc closest to a point
  findArcNearPoint(point) {
    if (!this.arcs || !this.arcs.length) return null;
    
    let closestArc = null;
    let minDistance = this.selectionThreshold;
    
    this.arcs.forEach(arc => {
      // Check if the point is near this arc
      if (arc.isPointNear(point, this.selectionThreshold)) {
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
  
  selectObject(object) {
    if (object === this.selectedObject) return;
    
    this.selectedObject = {
      type: 'arc',
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
    this.draggingPart = null;
    
    if (hadSelection && this.onSelectionChange) {
      this.onSelectionChange(null);
    }
  }
  
  // Update selected arc properties
  updateSelectedObject(property, value) {
    if (!this.selectedObject) return;
    
    const arc = this.selectedObject.object;
    
    // Store old value for undo
    const oldValue = arc[property];
    
    // Create a command for the property change
    if (this.historyManager) {
      const command = new ModifyArcCommand(
        this, 
        arc, 
        property, 
        oldValue, 
        value
      );
      this.historyManager.executeCommand(command);
    } else {
      // Simple direct update without history
      arc[property] = value;
      
      // If updating thickness, ensure measurements are recalculated
      if (property === 'radius') {
        arc.updateMeasurements();
      }
    }
    
    // Let the sidebar know about the change
    if (this.onSelectionChange) {
      // Create a new object reference to trigger React update
      this.onSelectionChange({ 
        ...this.selectedObject
      });
    }
    
    // Update renderer
    this.renderSelectedArc();
  }
  
  // Delete the selected arc
  deleteSelectedArc() {
    if (!this.selectedObject) return;
    
    const arc = this.selectedObject.object;
    
    // Create and execute a DeleteArcCommand
    if (this.historyManager) {
      const command = new DeleteArcCommand(this, arc);
      this.historyManager.executeCommand(command);
    } else {
      // Fallback implementation
      const arcIndex = this.arcs.findIndex(a => a.id === arc.id);
      
      if (arcIndex !== -1) {
        // Remove the arc from the array
        this.arcs.splice(arcIndex, 1);
        
        // Clear selection
        this.clearSelection();
        
        // Update renderer
        this.renderSelectedArc();
      }
    }
  }
  
  renderSelectedArc() {
    // Update the arc's appearance after modifying its properties
    if (this.arcRenderer) {
      this.arcRenderer.render(
        this.arcs, 
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