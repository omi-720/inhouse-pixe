// src/tools/WallTool.js - Fixed version

import Wall from '../models/Wall';
import Node from '../models/Node';
import { calculateWallIntersection, exactPointMatch } from '../core/geometry/GeometryUtils';
import WallAngleRenderer from '../renderers/WallAngleRenderer';
import { AddWallCommand } from '../core/history/Commands';

export default class WallTool {
  constructor(pixiRenderer, wallRenderer, historyManager = null) {
    this.pixiRenderer = pixiRenderer;
    this.wallRenderer = wallRenderer;
    this.walls = [];
    this.nodes = [];
    this.currentWall = null;
    this.snapThreshold = 0.01; // 20cm snap threshold in meters
    this.active = false;
    this.isDrawingContinuous = false;
    this.lastClickPoint = null;
    this.firstWallStartPoint = null;
    this.drawingSequenceWalls = [];
    this.mousePosition = null;
    this.onWallAdded = null
    this.pixiRenderer.defaultThickness = this.defaultThickness;
    
    // Save reference to history manager
    this.historyManager = historyManager;
    
    // Set default wall thickness to 1.0 meter
    this.defaultThickness = 1.0;
    
    // Initialize the angle renderer
    this.angleRenderer = new WallAngleRenderer(pixiRenderer);
    
    // Bind methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    
    console.log('WallTool initialized');
  }
  
  // Add method to update the default thickness
  setDefaultThickness(thickness) {
    this.defaultThickness = thickness;
    
    this.pixiRenderer.defaultThickness = thickness;
  }
  
  activate() {
    this.active = true;
    this.setupEventListeners();
    console.log('WallTool activated, camera position:', 
                this.pixiRenderer.camera?.position, 
                'zoom:', this.pixiRenderer.camera?.getZoomLevel());
  }
  
  deactivate() {
    this.active = false;
    this.removeEventListeners();
    if (this.currentWall) {
      this.currentWall = null;
    }
    this.isDrawingContinuous = false;
    this.lastClickPoint = null;
    this.firstWallStartPoint = null;
    this.drawingSequenceWalls = [];
    this.mousePosition = null;
  }
  
  setupEventListeners() {
    const canvas = this.pixiRenderer.app.canvas;
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('keydown', this.onKeyDown);
  }
  
  removeEventListeners() {
    const canvas = this.pixiRenderer.app.canvas;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('keydown', this.onKeyDown);
  }
  
  onKeyDown(e) {
    // If ESC key is pressed (key code 27), cancel wall drawing
    if (e.keyCode === 27 || e.key === 'Escape') {
      // Reset all drawing state
      this.isDrawingContinuous = false;
      
      // If there's a current wall, discard it (don't save)
      if (this.currentWall) {
        // Simply discard the current wall being drawn
        this.currentWall = null;
        
        // Update wall renderer to clear any preview
        this.wallRenderer.render(this.walls, this.nodes, null, null, this.mousePosition, true);
      
        if (this.outlineRenderer) {
          const allWalls = [...this.walls, this.currentWall].filter(Boolean);
          this.outlineRenderer.invalidate(); // Force redraw
          this.outlineRenderer.render(allWalls, null);
        }
      }
      
      // Reset other drawing state variables
      this.lastClickPoint = null;
      this.firstWallStartPoint = null;
      this.drawingSequenceWalls = [];
      
      // Render one final time to clear the angle display
      this.angleRenderer.render(null, this.walls, false);
    }
  }
  
  // Check if a point is close to the first point in the drawing sequence
  isClosingStructure(point) {
    if (!this.firstWallStartPoint) return false;
    
    const dx = Math.abs(point.x - this.firstWallStartPoint.x);
    const dy = Math.abs(point.y - this.firstWallStartPoint.y);
    
    // Use the snap threshold to determine if we're closing the structure
    return dx < this.snapThreshold && dy < this.snapThreshold;
  }
  
  onMouseDown(e) {
    if (!this.active) return;
   
    // Get current mouse world position (already in meters)
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) {
      console.error('Failed to get world mouse position');
      return;
    }
   
    // Log the position for debugging
    console.log('Mouse clicked at world position:', worldPos);
   
    const nearestNode = this.findNearestEndpoint(worldPos);
    const clickPos = nearestNode || worldPos;
   
