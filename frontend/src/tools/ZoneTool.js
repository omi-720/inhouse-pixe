// src/tools/ZoneTool.js
import Zone from '../models/Zone';
import { AddZoneCommand } from '../core/history/Commands';
import { exactPointMatch } from '../core/geometry/GeometryUtils';

export default class ZoneTool {
  constructor(pixiRenderer, zoneRenderer, historyManager = null) {
    this.pixiRenderer = pixiRenderer;
    this.zoneRenderer = zoneRenderer;
    this.zones = [];
    this.currentZone = null;
    this.active = false;
    this.isDrawing = false;
    this.mousePosition = null;
    this.onZoneAdded = null;
    this.historyManager = historyManager;
    this.outlineRenderer = null;
    
    // Snap settings
    this.snapThreshold = 0.01; // 1cm snap threshold in meters
    
    // For double-click detection
    this.lastClickTime = 0;
    this.lastClickPosition = null;
    
    // Bind methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
    
    console.log('ZoneTool initialized');
  }
  
  activate() {
    this.active = true;
    this.setupEventListeners();
    console.log('ZoneTool activated');
  }
  
  deactivate() {
    this.active = false;
    this.removeEventListeners();
    this.cancelDrawing();
    console.log('ZoneTool deactivated');
  }
  
  setupEventListeners() {
    const canvas = this.pixiRenderer.app.canvas;
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('dblclick', this.onDoubleClick);
    window.addEventListener('keydown', this.onKeyDown);
  }
  
  removeEventListeners() {
    const canvas = this.pixiRenderer.app.canvas;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('dblclick', this.onDoubleClick);
    window.removeEventListener('keydown', this.onKeyDown);
  }
  
  onKeyDown(e) {
    // If ESC key is pressed, cancel zone drawing
    if (e.keyCode === 27 || e.key === 'Escape') {
      this.cancelDrawing();
    }
    
    // If Enter key is pressed, close the zone
    if (e.keyCode === 13 || e.key === 'Enter') {
      this.closeCurrentZone();
    }
  }
  
  cancelDrawing() {
    // Reset all drawing state
    this.isDrawing = false;
    this.currentZone = null;
    
    // Update renderer to clear preview
    if (this.zoneRenderer) {
      this.zoneRenderer.render(this.zones, null, this.mousePosition);
    }
    
    if (this.outlineRenderer) {
      this.outlineRenderer.render(this.zones, null);
    }
  }
  
  closeCurrentZone() {
    if (!this.currentZone || !this.isDrawing) return false;
    
    // Need at least 3 points to close a zone
    if (this.currentZone.points.length < 3) {
      console.log('Need at least 3 points to close a zone');
      return false;
    }
    
    // Close the zone
    this.currentZone.closeZone();
    
    // Add the zone to history manager or directly to the array
    if (this.historyManager) {
      const command = new AddZoneCommand(this, this.currentZone);
      this.historyManager.executeCommand(command);
    } else {
      this.zones.push(this.currentZone);
    }
    
    // Call the callback to notify that a zone was added
    if (this.onZoneAdded) {
      this.onZoneAdded(this.currentZone);
    }
    
    // Reset state for next zone
    this.isDrawing = false;
    this.currentZone = null;
    
    // Update renderer
    this.zoneRenderer.render(this.zones, null, this.mousePosition);
    
    if (this.outlineRenderer) {
      this.outlineRenderer.render(this.zones, null);
    }
    
    return true;
  }
  
  onMouseDown(e) {
    if (!this.active) return;
    
    // Get current mouse world position (already in meters)
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) return;
    
    // Handle double-click specially
    const currentTime = Date.now();
    const isDoubleClick = currentTime - this.lastClickTime < 300 && this.lastClickPosition &&
                         Math.abs(worldPos.x - this.lastClickPosition.x) < 0.05 &&
                         Math.abs(worldPos.y - this.lastClickPosition.y) < 0.05;
    
    this.lastClickTime = currentTime;
    this.lastClickPosition = { ...worldPos };
    
    if (isDoubleClick) {
      // Double click should close the zone
      this.closeCurrentZone();
      return;
    }
    
    // If we're not already drawing, start a new zone
    if (!this.isDrawing) {
      this.isDrawing = true;
      this.currentZone = new Zone();
      
      // Add the first point
      this.currentZone.addPoint(worldPos);
      
      // Update renderer with preview
      this.zoneRenderer.render(this.zones, this.currentZone, this.mousePosition);
      
      return;
    }
    
