// src/tools/ZoneDividerSelectTool.js
import { pixelsToMeters } from '../core/geometry/MeasurementUtils';
import { ModifyZoneDividerCommand, DeleteZoneDividerCommand } from '../core/history/Commands';

export default class ZoneDividerSelectTool {
  constructor(pixiRenderer, zoneDividerRenderer, dividers, historyManager) {
    this.pixiRenderer = pixiRenderer;
    this.zoneDividerRenderer = zoneDividerRenderer;
    this.dividers = dividers || [];
    this.active = false;
    this.selectedObject = null;
    this.draggingPoint = null; // 'start' or 'end' when dragging points
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
  
  setDividers(dividers) {
    this.dividers = dividers;
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
    // If Delete key is pressed, delete selected divider
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedObject) {
      e.preventDefault();
      this.deleteSelectedDivider();
    }
    
    // Toggle dashed/solid with 'D' key
    if (e.key === 'd' || e.key === 'D') {
      if (this.selectedObject) {
        const divider = this.selectedObject.object;
        this.updateSelectedObject('isDashed', !divider.isDashed);
      }
    }
  }
  
  onMouseDown(e) {
    if (!this.active) return;
    
    // Use the getWorldMousePosition method from PixiRenderer
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    
    // Check if clicked near an endpoint of the selected divider
    if (this.selectedObject) {
      const divider = this.selectedObject.object;
      
      // Check distance to start and end points
      const distToStart = Math.hypot(worldPos.x - divider.start.x, worldPos.y - divider.start.y);
      const distToEnd = Math.hypot(worldPos.x - divider.end.x, worldPos.y - divider.end.y);
      
      // If close to a point, start dragging it
      if (distToStart < this.selectionThreshold && distToStart < distToEnd) {
        this.draggingPoint = 'start';
        return;
      } else if (distToEnd < this.selectionThreshold) {
        this.draggingPoint = 'end';
        return;
      }
    }
    
    // Try to select a divider
    const selectedDivider = this.findDividerNearPoint(worldPos);
    
    // Update selection
    if (selectedDivider) {
      this.selectObject(selectedDivider);
    } else {
      this.clearSelection();
    }
    
    // Render with the selected divider
    if (this.zoneDividerRenderer) {
      this.zoneDividerRenderer.render(
        this.dividers, 
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
    
    // If we're dragging a point of the selected divider
    if (this.selectedObject && this.draggingPoint && e.buttons === 1) {
      const divider = this.selectedObject.object;
      
      // Create a command for the point movement
      if (this.historyManager) {
        // Store old values for undo
        const oldStart = { ...divider.start };
        const oldEnd = { ...divider.end };
        
        // Update based on which point is being dragged
        let newStart = oldStart;
        let newEnd = oldEnd;
        
        if (this.draggingPoint === 'start') {
          newStart = { ...worldPos };
        } else if (this.draggingPoint === 'end') {
          newEnd = { ...worldPos };
        }
        
        // Skip if the point hasn't moved significantly
        if ((this.draggingPoint === 'start' && 
             Math.abs(oldStart.x - newStart.x) < 0.001 && 
             Math.abs(oldStart.y - newStart.y) < 0.001) ||
            (this.draggingPoint === 'end' && 
             Math.abs(oldEnd.x - newEnd.x) < 0.001 && 
             Math.abs(oldEnd.y - newEnd.y) < 0.001)) {
          return;
        }
        
        const command = new ModifyZoneDividerCommand(
          this, 
          divider, 
          'position', 
          { start: oldStart, end: oldEnd }, 
          { start: newStart, end: newEnd }
        );
        this.historyManager.executeCommand(command);
      } else {
        // Simple direct update without history
        if (this.draggingPoint === 'start') {
          divider.updateStart(worldPos);
        } else if (this.draggingPoint === 'end') {
          divider.updateEnd(worldPos);
        }
      }
    }
    
    // Render dividers with hover position for highlighting
    if (this.zoneDividerRenderer) {
      this.zoneDividerRenderer.render(
        this.dividers, 
        null, 
        worldPos,
        this.selectedObject ? this.selectedObject.object : null
      );
    }
  }
  
  onMouseUp(e) {
    if (!this.active) return;
    
    // Reset dragging state
    this.draggingPoint = null;
  }
  
  // Find the divider closest to a point
  findDividerNearPoint(point) {
    if (!this.dividers || !this.dividers.length) return null;
    
    let closestDivider = null;
    let minDistance = this.selectionThreshold;
    
    this.dividers.forEach(divider => {
      const distance = divider.distanceToPoint(point);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestDivider = divider;
      }
    });
    
    return closestDivider;
  }
  
  selectObject(object) {
    if (object === this.selectedObject) return;
    
    this.selectedObject = {
      type: 'zoneDivider',
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
    this.draggingPoint = null;
    
    if (hadSelection && this.onSelectionChange) {
      this.onSelectionChange(null);
    }
  }
  
  // Update selected divider properties
  updateSelectedObject(property, value) {
    if (!this.selectedObject) return;
    
    const divider = this.selectedObject.object;
    
    // Store old value for undo
    const oldValue = divider[property];
    
    // Create a command for the property change
    if (this.historyManager) {
      const command = new ModifyZoneDividerCommand(
        this, 
        divider, 
        property, 
        oldValue, 
        value
      );
      this.historyManager.executeCommand(command);
    } else {
      // Simple direct update without history
      divider[property] = value;
    }
    
    // Let the sidebar know about the change
    if (this.onSelectionChange) {
      // Create a new object reference to trigger React update
      this.onSelectionChange({ 
        ...this.selectedObject
      });
    }
    
    // Update renderer
    this.renderSelectedDivider();
  }
  
  // Delete the selected divider
  deleteSelectedDivider() {
    if (!this.selectedObject) return;
    
    const divider = this.selectedObject.object;
    
    // Create and execute a DeleteZoneDividerCommand
    if (this.historyManager) {
      const command = new DeleteZoneDividerCommand(this, divider);
      this.historyManager.executeCommand(command);
    } else {
      // Fallback implementation
      const dividerIndex = this.dividers.findIndex(d => d.id === divider.id);
      
      if (dividerIndex !== -1) {
        // Remove the divider from the array
        this.dividers.splice(dividerIndex, 1);
        
        // Clear selection
        this.clearSelection();
        
        // Update renderer
        this.renderSelectedDivider();
      }
    }
  }
  
  renderSelectedDivider() {
    // Update the divider's appearance after modifying its properties
    if (this.zoneDividerRenderer) {
      this.zoneDividerRenderer.render(
        this.dividers, 
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