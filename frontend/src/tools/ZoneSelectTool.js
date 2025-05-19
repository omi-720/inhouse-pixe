// src/tools/ZoneSelectTool.js
import { pixelsToMeters } from '../core/geometry/MeasurementUtils';
import { ModifyZoneCommand, DeleteZoneCommand } from '../core/history/Commands';

export default class ZoneSelectTool {
  constructor(pixiRenderer, zoneRenderer, zones, historyManager) {
    this.pixiRenderer = pixiRenderer;
    this.zoneRenderer = zoneRenderer;
    this.zones = zones || [];
    this.active = false;
    this.selectedObject = null;
    this.selectedPointIndex = -1; // For editing individual points
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
  
  setZones(zones) {
    this.zones = zones;
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
    // If Delete key is pressed, delete selected zone or point
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedObject) {
      e.preventDefault();
      
      if (this.selectedPointIndex >= 0) {
        // Delete the selected point if we're in point editing mode
        this.deleteSelectedPoint();
      } else {
        // Delete the entire zone
        this.deleteSelectedZone();
      }
    }
  }
  
  onMouseDown(e) {
    if (!this.active) return;
    
    // Use the getWorldMousePosition method from PixiRenderer
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    
    // Try to select a point first if a zone is already selected
    if (this.selectedObject) {
      const pointIndex = this.findNearestPointIndex(this.selectedObject.object, worldPos);
      if (pointIndex >= 0) {
        this.selectedPointIndex = pointIndex;
        
        // Render with the selected point
        if (this.zoneRenderer) {
          this.zoneRenderer.render(
            this.zones, 
            null, 
            worldPos,
            this.selectedObject.object
          );
        }
        return;
      }
    }
    
    // If no point is selected, try to select a zone
    const selectedZone = this.findZoneAtPoint(worldPos);
    
    // Update selection
    if (selectedZone) {
      this.selectObject(selectedZone);
      this.selectedPointIndex = -1; // Reset point selection
    } else {
      this.clearSelection();
    }
    
    // Render with the selected zone
    if (this.zoneRenderer) {
      this.zoneRenderer.render(
        this.zones, 
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
    
    // If we're dragging a point, update its position
    if (this.selectedObject && this.selectedPointIndex >= 0 && e.buttons === 1) {
      const zone = this.selectedObject.object;
      const point = zone.points[this.selectedPointIndex];
      
      // Create a command for the point movement
      if (this.historyManager) {
        const oldPoint = { ...point };
        const newPoint = { ...worldPos };
        
        // Skip if the point hasn't moved significantly
        if (Math.abs(oldPoint.x - newPoint.x) < 0.001 && 
            Math.abs(oldPoint.y - newPoint.y) < 0.001) {
          return;
        }
        
        const command = new ModifyZoneCommand(this, zone, this.selectedPointIndex, oldPoint, newPoint);
        this.historyManager.executeCommand(command);
      } else {
        // Simple direct update without history
        zone.updatePoint(this.selectedPointIndex, worldPos);
        zone.updateMeasurements();
      }
    }
    
    // Render zones with hover position for highlighting
    if (this.zoneRenderer) {
      this.zoneRenderer.render(
        this.zones, 
        null, 
        worldPos,
        this.selectedObject ? this.selectedObject.object : null
      );
    }
  }
  
  onMouseUp(e) {
    if (!this.active) return;
    // Reset point drag state if needed
  }
  
  // Find a zone that contains the given point
  findZoneAtPoint(point) {
    if (!this.zones || !this.zones.length) return null;
    
    // Search in reverse order (most recently added first)
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      if (zone.isClosed && zone.containsPoint(point)) {
        return zone;
      }
    }
    
    // If no zone contains the point, check if it's near a zone boundary
    return this.findZoneNearPoint(point);
  }
  
  // Find a zone with a boundary near the given point
  findZoneNearPoint(point) {
    if (!this.zones || !this.zones.length) return null;
    
    let closestZone = null;
    let minDistance = this.selectionThreshold;
    
    this.zones.forEach(zone => {
      if (!zone.isClosed) return;
      
      // Check distance to each segment of the zone
      for (let i = 0; i < zone.points.length; i++) {
        const p1 = zone.points[i];
        const p2 = zone.points[(i + 1) % zone.points.length];
        
        const distance = this.pointToLineDistance(point, p1, p2);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestZone = zone;
        }
      }
    });
    
    return closestZone;
  }
  
  // Find the index of the nearest point in a zone
  findNearestPointIndex(zone, point) {
    if (!zone || !zone.points || zone.points.length === 0) return -1;
    
    let minDistanceSq = Infinity;
    let nearestPointIndex = -1;
    
    zone.points.forEach((zonePoint, index) => {
      const dx = point.x - zonePoint.x;
      const dy = point.y - zonePoint.y;
      const distanceSq = dx * dx + dy * dy;
      
      if (distanceSq < minDistanceSq && distanceSq < this.selectionThreshold * this.selectionThreshold) {
        minDistanceSq = distanceSq;
        nearestPointIndex = index;
      }
    });
    
    return nearestPointIndex;
  }
  
  // Calculate distance from point to line segment
  pointToLineDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lineLengthSquared = dx * dx + dy * dy;
    
    if (lineLengthSquared === 0) {
      // Line segment is a point
      return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    }
    
    // Calculate projection of point onto line
    const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSquared));
    
    // Calculate closest point on line
    const projectionX = lineStart.x + t * dx;
    const projectionY = lineStart.y + t * dy;
    
    // Return distance from point to closest point on line
    return Math.hypot(point.x - projectionX, point.y - projectionY);
  }
  
  selectObject(object) {
    if (object === this.selectedObject) return;
    
    this.selectedObject = {
      type: 'zone',
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
    this.selectedPointIndex = -1;
    
    if (hadSelection && this.onSelectionChange) {
      this.onSelectionChange(null);
    }
  }
  
  // Delete a single point from the selected zone
  deleteSelectedPoint() {
    if (!this.selectedObject || this.selectedPointIndex < 0) return;
    
    const zone = this.selectedObject.object;
    
    // Don't delete points if it would make the zone have less than 3 points
    if (zone.points.length <= 3) {
      console.log('Cannot delete point: zone must have at least 3 points');
      return;
    }
    
    // Remove the point
    zone.removePoint(this.selectedPointIndex);
    
    // Reset point selection
    this.selectedPointIndex = -1;
    
    // Update the zone's appearance
    this.renderSelectedZone();
    
    // Let the sidebar know about the change
    if (this.onSelectionChange) {
      this.onSelectionChange({ 
        ...this.selectedObject
      });
    }
  }
  
  // Delete the entire selected zone
  deleteSelectedZone() {
    if (!this.selectedObject) return;
    
    const zone = this.selectedObject.object;
    
    // Create and execute a DeleteZoneCommand
    if (this.historyManager) {
      const command = new DeleteZoneCommand(this, zone);
      this.historyManager.executeCommand(command);
    } else {
      // Fallback implementation
      const zoneIndex = this.zones.findIndex(z => z.id === zone.id);
      
      if (zoneIndex !== -1) {
        // Remove the zone from the array
        this.zones.splice(zoneIndex, 1);
        
        // Clear selection
        this.clearSelection();
        
        // Update renderer
        this.renderSelectedZone();
      }
    }
  }
  
  renderSelectedZone() {
    // Update the zone's appearance after modifying its properties
    if (this.zoneRenderer) {
      this.zoneRenderer.render(
        this.zones, 
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