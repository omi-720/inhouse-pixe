// src/core/history/Commands.js

/**
 * Base Command class (command pattern)
 */
export class Command {
    execute() {
      throw new Error('Execute method must be implemented by subclass');
    }
    
    undo() {
      throw new Error('Undo method must be implemented by subclass');
    }
  }
  
  /**
   * Command for adding a wall
   */
  export class AddWallCommand extends Command {
    constructor(wallTool, wall) {
      super();
      this.wallTool = wallTool;
      this.wall = wall;
      this.addedWallIndex = null;
    }
    
    execute() {
      console.log('Executing AddWallCommand for wall:', this.wall.id);
      
      // Add wall to the walls array
      this.wallTool.walls.push(this.wall);
      this.addedWallIndex = this.wallTool.walls.length - 1;
      
      // Update nodes collection with wall endpoints
      this.wallTool.updateNodes(this.wall);
      
      // Update renderer
      if (this.wallTool.wallRenderer) {
        this.wallTool.wallRenderer.render(
          this.wallTool.walls,
          this.wallTool.nodes,
          null,
          null,
          this.wallTool.mousePosition,
          true
        );
      }
      
      // Update outline renderer if available
      if (this.wallTool.outlineRenderer) {
        this.wallTool.outlineRenderer.render(this.wallTool.walls, null);
      }
    }
    
    undo() {
      console.log('Undoing AddWallCommand for wall:', this.wall.id);
      
      if (this.addedWallIndex !== null) {
        // Remove the wall from the array
        this.wallTool.walls.splice(this.addedWallIndex, 1);
        
        // Rebuild nodes from scratch to ensure consistency
        this.rebuildNodes();
        
        // Update renderer
        if (this.wallTool.wallRenderer) {
          this.wallTool.wallRenderer.render(
            this.wallTool.walls,
            this.wallTool.nodes,
            null,
            null,
            this.wallTool.mousePosition,
            true
          );
        }
        
        // Update outline renderer if available
        if (this.wallTool.outlineRenderer) {
          this.wallTool.outlineRenderer.render(this.wallTool.walls, null);
        }
      }
    }
    
    // Helper method to rebuild nodes from scratch
    rebuildNodes() {
      // Reset nodes array
      this.wallTool.nodes = [];
      
      // Recreate nodes for all existing walls
      this.wallTool.walls.forEach(wall => {
        this.wallTool.updateNodes(wall);
      });
    }
  }
  
  /**
   * Command for modifying a wall's properties (thickness or length)
   */
  export class ModifyWallCommand extends Command {
    constructor(selectTool, wall, property, oldValue, newValue) {
      super();
      this.selectTool = selectTool;
      this.wall = wall;
      this.property = property;
      this.oldValue = oldValue;
      this.newValue = newValue;
      
      // Store original wall data for undo
      if (property === 'length') {
        this.originalEnd = { ...wall.end };
      }
    }
    
    execute() {
      console.log(`Executing ModifyWallCommand: ${this.property} from ${this.oldValue} to ${this.newValue}`);
      
      if (this.property === 'thickness') {
        this.wall.thickness = this.newValue;
      } else if (this.property === 'length') {
        // Calculate direction
        const direction = {
          x: this.wall.end.x - this.wall.start.x,
          y: this.wall.end.y - this.wall.start.y
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
          x: this.wall.start.x + normalizedDir.x * this.newValue,
          y: this.wall.start.y + normalizedDir.y * this.newValue
        };
        
        // Update wall endpoint
        this.wall.updateEnd(newEnd);
      }
      
      // Update nodes
      if (this.selectTool.wallTool) {
        this.selectTool.wallTool.updateNodes(this.wall);
      }
      
      // Update renderer
      this.updateRenderers();
    }
    
    undo() {
      console.log(`Undoing ModifyWallCommand: ${this.property} from ${this.newValue} to ${this.oldValue}`);
      
      if (this.property === 'thickness') {
        this.wall.thickness = this.oldValue;
      } else if (this.property === 'length') {
        // Restore original endpoint
        this.wall.updateEnd(this.originalEnd);
      }
      
      // Update nodes
      if (this.selectTool.wallTool) {
        this.selectTool.wallTool.updateNodes(this.wall);
      }
      
      // Update renderer
      this.updateRenderers();
    }
    
    // Helper method to update renderers
    updateRenderers() {
      const nodes = this.selectTool.wallTool ? this.selectTool.wallTool.nodes : [];
      
      if (this.selectTool.wallRenderer) {
        this.selectTool.wallRenderer.render(
          this.selectTool.walls,
          nodes,
          null,
          this.wall,
          this.selectTool.lastMousePosition,
          false,
          this.selectTool.connectedWalls
        );
      }
    }
  }
  
  /**
   * Command for deleting a wall
   */
  export class DeleteWallCommand extends Command {
    constructor(selectTool, wall) {
      super();
      this.selectTool = selectTool;
      this.wall = wall;
      this.wallIndex = null;
      this.connectedWalls = []; // Store connected walls for restoration
    }
    
    execute() {
      console.log('Executing DeleteWallCommand for wall:', this.wall.id);
      
      // Find the wall's index in the walls array
      this.wallIndex = this.selectTool.walls.findIndex(w => w.id === this.wall.id);
      
      if (this.wallIndex !== -1) {
        // Store current connected walls for later restoration
        this.connectedWalls = [...this.selectTool.connectedWalls];
        
        // Remove the wall from the array
        this.selectTool.walls.splice(this.wallIndex, 1);
        
        // Rebuild nodes from scratch
        this.rebuildNodes();
        
        // Clear selection
        this.selectTool.clearSelection();
        
        // Update renderer
        this.updateRenderers();
      }
    }
    
    undo() {
      console.log('Undoing DeleteWallCommand for wall:', this.wall.id);
      
      if (this.wallIndex !== null && this.wallIndex !== -1) {
        // Add the wall back to the array at the same index
        this.selectTool.walls.splice(this.wallIndex, 0, this.wall);
        
        // Rebuild nodes from scratch
        this.rebuildNodes();
        
        // Re-select the wall and restore connected walls
        this.selectTool.selectObject(this.wall);
        this.selectTool.connectedWalls = [...this.connectedWalls];
        
        // Update renderer
        this.updateRenderers();
      }
    }
    
    // Helper method to rebuild nodes from scratch
    rebuildNodes() {
      if (!this.selectTool.wallTool) return;
      
      // Reset nodes array
      this.selectTool.wallTool.nodes = [];
      
      // Recreate nodes for all existing walls
      this.selectTool.walls.forEach(wall => {
        this.selectTool.wallTool.updateNodes(wall);
      });
    }
    
    // Helper method to update renderers
    updateRenderers() {
      const nodes = this.selectTool.wallTool ? this.selectTool.wallTool.nodes : [];
      
      if (this.selectTool.wallRenderer) {
        this.selectTool.wallRenderer.render(
          this.selectTool.walls,
          nodes,
          null,
          this.selectTool.selectedObject ? this.selectTool.selectedObject.object : null,
          this.selectTool.lastMousePosition,
          false,
          this.selectTool.connectedWalls
        );
      }
    }
  }