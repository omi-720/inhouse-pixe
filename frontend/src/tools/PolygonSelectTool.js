// src/tools/PolygonSelectTool.js
import { pixelsToMeters } from '../core/geometry/MeasurementUtils';
import { ModifyPolygonCommand, DeletePolygonCommand } from '../core/history/Commands';

export default class PolygonSelectTool {
  constructor(pixiRenderer, polygonRenderer, polygons, historyManager) {
    this.pixiRenderer = pixiRenderer;
    this.polygonRenderer = polygonRenderer;
    this.polygons = polygons || [];
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
  
  setPolygons(polygons) {
    this.polygons = polygons;
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
    // If Delete key is pressed, delete selected polygon or point
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedObject) {
      e.preventDefault();
      
      if (this.selectedPointIndex >= 0) {
        // Delete the selected point if we're in point editing mode
        this.deleteSelectedPoint();
      } else {
        // Delete the entire polygon
        this.deleteSelectedPolygon();
      }
    }
  }
  
  onMouseDown(e) {
    if (!this.active) return;
    
    // Use the getWorldMousePosition method from PixiRenderer
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    
    // Try to select a point first if a polygon is already selected
    if (this.selectedObject) {
      const pointIndex = this.findNearestPointIndex(this.selectedObject.object, worldPos);
      if (pointIndex >= 0) {
        this.selectedPointIndex = pointIndex;
        
        // Render with the selected point
        if (this.polygonRenderer) {
          this.polygonRenderer.render(
            this.polygons, 
            null, 
            worldPos,
            this.selectedObject.object
          );
        }
        return;
      }
    }
    
    // If no point is selected, try to select a polygon
    const selectedPolygon = this.findPolygonNearPoint(worldPos);
    
    // Update selection
    if (selectedPolygon) {
      this.selectObject(selectedPolygon);
      this.selectedPointIndex = -1; // Reset point selection
    } else {
      this.clearSelection();
    }
    
    // Render with the selected polygon
    if (this.polygonRenderer) {
      this.polygonRenderer.render(
        this.polygons, 
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
      const polygon = this.selectedObject.object;
      const point = polygon.points[this.selectedPointIndex];
      
      // Create a command for the point movement
      if (this.historyManager) {
        const oldPoint = { ...point };
        const newPoint = { ...worldPos };
        
        // Skip if the point hasn't moved significantly
        if (Math.abs(oldPoint.x - newPoint.x) < 0.001 && 
            Math.abs(oldPoint.y - newPoint.y) < 0.001) {
          return;
        }
        
        const command = new ModifyPolygonCommand(this, polygon, this.selectedPointIndex, oldPoint, newPoint);
        this.historyManager.executeCommand(command);
      } else {
        // Simple direct update without history
        polygon.updatePoint(this.selectedPointIndex, worldPos);
        polygon.updateMeasurements();
      }
    }
    
    // Render polygons with hover position for highlighting
    if (this.polygonRenderer) {
      this.polygonRenderer.render(
        this.polygons, 
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
  
  // Find the nearest polygon to a point
  findPolygonNearPoint(point) {
    if (!this.polygons || !this.polygons.length) return null;
    
    let closestPolygon = null;
    let minDistance = Infinity;
    
    this.polygons.forEach(polygon => {
      // Skip polygons with too few points
      if (polygon.points.length < 2) return;
      
      // For closed polygons, check if point is inside
      if (polygon.isClosed && polygon.containsPoint(point)) {
        // Point is inside polygon, prioritize this selection
        const distanceToCentroid = this.distanceToPolygonCentroid(polygon, point);
        if (distanceToCentroid < minDistance) {
          minDistance = distanceToCentroid;
          closestPolygon = polygon;
        }
        return;
      }
      
      // Check distance to each segment
      for (let i = 0; i < polygon.points.length; i++) {
        const current = polygon.points[i];
        const next = polygon.points[(i + 1) % polygon.points.length];
        
        // Skip the last segment if polygon isn't closed
        if (!polygon.isClosed && i === polygon.points.length - 1) {
          continue;
        }
        
        const distance = this.pointToLineDistance(point, current, next);
        
        if (distance < this.selectionThreshold && distance < minDistance) {
          minDistance = distance;
          closestPolygon = polygon;
        }
      }
    });
    
    return closestPolygon;
  }
  
  // Find the index of the nearest point in a polygon
  findNearestPointIndex(polygon, point) {
    if (!polygon || !polygon.points || polygon.points.length === 0) return -1;
    
    let minDistanceSq = Infinity;
    let nearestPointIndex = -1;
    
    polygon.points.forEach((polyPoint, index) => {
      const dx = point.x - polyPoint.x;
      const dy = point.y - polyPoint.y;
      const distanceSq = dx * dx + dy * dy;
      
      if (distanceSq < minDistanceSq && distanceSq < this.selectionThreshold * this.selectionThreshold) {
        minDistanceSq = distanceSq;
        nearestPointIndex = index;
      }
    });
    
    return nearestPointIndex;
  }
  
  distanceToPolygonCentroid(polygon, point) {
    // Calculate centroid
    let sumX = 0;
    let sumY = 0;
    
    polygon.points.forEach(p => {
      sumX += p.x;
      sumY += p.y;
    });
    
    const centroid = {
      x: sumX / polygon.points.length,
      y: sumY / polygon.points.length
    };
    
    // Calculate distance to centroid
    const dx = point.x - centroid.x;
    const dy = point.y - centroid.y;
    
    return Math.sqrt(dx * dx + dy * dy);
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
      type: 'polygon',
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
  
  // Delete a single point from the selected polygon
  deleteSelectedPoint() {
    if (!this.selectedObject || this.selectedPointIndex < 0) return;
    
    const polygon = this.selectedObject.object;
    
    // Don't delete points if it would make the polygon have less than 2 points
    if (polygon.points.length <= 2) {
      console.log('Cannot delete point: polygon must have at least 2 points');
      return;
    }
    
    // If this is a closed polygon with 3 points, deleting would make it unclosed
    if (polygon.isClosed && polygon.points.length <= 3) {
      polygon.isClosed = false;
    }
    
    // Remove the point
    polygon.removePoint(this.selectedPointIndex);
    
    // Reset point selection
    this.selectedPointIndex = -1;
    
    // Update the polygon's appearance
    this.renderSelectedPolygon();
    
    // Let the sidebar know about the change
    if (this.onSelectionChange) {
      this.onSelectionChange({ 
        ...this.selectedObject
      });
    }
  }
  
  // Delete the entire selected polygon
  deleteSelectedPolygon() {
    if (!this.selectedObject) return;
    
    const polygon = this.selectedObject.object;
    
    // Create and execute a DeletePolygonCommand
    if (this.historyManager) {
      const command = new DeletePolygonCommand(this, polygon);
      this.historyManager.executeCommand(command);
    } else {
      // Fallback implementation
      const polygonIndex = this.polygons.findIndex(p => p.id === polygon.id);
      
      if (polygonIndex !== -1) {
        // Remove the polygon from the array
        this.polygons.splice(polygonIndex, 1);
        
        // Clear selection
        this.clearSelection();
        
        // Update renderer
        this.renderSelectedPolygon();
      }
    }
  }
  
  renderSelectedPolygon() {
    // Update the polygon's appearance after modifying its properties
    if (this.polygonRenderer) {
      this.polygonRenderer.render(
        this.polygons, 
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