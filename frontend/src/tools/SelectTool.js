// src/tools/SelectTool.js
import { pixelsToMeters } from '../core/geometry/MeasurementUtils';
import { ModifyWallCommand, DeleteWallCommand } from '../core/history/Commands';

export default class SelectTool {
  constructor(pixiRenderer, wallRenderer, walls, historyManager) {
    this.pixiRenderer = pixiRenderer;
    this.wallRenderer = wallRenderer;
    this.walls = walls || [];
    this.active = false;
    this.selectedObject = null;
    this.lastMousePosition = null;
    this.selectionThreshold = pixelsToMeters(15); // Distance threshold in meters
    this.historyManager = historyManager;

    // Add tracking for connected walls
    this.connectedWalls = [];
    
    // Selection change callback
    this.onSelectionChange = null;
    
    // Bind methods
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    
  }
    
    setWalls(walls) {
      this.walls = walls;
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
      
      // Try to select a wall
      const selectedWall = this.findWallNearPoint(worldPos);
      
      // Update selection
      if (selectedWall) {
        this.selectObject(selectedWall);
      } else {
        this.clearSelection();
      }
      
      // Get the nodes from WallTool for proper connected wall rendering
      const nodes = this.wallTool ? this.wallTool.nodes : [];
      
      // Render with the selected wall and nodes
      if (this.wallRenderer) {
        this.wallRenderer.render(
          this.walls, 
          nodes,
          null, 
          this.selectedObject ? this.selectedObject.object : null,
          worldPos
        );
      }
    }
    
    onMouseMove(e) {
      if (!this.active) return;
      
      const worldPos = this.pixiRenderer.getWorldMousePosition(e);
      // Store the position for later use
      this.lastMousePosition = worldPos;
      
      // Existing code...
      
      // Get the nodes from WallTool for proper hover effects
      const nodes = this.wallTool ? this.wallTool.nodes : [];
      
      // Render walls with hover position for node highlighting
      if (this.wallRenderer) {
        this.wallRenderer.render(
          this.walls, 
          nodes,
          null, 
          this.selectedObject ? this.selectedObject.object : null,
          worldPos,
          true,
          this.selectedObject ? this.selectedObject.connectedWalls : [] // Always pass connected walls
        );
      }
    }
    
    onMouseUp(e) {
      if (!this.active) return;
      // Nothing specific needed for now
    }
    
    // Find the closest wall to a point
    findWallNearPoint(point) {
        if (!this.walls || !this.walls.length) return null;
        
        let closestWall = null;
        let minDistance = Infinity;
        
        this.walls.forEach(wall => {
          // Check if point is near the actual wall boundary based on current thickness
          // First check distance to the centerline
          const lineDist = this.pointToLineDistance(point, wall.start, wall.end);
          
          // Only consider this wall if we're within half the thickness plus selection threshold
          if (lineDist <= (wall.thickness / 2 + this.selectionThreshold)) {
            // Now check if we're within the wall's length (plus a little buffer)
            const wallDirX = wall.end.x - wall.start.x;
            const wallDirY = wall.end.y - wall.start.y;
            const wallLength = Math.hypot(wallDirX, wallDirY);
            
            if (wallLength > 0) {
              // Project the point onto the wall's direction
              const t = ((point.x - wall.start.x) * wallDirX + (point.y - wall.start.y) * wallDirY) / 
                       (wallLength * wallLength);
                       
              // Check if projection is within the wall's length (with buffer)
              if (t >= -0.1 && t <= 1.1) {
                if (lineDist < minDistance) {
                  minDistance = lineDist;
                  closestWall = wall;
                }
              }
            }
          }
        });
        
        return closestWall;
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
      
      // Find connected walls when selecting a wall
      this.connectedWalls = this.findConnectedWalls(object);
      
      this.selectedObject = {
        type: 'wall',
        object: object,
        id: object.id,
        connectedWalls: this.connectedWalls // Add connected walls to selection object
      };
      
      if (this.onSelectionChange) {
        this.onSelectionChange(this.selectedObject);
      }
    }

