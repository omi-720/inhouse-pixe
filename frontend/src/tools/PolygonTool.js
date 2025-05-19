// src/tools/PolygonTool.js
import Polygon from '../models/Polygon';
import { AddPolygonCommand } from '../core/history/Commands';
import { exactPointMatch } from '../core/geometry/GeometryUtils';

export default class PolygonTool {
  constructor(pixiRenderer, polygonRenderer, historyManager = null) {
    this.pixiRenderer = pixiRenderer;
    this.polygonRenderer = polygonRenderer;
    this.polygons = [];
    this.currentPolygon = null;
    this.active = false;
    this.isDrawing = false;
    this.mousePosition = null;
    this.onPolygonAdded = null;
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
    
    console.log('PolygonTool initialized');
  }
  
  activate() {
    this.active = true;
    this.setupEventListeners();
    console.log('PolygonTool activated');
  }
  
  deactivate() {
    this.active = false;
    this.removeEventListeners();
    this.cancelDrawing();
    console.log('PolygonTool deactivated');
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
    // If ESC key is pressed, cancel polygon drawing
    if (e.keyCode === 27 || e.key === 'Escape') {
      this.cancelDrawing();
    }
    
    // If Enter key is pressed, close the polygon
    if (e.keyCode === 13 || e.key === 'Enter') {
      this.closeCurrentPolygon();
    }
  }
  
  cancelDrawing() {
    // Reset all drawing state
    this.isDrawing = false;
    this.currentPolygon = null;
    
    // Update renderer to clear preview
    if (this.polygonRenderer) {
      this.polygonRenderer.render(this.polygons, null, this.mousePosition);
    }
    
    if (this.outlineRenderer) {
      this.outlineRenderer.render(this.polygons, null);
    }
  }
  
  closeCurrentPolygon() {
    if (!this.currentPolygon || !this.isDrawing) return false;
    
    // Need at least 3 points to close a polygon
    if (this.currentPolygon.points.length < 3) {
      console.log('Need at least 3 points to close a polygon');
      return false;
    }
    
    // Close the polygon
    this.currentPolygon.closePolygon();
    
    // Add the polygon to history manager or directly to the array
    if (this.historyManager) {
      const command = new AddPolygonCommand(this, this.currentPolygon);
      this.historyManager.executeCommand(command);
    } else {
      this.polygons.push(this.currentPolygon);
    }
    
    // Call the callback to notify that a polygon was added
    if (this.onPolygonAdded) {
      this.onPolygonAdded(this.currentPolygon);
    }
    
    // Reset state for next polygon
    this.isDrawing = false;
    this.currentPolygon = null;
    
    // Update renderer
    this.polygonRenderer.render(this.polygons, null, this.mousePosition);
    
    if (this.outlineRenderer) {
      this.outlineRenderer.render(this.polygons, null);
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
      // Double click should close the polygon
      this.closeCurrentPolygon();
      return;
    }
    
    // If we're not already drawing, start a new polygon
    if (!this.isDrawing) {
      this.isDrawing = true;
      this.currentPolygon = new Polygon();
      
      // Add the first point
      this.currentPolygon.addPoint(worldPos);
      
      // Update renderer with preview
      this.polygonRenderer.render(this.polygons, this.currentPolygon, this.mousePosition);
      
      return;
    }
    
    // Check if we're closing the polygon by clicking near the first point
    if (this.currentPolygon && this.currentPolygon.points.length > 2) {
      const firstPoint = this.currentPolygon.points[0];
      const isClosing = Math.abs(worldPos.x - firstPoint.x) < this.snapThreshold &&
                       Math.abs(worldPos.y - firstPoint.y) < this.snapThreshold;
      
      if (isClosing) {
        this.closeCurrentPolygon();
        return;
      }
    }
    
    // Otherwise add a new point to the current polygon
    if (this.currentPolygon) {
      this.currentPolygon.addPoint(worldPos);
      
      // Update renderer with preview
      this.polygonRenderer.render(this.polygons, this.currentPolygon, this.mousePosition);
    }
  }
  
  onMouseMove(e) {
    if (!this.active) return;
    
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) return;
    
    // Store mouse position for hover effects
    this.mousePosition = { ...worldPos };
    
    // If we're drawing a polygon, update the preview
    if (this.isDrawing && this.currentPolygon) {
      // Update renderer with preview - the renderer will draw a line from last point to cursor
      this.polygonRenderer.render(this.polygons, this.currentPolygon, this.mousePosition);
      
      if (this.outlineRenderer) {
        const allPolygons = [...this.polygons];
        if (this.currentPolygon) allPolygons.push(this.currentPolygon);
        this.outlineRenderer.render(allPolygons, null);
      }
    } else {
      // Just update for hover effects
      this.polygonRenderer.render(this.polygons, null, this.mousePosition);
    }
  }
  
  onMouseUp(e) {
    // No special handling needed for now
  }
  
  onDoubleClick(e) {
    if (!this.active || !this.isDrawing) return;
    
    this.closeCurrentPolygon();
  }
  
  // Find the nearest polygon to a point
  findPolygonNearPoint(point, threshold = 0.1) {
    if (!this.polygons || !this.polygons.length) return null;
    
    for (const polygon of this.polygons) {
      // Check each segment of the polygon
      for (let i = 0; i < polygon.points.length; i++) {
        const current = polygon.points[i];
        const next = polygon.points[(i + 1) % polygon.points.length];
        
        // Skip if this is the last point and the polygon isn't closed
        if (!polygon.isClosed && i === polygon.points.length - 1) {
          continue;
        }
        
        // Check distance to this segment
        const segmentDistance = this.pointToLineDistance(point, current, next);
        if (segmentDistance < threshold) {
          return polygon;
        }
      }
    }
    
    return null;
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
  
  destroy() {
    this.deactivate();
  }
}