    // Check if we're closing a structure
    if (this.isDrawingContinuous && this.isClosingStructure(clickPos) && this.currentWall) {
      // If we're closing the structure, snap the end to exactly the first point
      this.currentWall.updateEnd(this.firstWallStartPoint);
     
      // Add the wall regardless of length
      console.log(`Closed structure with final wall: length=${this.currentWall.length}`);
     
      // CHANGE HERE: Add the wall through history manager
      if (this.historyManager) {
        const command = new AddWallCommand(this, this.currentWall);
        this.historyManager.executeCommand(command);
      } else {
        // Fallback for backward compatibility
        this.walls.push(this.currentWall);
        this.updateNodes(this.currentWall);
      }
     
      // Reset the drawing sequence state
      this.isDrawingContinuous = false;
      this.currentWall = null;
      this.lastClickPoint = null;
      this.firstWallStartPoint = null;
      this.drawingSequenceWalls = [];
     
      // Update wall renderer
      this.wallRenderer.render(this.walls, this.nodes, this.currentWall, null, this.mousePosition, true);
     
      return;
    }
   
    // If we already have a current wall (from a previous click),
    // complete it and start a new one
    if (this.currentWall) {
      // Finish current wall
      this.currentWall.updateEnd(clickPos);
     
      // CHANGE HERE: Add the wall through history manager
      if (this.historyManager) {
        const command = new AddWallCommand(this, this.currentWall);
        this.historyManager.executeCommand(command);
        this.drawingSequenceWalls.push(this.currentWall);
      } else {
        // Fallback for backward compatibility
        this.walls.push(this.currentWall);
        this.drawingSequenceWalls.push(this.currentWall);
        this.updateNodes(this.currentWall);
      }
     
      // Call the callback to notify Canvas that a wall was added
      if (this.onWallAdded) {
        this.onWallAdded();
      }
     
      // KEY CHANGE: Just store the click position, don't create a wall yet
      this.lastClickPoint = clickPos;
      this.currentWall = null; // Don't create wall until mouse moves
     
    } else {
      // First click - just store the position, don't create a wall yet
      this.lastClickPoint = clickPos;
      console.log(`Ready to start wall from ${JSON.stringify(clickPos)} with thickness ${this.defaultThickness}`);
      this.isDrawingContinuous = true;
     
      // Store the very first point for detecting closed structures
      this.firstWallStartPoint = { ...clickPos };
      this.drawingSequenceWalls = [];
    }
   
    // Update wall renderer - note we're not passing currentWall since it's null
    this.wallRenderer.render(this.walls, this.nodes, null, null, this.mousePosition, true);
 