    // Check if we're closing the zone by clicking near the first point
    if (this.currentZone && this.currentZone.points.length > 2) {
      const firstPoint = this.currentZone.points[0];
      const isClosing = Math.abs(worldPos.x - firstPoint.x) < this.snapThreshold &&
                       Math.abs(worldPos.y - firstPoint.y) < this.snapThreshold;
      
      if (isClosing) {
        this.closeCurrentZone();
        return;
      }
    }
    
    // Otherwise add a new point to the current zone
    if (this.currentZone) {
      this.currentZone.addPoint(worldPos);
      
      // Update renderer with preview
      this.zoneRenderer.render(this.zones, this.currentZone, this.mousePosition);
    }
  }
  
  onMouseMove(e) {
    if (!this.active) return;
    
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) return;
    
    // Store mouse position for hover effects
    this.mousePosition = { ...worldPos };
    
    // If we're drawing a zone, update the preview
    if (this.isDrawing && this.currentZone) {
      // Update renderer with preview - the renderer will draw a line from last point to cursor
      this.zoneRenderer.render(this.zones, this.currentZone, this.mousePosition);
      
      if (this.outlineRenderer) {
        const allZones = [...this.zones];
        if (this.currentZone) allZones.push(this.currentZone);
        this.outlineRenderer.render(allZones, null);
      }
    } else {
      // Just update for hover effects
      this.zoneRenderer.render(this.zones, null, this.mousePosition);
    }
  }
  
  onMouseUp(e) {
    // No special handling needed for now
  }
  
  onDoubleClick(e) {
    if (!this.active || !this.isDrawing) return;
    
    this.closeCurrentZone();
  }
  
  // Find the zone at a specific point
  findZoneAtPoint(point) {
    if (!this.zones || !this.zones.length) return null;
    
    // Search in reverse order so we get the most recently added zones first
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      if (zone.isClosed && zone.containsPoint(point)) {
        return zone;
      }
    }
    
    return null;
  }
  
  // Find zone boundary near a point
  findZoneBoundaryNearPoint(point, threshold = 0.1) {
    if (!this.zones || !this.zones.length) return null;
    
    let closestZone = null;
    let closestDistance = Infinity;
    let closestPoint = null;
    
    this.zones.forEach(zone => {
      if (!zone.isClosed) return;
      
      // Check each segment of the zone
      for (let i = 0; i < zone.points.length; i++) {
        const p1 = zone.points[i];
        const p2 = zone.points[(i + 1) % zone.points.length];
        
        // Find closest point on this segment
        const segmentPoint = this.pointToLineSegmentDistance(point, p1, p2);
        
        if (segmentPoint.distance < threshold && segmentPoint.distance < closestDistance) {
          closestDistance = segmentPoint.distance;
          closestZone = zone;
          closestPoint = segmentPoint.point;
        }
      }
    });
    
    if (closestZone) {
      return {
        zone: closestZone,
        point: closestPoint,
        distance: closestDistance
      };
    }
    
    return null;
  }
  
  // Calculate point-to-line-segment distance and closest point
  pointToLineSegmentDistance(point, segmentStart, segmentEnd) {
    const dx = segmentEnd.x - segmentStart.x;
    const dy = segmentEnd.y - segmentStart.y;
    const segmentLengthSq = dx * dx + dy * dy;
    
    if (segmentLengthSq === 0) {
      // Segment is a point
      return {
        distance: Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y),
        point: { x: segmentStart.x, y: segmentStart.y }
      };
    }
    
    // Calculate projection of point onto segment
    const t = Math.max(0, Math.min(1, 
      ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / segmentLengthSq
    ));
    
    // Calculate closest point on segment
    const closestPoint = {
      x: segmentStart.x + t * dx,
      y: segmentStart.y + t * dy
    };
    
    // Calculate distance
    const distance = Math.hypot(
      point.x - closestPoint.x,
      point.y - closestPoint.y
    );
    
    return {
      distance,
      point: closestPoint
    };
  }
  
  // Find the nearest zone point to the given position
  findNearestZonePoint(pos, threshold = 0.05) {
    if (!this.zones || !this.zones.length) return null;
    
    let nearestPoint = null;
    let nearestZone = null;
    let minDistance = threshold; // Only return points within threshold
    
    this.zones.forEach(zone => {
      zone.points.forEach(point => {
        const distance = Math.hypot(point.x - pos.x, point.y - pos.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = { ...point };
          nearestZone = zone;
        }
      });
    });
    
    if (nearestPoint) {
      return {
        point: nearestPoint,
        zone: nearestZone,
        distance: minDistance
      };
    }
    
    return null;
  }
  
  destroy() {
    this.deactivate();
  }
}