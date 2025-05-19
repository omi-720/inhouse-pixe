// src/tools/ZoneDividerTool.js
import ZoneDivider from '../models/ZoneDivider';
import { AddZoneDividerCommand } from '../core/history/Commands';

export default class ZoneDividerTool {
  constructor(pixiRenderer, zoneDividerRenderer, zoneTool, historyManager = null) {
    this.pixiRenderer = pixiRenderer;
    this.zoneDividerRenderer = zoneDividerRenderer;
    this.zoneTool = zoneTool; // Reference to the ZoneTool to access zones
    this.dividers = [];
    this.currentDivider = null;
    this.active = false;
    this.isDrawing = false;
    this.startPoint = null;
    this.mousePosition = null;
    this.onDividerAdded = null;
    this.historyManager = historyManager;
    
    // Default thickness for zone dividers
    this.defaultThickness = 0.05; // 5cm
    
    // State for drawing
    this.sourceZone = null;   // Which zone we're drawing in
    this.startPointOnBoundary = false; // Whether start point is on a zone boundary
    
    // Bind methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    
    console.log('ZoneDividerTool initialized');
  }
  
  activate() {
    this.active = true;
    this.setupEventListeners();
    console.log('ZoneDividerTool activated');
  }
  
  deactivate() {
    this.active = false;
    this.removeEventListeners();
    this.cancelDrawing();
    console.log('ZoneDividerTool deactivated');
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
    // If ESC key is pressed, cancel divider drawing
    if (e.keyCode === 27 || e.key === 'Escape') {
      this.cancelDrawing();
    }
  }
  
  cancelDrawing() {
    // Reset all drawing state
    this.isDrawing = false;
    this.startPoint = null;
    this.currentDivider = null;
    this.sourceZone = null;
    this.startPointOnBoundary = false;
    
    // Update renderer to clear preview
    if (this.zoneDividerRenderer) {
      this.zoneDividerRenderer.render(this.dividers, null, this.mousePosition);
    }
  }
  
  onMouseDown(e) {
    if (!this.active) return;
    
    // Get current mouse world position
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) return;
    
    // If we're already drawing, finish the divider
    if (this.isDrawing && this.currentDivider) {
      // Check if endpoint is within a valid zone
      const endZone = this.isPointInAnyZone(worldPos);
      
      // Dividers should only be drawn within a zone or zones that share a boundary
      if (endZone && (endZone === this.sourceZone || this.areZonesAdjacent(this.sourceZone, endZone))) {
        this.currentDivider.updateEnd(worldPos);
        
        // Ensure minimum length
        if (this.currentDivider.length < 0.1) { // 10cm minimum
          this.cancelDrawing();
          return;
        }
        
        // Set the zone ID for the divider
        this.currentDivider.setZoneId(this.sourceZone.id);
        
        // Add the divider to history manager or directly to the array
        if (this.historyManager) {
          const command = new AddZoneDividerCommand(this, this.currentDivider);
          this.historyManager.executeCommand(command);
        } else {
          this.dividers.push(this.currentDivider);
        }
        
        // Call the callback to notify that a divider was added
        if (this.onDividerAdded) {
          this.onDividerAdded(this.currentDivider);
        }
      } else {
        // If endpoint is not in a valid zone, cancel drawing
        console.log('Divider endpoint must be within the same zone or an adjacent zone');
      }
      
      // Reset drawing state
      this.isDrawing = false;
      this.startPoint = null;
      this.currentDivider = null;
      this.sourceZone = null;
      this.startPointOnBoundary = false;
      
      // Update renderer
      this.zoneDividerRenderer.render(this.dividers, null, this.mousePosition);
      
      return;
    }
    
    // Start drawing a new divider
    
    // First check if the point is on a zone boundary
    const boundaryInfo = this.zoneTool.findZoneBoundaryNearPoint(worldPos, 0.05);
    let startPosition = worldPos;
    
    if (boundaryInfo) {
      // Starting on a boundary - use the exact boundary point
      startPosition = boundaryInfo.point;
      this.startPointOnBoundary = true;
      this.sourceZone = boundaryInfo.zone;
    } else {
      // Check if we're in a zone
      const zone = this.isPointInAnyZone(worldPos);
      if (!zone) {
        console.log('Divider must start within a zone or on a zone boundary');
        return;
      }
      
      this.sourceZone = zone;
      this.startPointOnBoundary = false;
    }
    
    this.isDrawing = true;
    this.startPoint = { ...startPosition };
    
    // Create a divider with zero length initially
    this.currentDivider = new ZoneDivider(
      this.startPoint,
      this.startPoint,
      this.defaultThickness
    );
    