    findConnectedWalls(wall) {
      if (!wall || !this.walls || !this.walls.length) return [];
      
      const connectedWalls = [];
      
      // Get nodes from WallTool
      const nodes = this.wallTool ? this.wallTool.nodes : [];
      if (!nodes || !nodes.length) return [];
      
      // Find nodes at the start and end points of the wall
      const startNode = nodes.find(node => 
        Math.abs(node.x - wall.start.x) < 0.01 && 
        Math.abs(node.y - wall.start.y) < 0.01
      );
      
      const endNode = nodes.find(node => 
        Math.abs(node.x - wall.end.x) < 0.01 && 
        Math.abs(node.y - wall.end.y) < 0.01
      );
      
      // Find connected walls from start node
      if (startNode && startNode.wallIds) {
        startNode.wallIds.forEach(wallId => {
          if (wallId !== wall.id) {
            const connectedWall = this.walls.find(w => w.id === wallId);
            if (connectedWall) {
              connectedWalls.push(connectedWall);
            }
          }
        });
      }
      
      // Find connected walls from end node
      if (endNode && endNode.wallIds) {
        endNode.wallIds.forEach(wallId => {
          if (wallId !== wall.id && !connectedWalls.some(w => w.id === wallId)) {
            const connectedWall = this.walls.find(w => w.id === wallId);
            if (connectedWall) {
              connectedWalls.push(connectedWall);
            }
          }
        });
      }
      
      // Limit to maximum 2 connected walls (one at each end)
      return connectedWalls.slice(0, 2);
    }
    
    clearSelection() {
      const hadSelection = this.selectedObject !== null;
      this.selectedObject = null;
      this.connectedWalls = [];
      
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
      
      if (property === 'thickness') {
        oldValue = object.thickness;
        
        // Limit thickness to sensible values
        if (value < 0.01) value = 0.01; // Minimum 1cm
        if (value > 5) value = 5; // Maximum 5m
      } else if (property === 'length') {
        oldValue = object.length;
      }
      
      // Create and execute a ModifyWallCommand
      if (this.historyManager) {
        const command = new ModifyWallCommand(this, object, property, oldValue, value);
        this.historyManager.executeCommand(command);
      } else {
        // Fallback to original implementation for backward compatibility
        if (property === 'thickness') {
          object.thickness = value;
        } else if (property === 'length') {
          // Changing length requires recalculating endpoint
          const direction = {
            x: object.end.x - object.start.x,
            y: object.end.y - object.start.y
          };
          
          // Normalize direction
          const currentLength = Math.hypot(direction.x, direction.y);
          if (currentLength === 0) return;
          
          const normalizedDir = {
            x: direction.x / currentLength,
            y: direction.y / currentLength
          };
          
          // Calculate new endpoint
          const newEnd = {
            x: object.start.x + normalizedDir.x * value,
            y: object.start.y + normalizedDir.y * value
          };
          
          // Update wall endpoint
          object.updateEnd(newEnd);
        }
        
        // Update nodes to maintain connections
        if (this.wallTool && typeof this.wallTool.updateNodes === 'function') {
          this.wallTool.updateNodes(object);
        }
        
        // Update the wall's appearance after modifying its properties
        this.renderSelectedWall();
      }
      
      // Let the sidebar know about the change
      if (this.onSelectionChange) {
        // Create a new object reference to trigger React update
        this.onSelectionChange({ 
          ...this.selectedObject,
          connectedWalls: this.connectedWalls 
        });
      }
    }


  deleteSelectedWall() {
    if (!this.selectedObject) return;
    
    const wall = this.selectedObject.object;
    
    // Create and execute a DeleteWallCommand
    if (this.historyManager) {
      const command = new DeleteWallCommand(this, wall);
      this.historyManager.executeCommand(command);
    } else {
      // Fallback implementation
      const wallIndex = this.walls.findIndex(w => w.id === wall.id);
      
      if (wallIndex !== -1) {
        // Remove the wall from the array
        this.walls.splice(wallIndex, 1);
        
        // Rebuild nodes
        if (this.wallTool) {
          this.wallTool.nodes = [];
          this.walls.forEach(w => {
            this.wallTool.updateNodes(w);
          });
        }
        
        // Clear selection
        this.clearSelection();
        
        // Update renderer
        this.renderSelectedWall();
      }
    }
  }


  renderSelectedWall() {
    // Get the nodes for proper rendering
    const nodes = this.wallTool ? this.wallTool.nodes : [];
    
    // Update the wall's appearance after modifying its properties
    if (this.wallRenderer) {
      this.wallRenderer.render(
        this.walls, 
        nodes,
        null, 
        this.selectedObject ? this.selectedObject.object : null,
        this.lastMousePosition,
        false,
        this.connectedWalls
      );
    }
  }
    
    destroy() {
      this.deactivate();
    }
  }