    if (this.outlineRenderer) {
      const allWalls = [...this.walls].filter(Boolean); // No currentWall to include
      this.outlineRenderer.invalidate(); // Force redraw
      this.outlineRenderer.render(allWalls, null);
    }
}
  
  onMouseMove(e) {
    if (!this.active) return;
    
    const worldPos = this.pixiRenderer.getWorldMousePosition(e);
    if (!worldPos) return;
    
    const originalMousePos = { ...worldPos };
    this.mousePosition = originalMousePos;
    
    // If we have a click position but no current wall, create it now
    if (this.lastClickPoint && !this.currentWall) {
      // Only create a wall if the mouse has moved enough from the click point
      const dx = worldPos.x - this.lastClickPoint.x;
      const dy = worldPos.y - this.lastClickPoint.y;
      const distFromClick = Math.hypot(dx, dy);
      
      if (distFromClick > 0.01) { // Only create once moved at least 1cm
        this.currentWall = new Wall(this.lastClickPoint, worldPos, this.defaultThickness);
      }
    }
    
    if (!this.currentWall) {
      // Even without a current wall, update the renderer to show hover effects
      this.wallRenderer.render(this.walls, this.nodes, null, null, this.mousePosition, true);
      if (this.outlineRenderer) {
        this.outlineRenderer.render(this.walls, null);
      }
      return;
    }
    
    // If the wall has zero length (just created), make it have a real length
    const wallLength = Math.hypot(
      this.currentWall.end.x - this.currentWall.start.x,
      this.currentWall.end.y - this.currentWall.start.y
    );
    
    if (wallLength < 0.001) { // If it's basically zero length
      // Just use the current mouse position directly
      this.currentWall.updateEnd(worldPos);
    }
    
    // Check if the cursor is close to the first point (closing a shape)
    if (this.isDrawingContinuous && this.firstWallStartPoint && this.drawingSequenceWalls.length > 0) {
      // Calculate distance to first point
      const dx = Math.abs(worldPos.x - this.firstWallStartPoint.x);
      const dy = Math.abs(worldPos.y - this.firstWallStartPoint.y);
      
      // If we're close to the first point, ALWAYS snap to it
      if (dx < this.snapThreshold && dy < this.snapThreshold) {
        this.currentWall.updateEnd(this.firstWallStartPoint);
        
        // Important: Update the wall but use ORIGINAL mouse position for hover effects
        this.wallRenderer.render(this.walls, this.nodes, this.currentWall, null, originalMousePos, true);
        
        // Render angle between last wall and current wall
        this.angleRenderer.render(this.currentWall, this.walls, this.isDrawingContinuous);
        
        // Update outline renderer
        if (this.outlineRenderer) {
          const allWalls = [...this.walls, this.currentWall].filter(Boolean);
          this.outlineRenderer.render(allWalls, null);
        }
        
        return;
      }
    }
    
    // Check for snap points and force snap if within threshold
    const nearestNode = this.findNearestEndpoint(worldPos);
    if (nearestNode) {
      // If a snap point is found, always use it (forced snap)
      this.currentWall.updateEnd(nearestNode);
      this.lastSnappedNode = {...nearestNode};
    } else {
      // No snap point found, use regular mouse position
      this.lastSnappedNode = null;
      this.currentWall.updateEnd(worldPos);
    }
    
    // CRITICAL: Ensure this render call happens regardless of snapping
    this.wallRenderer.render(this.walls, this.nodes, this.currentWall, null, originalMousePos, true);
    
    // If we have an outline renderer, update it too
    if (this.outlineRenderer) {
      const allWalls = [...this.walls, this.currentWall].filter(Boolean);
      this.outlineRenderer.render(allWalls, null);
    }
    
    // Render angle between last wall and current wall
    this.angleRenderer.render(this.currentWall, this.walls, this.isDrawingContinuous);
  }

  isNear(p1, p2, threshold = 1e-2) {
    if (!p1 || !p2) return false;
    return Math.hypot(p1.x - p2.x, p1.y - p2.y) < threshold;
  }
  
 // In the findNearestEndpoint method of WallTool.js
 findNearestEndpoint(pos) {
  if (!this.nodes.length) return null;
  
  let nearestNode = null;
  let minDistance = Infinity;
  
  // Get current zoom level
  const zoom = this.pixiRenderer.camera ? this.pixiRenderer.camera.getZoomLevel() : 1;
  
  // Scale threshold with zoom - smaller threshold at higher zoom levels
  // This ensures you can work with precision at high zoom
  const baseThreshold = 0.05; // 5cm at normal zoom
  const snapThreshold = baseThreshold / Math.max(0.1, Math.sqrt(zoom));
  
  // Only consider TRUE ENDPOINTS (not junctions)
  this.nodes.forEach(node => {
    // Check if this is a true endpoint (connected to only ONE wall)
    if (node.wallIds.length === 1) {
      const distance = Math.hypot(node.x - pos.x, node.y - pos.y);
      if (distance < snapThreshold && distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }
  });
  
  return nearestNode ? { x: nearestNode.x, y: nearestNode.y } : null;
}
  
  updateNodes(newWall) {
    const { start, end, id, originalStart, originalEnd } = newWall;
    
    // Use original coordinates if available
    const startPoint = originalStart || start;
    const endPoint = originalEnd || end;
    
    // Check if these points already exist (for connections)
    const existingStartIndex = this.nodes.findIndex(
      node => exactPointMatch(node, startPoint)
    );
    
    const existingEndIndex = this.nodes.findIndex(
      node => exactPointMatch(node, endPoint)
    );
    
    // If not found, add to nodes collection
    if (existingStartIndex === -1) {
      const startNode = new Node(startPoint.x, startPoint.y);
      startNode.addWallId(id);
      this.nodes.push(startNode);
    } else {
      // Add this wall's ID to the existing node
      this.nodes[existingStartIndex].addWallId(id);
      
      // If this node now has more than one wall, it's not a true endpoint
      // but a junction - ensure it's not marked as an intersection
      if (this.nodes[existingStartIndex].wallIds.length > 1) {
        this.nodes[existingStartIndex].isIntersection = false;
      }
    }
    
    if (existingEndIndex === -1) {
      const endNode = new Node(endPoint.x, endPoint.y);
      endNode.addWallId(id);
      this.nodes.push(endNode);
    } else {
      // Add this wall's ID to the existing node
      this.nodes[existingEndIndex].addWallId(id);
      
      // If this node now has more than one wall, it's not a true endpoint
      // but a junction - ensure it's not marked as an intersection
      if (this.nodes[existingEndIndex].wallIds.length > 1) {
        this.nodes[existingEndIndex].isIntersection = false;
      }
    }
  }

  destroy() {
    this.deactivate();
    
    // Clean up renderers
    if (this.angleRenderer) {
      this.angleRenderer.destroy();
      this.angleRenderer = null;
    }
  }
}