    // Update renderer with preview
    this.zoneDividerRenderer.render(this.dividers, this.currentDivider, this.mousePosition);
  }
  
  onMouseMove(e) {
    if (!this.active) return;
    
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) return;
    
    // Store mouse position for hover effects
    this.mousePosition = { ...worldPos };
    
    // If we're not drawing, just update the renderer for hover effects
    if (!this.isDrawing || !this.startPoint) {
      this.zoneDividerRenderer.render(this.dividers, null, this.mousePosition);
      return;
    }
    
    // If we're drawing, update the end point of the current divider
    if (this.currentDivider) {
      this.currentDivider.updateEnd(worldPos);
      
      // Update renderer with preview
      this.zoneDividerRenderer.render(this.dividers, this.currentDivider, this.mousePosition);
    }
  }
  
  onMouseUp(e) {
    // In this case, we're handling divider creation in mouseDown
    // No special handling needed here
  }
  
  isPointInAnyZone(point) {
    if (!this.zoneTool || !this.zoneTool.zones) {
      return null;
    }
    
    // Search zones in reverse order (most recently added first)
    for (let i = this.zoneTool.zones.length - 1; i >= 0; i--) {
      const zone = this.zoneTool.zones[i];
      if (zone.isClosed && zone.containsPoint(point)) {
        return zone;
      }
    }
    
    return null;
  }
  
  areZonesAdjacent(zone1, zone2) {
    if (!zone1 || !zone2 || zone1 === zone2) {
      return false;
    }
    
    // Check if they share any edges
    for (let i = 0; i < zone1.points.length; i++) {
      const p1 = zone1.points[i];
      const p2 = zone1.points[(i + 1) % zone1.points.length];
      
      for (let j = 0; j < zone2.points.length; j++) {
        const q1 = zone2.points[j];
        const q2 = zone2.points[(j + 1) % zone2.points.length];
        
        // Check if edges overlap
        if (this.doEdgesOverlap(p1, p2, q1, q2)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  doEdgesOverlap(p1, p2, q1, q2) {
    // Check if two line segments share any points
    
    // Check if they're the same edge
    if ((this.pointsEqual(p1, q1) && this.pointsEqual(p2, q2)) ||
        (this.pointsEqual(p1, q2) && this.pointsEqual(p2, q1))) {
      return true;
    }
    
    // Check if one edge contains a vertex of the other
    if (this.isPointOnSegment(p1, p2, q1) || 
        this.isPointOnSegment(p1, p2, q2) ||
        this.isPointOnSegment(q1, q2, p1) ||
        this.isPointOnSegment(q1, q2, p2)) {
      return true;
    }
    
    // Check if the edges intersect
    return this.edgesIntersect(p1, p2, q1, q2);
  }
  
  pointsEqual(p1, p2, tolerance = 0.001) {
    return Math.abs(p1.x - p2.x) < tolerance && 
           Math.abs(p1.y - p2.y) < tolerance;
  }
  
  isPointOnSegment(p1, p2, point, tolerance = 0.001) {
    // Check if point is on line segment p1-p2
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segmentLengthSq = dx * dx + dy * dy;
    
    if (segmentLengthSq === 0) {
      // Segment is a point
      return this.pointsEqual(point, p1, tolerance);
    }
    
    // Calculate projection onto line
    const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / segmentLengthSq;
    
    if (t < 0 || t > 1) {
      // Projection falls outside the segment
      return false;
    }
    
    // Calculate closest point on segment
    const projectedPoint = {
      x: p1.x + t * dx,
      y: p1.y + t * dy
    };
    
    // Check if point is close to the projection
    return this.pointsEqual(point, projectedPoint, tolerance);
  }
  
  edgesIntersect(p1, p2, q1, q2) {
    // Check if two line segments intersect
    const dx1 = p2.x - p1.x;
    const dy1 = p2.y - p1.y;
    const dx2 = q2.x - q1.x;
    const dy2 = q2.y - q1.y;
    
    const determinant = dx1 * dy2 - dy1 * dx2;
    
    if (Math.abs(determinant) < 0.0001) {
      // Lines are parallel or collinear
      return false;
    }
    
    const t1 = ((q1.x - p1.x) * dy2 - (q1.y - p1.y) * dx2) / determinant;
    const t2 = ((q1.x - p1.x) * dy1 - (q1.y - p1.y) * dx1) / (-determinant);
    
    return t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1;
  }
  
  // Find the nearest divider to a point
  findDividerNearPoint(point, threshold = 0.1) {
    if (!this.dividers || !this.dividers.length) return null;
    
    let closestDivider = null;
    let minDistance = threshold; // Only return dividers within threshold
    
    this.dividers.forEach(divider => {
      const distance = divider.distanceToPoint(point);
      if (distance < minDistance) {
        minDistance = distance;
        closestDivider = divider;
      }
    });
    
    return closestDivider;
  }
  
  setDefaultThickness(thickness) {
    this.defaultThickness = thickness;
  }
  
  destroy() {
    this.deactivate();
  }
}