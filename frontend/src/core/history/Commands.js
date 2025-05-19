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

  // Add to src/core/history/Commands.js
// This content should be appended to the existing file

/**
 * Command for adding a circle
 */
export class AddCircleCommand extends Command {
  constructor(circleTool, circle) {
    super();
    this.circleTool = circleTool;
    this.circle = circle;
    this.addedCircleIndex = null;
  }
  
  execute() {
    console.log('Executing AddCircleCommand for circle:', this.circle.id);
    
    // Add circle to the circles array
    this.circleTool.circles.push(this.circle);
    this.addedCircleIndex = this.circleTool.circles.length - 1;
    
    // Update renderer
    if (this.circleTool.circleRenderer) {
      this.circleTool.circleRenderer.render(
        this.circleTool.circles,
        null,
        this.circleTool.mousePosition,
        null
      );
    }
    
    // Update outline renderer if available
    if (this.circleTool.outlineRenderer) {
      this.circleTool.outlineRenderer.render(this.circleTool.circles, null);
    }
  }
  
  undo() {
    console.log('Undoing AddCircleCommand for circle:', this.circle.id);
    
    if (this.addedCircleIndex !== null) {
      // Remove the circle from the array
      this.circleTool.circles.splice(this.addedCircleIndex, 1);
      
      // Update renderer
      if (this.circleTool.circleRenderer) {
        this.circleTool.circleRenderer.render(
          this.circleTool.circles,
          null,
          this.circleTool.mousePosition,
          null
        );
      }
      
      // Update outline renderer if available
      if (this.circleTool.outlineRenderer) {
        this.circleTool.outlineRenderer.render(this.circleTool.circles, null);
      }
    }
  }
}

/**
 * Command for modifying a circle's properties (center or radius)
 */
export class ModifyCircleCommand extends Command {
  constructor(selectTool, circle, property, oldValue, newValue) {
    super();
    this.selectTool = selectTool;
    this.circle = circle;
    this.property = property;
    this.oldValue = oldValue;
    this.newValue = newValue;
    
    // Store original circle data for undo
    if (property === 'center') {
      this.originalCenter = { ...circle.center };
    }
  }
  
  execute() {
    console.log(`Executing ModifyCircleCommand: ${this.property} from ${this.oldValue} to ${this.newValue}`);
    
    if (this.property === 'radius') {
      this.circle.updateRadius(this.newValue);
    } else if (this.property === 'center') {
      this.circle.updateCenter(this.newValue);
    }
    
    // Update renderer
    this.updateRenderers();
  }
  
  undo() {
    console.log(`Undoing ModifyCircleCommand: ${this.property} from ${this.newValue} to ${this.oldValue}`);
    
    if (this.property === 'radius') {
      this.circle.updateRadius(this.oldValue);
    } else if (this.property === 'center') {
      this.circle.updateCenter(this.originalCenter);
    }
    
    // Update renderer
    this.updateRenderers();
  }
  
  updateRenderers() {
    if (this.selectTool.circleRenderer) {
      this.selectTool.circleRenderer.render(
        this.selectTool.circles,
        null,
        this.selectTool.lastMousePosition,
        this.circle
      );
    }
  }
}

/**
 * Command for deleting a circle
 */
export class DeleteCircleCommand extends Command {
  constructor(selectTool, circle) {
    super();
    this.selectTool = selectTool;
    this.circle = circle;
    this.circleIndex = null;
  }
  
  execute() {
    console.log('Executing DeleteCircleCommand for circle:', this.circle.id);
    
    // Find the circle's index in the circles array
    this.circleIndex = this.selectTool.circles.findIndex(c => c.id === this.circle.id);
    
    if (this.circleIndex !== -1) {
      // Remove the circle from the array
      this.selectTool.circles.splice(this.circleIndex, 1);
      
      // Clear selection
      this.selectTool.clearSelection();
      
      // Update renderer
      this.updateRenderers();
    }
  }
  
  undo() {
    console.log('Undoing DeleteCircleCommand for circle:', this.circle.id);
    
    if (this.circleIndex !== null && this.circleIndex !== -1) {
      // Add the circle back to the array at the same index
      this.selectTool.circles.splice(this.circleIndex, 0, this.circle);
      
      // Re-select the circle
      this.selectTool.selectObject(this.circle);
      
      // Update renderer
      this.updateRenderers();
    }
  }
  
  updateRenderers() {
    if (this.selectTool.circleRenderer) {
      this.selectTool.circleRenderer.render(
        this.selectTool.circles,
        null,
        this.selectTool.lastMousePosition,
        this.selectTool.selectedObject ? this.selectTool.selectedObject.object : null
      );
    }
  }
}

/**
 * Command for adding a polygon
 */
export class AddPolygonCommand extends Command {
  constructor(polygonTool, polygon) {
    super();
    this.polygonTool = polygonTool;
    this.polygon = polygon;
    this.addedPolygonIndex = null;
  }
  
  execute() {
    console.log('Executing AddPolygonCommand for polygon:', this.polygon.id);
    
    // Add polygon to the polygons array
    this.polygonTool.polygons.push(this.polygon);
    this.addedPolygonIndex = this.polygonTool.polygons.length - 1;
    
    // Update renderer
    if (this.polygonTool.polygonRenderer) {
      this.polygonTool.polygonRenderer.render(
        this.polygonTool.polygons,
        null,
        this.polygonTool.mousePosition,
        null
      );
    }
    
    // Update outline renderer if available
    if (this.polygonTool.outlineRenderer) {
      this.polygonTool.outlineRenderer.render(this.polygonTool.polygons, null);
    }
  }
  
  undo() {
    console.log('Undoing AddPolygonCommand for polygon:', this.polygon.id);
    
    if (this.addedPolygonIndex !== null) {
      // Remove the polygon from the array
      this.polygonTool.polygons.splice(this.addedPolygonIndex, 1);
      
      // Update renderer
      if (this.polygonTool.polygonRenderer) {
        this.polygonTool.polygonRenderer.render(
          this.polygonTool.polygons,
          null,
          this.polygonTool.mousePosition,
          null
        );
      }
      
      // Update outline renderer if available
      if (this.polygonTool.outlineRenderer) {
        this.polygonTool.outlineRenderer.render(this.polygonTool.polygons, null);
      }
    }
  }
}

/**
 * Command for modifying a polygon's points
 */
export class ModifyPolygonCommand extends Command {
  constructor(selectTool, polygon, pointIndex, oldPoint, newPoint) {
    super();
    this.selectTool = selectTool;
    this.polygon = polygon;
    this.pointIndex = pointIndex;
    this.oldPoint = oldPoint;
    this.newPoint = newPoint;
  }
  
  execute() {
    console.log(`Executing ModifyPolygonCommand: point ${this.pointIndex} from (${this.oldPoint.x}, ${this.oldPoint.y}) to (${this.newPoint.x}, ${this.newPoint.y})`);
    
    this.polygon.updatePoint(this.pointIndex, this.newPoint);
    
    // Update renderer
    this.updateRenderers();
  }
  
  undo() {
    console.log(`Undoing ModifyPolygonCommand: point ${this.pointIndex} from (${this.newPoint.x}, ${this.newPoint.y}) to (${this.oldPoint.x}, ${this.oldPoint.y})`);
    
    this.polygon.updatePoint(this.pointIndex, this.oldPoint);
    
    // Update renderer
    this.updateRenderers();
  }
  
  updateRenderers() {
    if (this.selectTool.polygonRenderer) {
      this.selectTool.polygonRenderer.render(
        this.selectTool.polygons,
        null,
        this.selectTool.lastMousePosition,
        this.polygon
      );
    }
  }
}

/**
 * Command for deleting a polygon
 */
export class DeletePolygonCommand extends Command {
  constructor(selectTool, polygon) {
    super();
    this.selectTool = selectTool;
    this.polygon = polygon;
    this.polygonIndex = null;
  }
  
  execute() {
    console.log('Executing DeletePolygonCommand for polygon:', this.polygon.id);
    
    // Find the polygon's index in the polygons array
    this.polygonIndex = this.selectTool.polygons.findIndex(p => p.id === this.polygon.id);
    
    if (this.polygonIndex !== -1) {
      // Remove the polygon from the array
      this.selectTool.polygons.splice(this.polygonIndex, 1);
      
      // Clear selection
      this.selectTool.clearSelection();
      
      // Update renderer
      this.updateRenderers();
    }
  }
  
  undo() {
    console.log('Undoing DeletePolygonCommand for polygon:', this.polygon.id);
    
    if (this.polygonIndex !== null && this.polygonIndex !== -1) {
      // Add the polygon back to the array at the same index
      this.selectTool.polygons.splice(this.polygonIndex, 0, this.polygon);
      
      // Re-select the polygon
      this.selectTool.selectObject(this.polygon);
      
      // Update renderer
      this.updateRenderers();
    }
  }
  
  updateRenderers() {
    if (this.selectTool.polygonRenderer) {
      this.selectTool.polygonRenderer.render(
        this.selectTool.polygons,
        null,
        this.selectTool.lastMousePosition,
        this.selectTool.selectedObject ? this.selectTool.selectedObject.object : null
      );
    }
  }
}

export class AddZoneCommand extends Command {
  constructor(zoneTool, zone) {
    super();
    this.zoneTool = zoneTool;
    this.zone = zone;
    this.addedZoneIndex = null;
  }
  
  execute() {
    console.log('Executing AddZoneCommand for zone:', this.zone.id);
    
    // Add zone to the zones array
    this.zoneTool.zones.push(this.zone);
    this.addedZoneIndex = this.zoneTool.zones.length - 1;
    
    // Update renderer
    if (this.zoneTool.zoneRenderer) {
      this.zoneTool.zoneRenderer.render(
        this.zoneTool.zones,
        null,
        this.zoneTool.mousePosition,
        null
      );
    }
  }
  
  undo() {
    console.log('Undoing AddZoneCommand for zone:', this.zone.id);
    
    if (this.addedZoneIndex !== null) {
      // Remove the zone from the array
      this.zoneTool.zones.splice(this.addedZoneIndex, 1);
      
      // Update renderer
      if (this.zoneTool.zoneRenderer) {
        this.zoneTool.zoneRenderer.render(
          this.zoneTool.zones,
          null,
          this.zoneTool.mousePosition,
          null
        );
      }
    }
  }
}

/**
 * Command for modifying a zone's point
 */
export class ModifyZoneCommand extends Command {
  constructor(selectTool, zone, pointIndex, oldPoint, newPoint) {
    super();
    this.selectTool = selectTool;
    this.zone = zone;
    this.pointIndex = pointIndex;
    this.oldPoint = oldPoint;
    this.newPoint = newPoint;
  }
  
  execute() {
    console.log(`Executing ModifyZoneCommand: point ${this.pointIndex} from (${this.oldPoint.x}, ${this.oldPoint.y}) to (${this.newPoint.x}, ${this.newPoint.y})`);
    
    // Update the point
    this.zone.updatePoint(this.pointIndex, this.newPoint);
    
    // Update renderer
    this.updateRenderers();
  }
  
  undo() {
    console.log(`Undoing ModifyZoneCommand: point ${this.pointIndex} from (${this.newPoint.x}, ${this.newPoint.y}) to (${this.oldPoint.x}, ${this.oldPoint.y})`);
    
    // Restore the point
    this.zone.updatePoint(this.pointIndex, this.oldPoint);
    
    // Update renderer
    this.updateRenderers();
  }
  
  updateRenderers() {
    if (this.selectTool.zoneRenderer) {
      this.selectTool.zoneRenderer.render(
        this.selectTool.zones,
        null,
        this.selectTool.lastMousePosition,
        this.zone
      );
    }
  }
}

/**
 * Command for deleting a zone
 */
export class DeleteZoneCommand extends Command {
  constructor(selectTool, zone) {
    super();
    this.selectTool = selectTool;
    this.zone = zone;
    this.zoneIndex = null;
  }
  
  execute() {
    console.log('Executing DeleteZoneCommand for zone:', this.zone.id);
    
    // Find the zone's index in the zones array
    this.zoneIndex = this.selectTool.zones.findIndex(z => z.id === this.zone.id);
    
    if (this.zoneIndex !== -1) {
      // Remove the zone from the array
      this.selectTool.zones.splice(this.zoneIndex, 1);
      
      // Clear selection
      this.selectTool.clearSelection();
      
      // Update renderer
      this.updateRenderers();
    }
  }
  
  undo() {
    console.log('Undoing DeleteZoneCommand for zone:', this.zone.id);
    
    if (this.zoneIndex !== null && this.zoneIndex !== -1) {
      // Add the zone back to the array at the same index
      this.selectTool.zones.splice(this.zoneIndex, 0, this.zone);
      
      // Re-select the zone
      this.selectTool.selectObject(this.zone);
      
      // Update renderer
      this.updateRenderers();
    }
  }
  
  updateRenderers() {
    if (this.selectTool.zoneRenderer) {
      this.selectTool.zoneRenderer.render(
        this.selectTool.zones,
        null,
        this.selectTool.lastMousePosition,
        this.selectTool.selectedObject ? this.selectTool.selectedObject.object : null
      );
    }
  }
}

/**
 * Command for adding a zone divider
 */
export class AddZoneDividerCommand extends Command {
  constructor(zoneDividerTool, divider) {
    super();
    this.zoneDividerTool = zoneDividerTool;
    this.divider = divider;
    this.addedDividerIndex = null;
  }
  
  execute() {
    console.log('Executing AddZoneDividerCommand for divider:', this.divider.id);
    
    // Add divider to the dividers array
    this.zoneDividerTool.dividers.push(this.divider);
    this.addedDividerIndex = this.zoneDividerTool.dividers.length - 1;
    
    // Update renderer
    if (this.zoneDividerTool.zoneDividerRenderer) {
      this.zoneDividerTool.zoneDividerRenderer.render(
        this.zoneDividerTool.dividers,
        null,
        this.zoneDividerTool.mousePosition,
        null
      );
    }
  }
  
  undo() {
    console.log('Undoing AddZoneDividerCommand for divider:', this.divider.id);
    
    if (this.addedDividerIndex !== null) {
      // Remove the divider from the array
      this.zoneDividerTool.dividers.splice(this.addedDividerIndex, 1);
      
      // Update renderer
      if (this.zoneDividerTool.zoneDividerRenderer) {
        this.zoneDividerTool.zoneDividerRenderer.render(
          this.zoneDividerTool.dividers,
          null,
          this.zoneDividerTool.mousePosition,
          null
        );
      }
    }
  }
}

/**
 * Command for modifying a zone divider
 */
export class ModifyZoneDividerCommand extends Command {
  constructor(selectTool, divider, property, oldValue, newValue) {
    super();
    this.selectTool = selectTool;
    this.divider = divider;
    this.property = property;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }
  
  execute() {
    console.log(`Executing ModifyZoneDividerCommand: ${this.property}`);
    
    // Apply the change based on property type
    if (this.property === 'position') {
      // Position modification is special - it contains start and end points
      this.divider.updatePosition(
        this.newValue.start,
        this.newValue.end
      );
    } else {
      // Simple property update
      this.divider[this.property] = this.newValue;
    }
    
    // Update renderer
    this.updateRenderers();
  }
  
  undo() {
    console.log(`Undoing ModifyZoneDividerCommand: ${this.property}`);
    
    // Restore the original value based on property type
    if (this.property === 'position') {
      // Position modification is special - it contains start and end points
      this.divider.updatePosition(
        this.oldValue.start,
        this.oldValue.end
      );
    } else {
      // Simple property update
      this.divider[this.property] = this.oldValue;
    }
    
    // Update renderer
    this.updateRenderers();
  }
  
  updateRenderers() {
    if (this.selectTool.zoneDividerRenderer) {
      this.selectTool.zoneDividerRenderer.render(
        this.selectTool.dividers,
        null,
        this.selectTool.lastMousePosition,
        this.divider
      );
    }
  }
}

export class DeleteZoneDividerCommand extends Command {
  constructor(selectTool, divider) {
    super();
    this.selectTool = selectTool;
    this.divider = divider;
    this.dividerIndex = null;
  }
  
  execute() {
    console.log('Executing DeleteZoneDividerCommand for divider:', this.divider.id);
    
    // Find the divider's index in the dividers array
    this.dividerIndex = this.selectTool.dividers.findIndex(d => d.id === this.divider.id);
    
    if (this.dividerIndex !== -1) {
      // Remove the divider from the array
      this.selectTool.dividers.splice(this.dividerIndex, 1);
      
      // Clear selection
      this.selectTool.clearSelection();
      
      // Update renderer
      this.updateRenderers();
    }
  }
  
  undo() {
    console.log('Undoing DeleteZoneDividerCommand for divider:', this.divider.id);
    
    if (this.dividerIndex !== null && this.dividerIndex !== -1) {
      // Add the divider back to the array at the same index
      this.selectTool.dividers.splice(this.dividerIndex, 0, this.divider);
      
      // Re-select the divider
      this.selectTool.selectObject(this.divider);
      
      // Update renderer
      this.updateRenderers();
    }
  }
  
  updateRenderers() {
    if (this.selectTool.zoneDividerRenderer) {
      this.selectTool.zoneDividerRenderer.render(
        this.selectTool.dividers,
        null,
        this.selectTool.lastMousePosition,
        this.selectTool.selectedObject ? this.selectTool.selectedObject.object : null
      );
    }
  }
}

/**
 * Command for adding an arc
 */
export class AddArcCommand extends Command {
  constructor(arcTool, arc) {
    super();
    this.arcTool = arcTool;
    this.arc = arc;
    this.addedArcIndex = null;
  }
  
  execute() {
    console.log('Executing AddArcCommand for arc:', this.arc.id);
    
    // Add arc to the arcs array
    this.arcTool.arcs.push(this.arc);
    this.addedArcIndex = this.arcTool.arcs.length - 1;
    
    // Update renderer
    if (this.arcTool.arcRenderer) {
      this.arcTool.arcRenderer.render(
        this.arcTool.arcs,
        null,
        this.arcTool.mousePosition,
        null
      );
    }
  }
  
  undo() {
    console.log('Undoing AddArcCommand for arc:', this.arc.id);
    
    if (this.addedArcIndex !== null) {
      // Remove the arc from the array
      this.arcTool.arcs.splice(this.addedArcIndex, 1);
      
      // Update renderer
      if (this.arcTool.arcRenderer) {
        this.arcTool.arcRenderer.render(
          this.arcTool.arcs,
          null,
          this.arcTool.mousePosition,
          null
        );
      }
    }
  }
}

/**
 * Command for modifying an arc
 */
export class ModifyArcCommand extends Command {
  constructor(selectTool, arc, property, oldValue, newValue) {
    super();
    this.selectTool = selectTool;
    this.arc = arc;
    this.property = property;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }
  
  execute() {
    console.log(`Executing ModifyArcCommand: ${this.property}`);
    
    // Apply the change based on property type
    switch (this.property) {
      case 'center':
        this.arc.updateCenter(this.newValue);
        break;
      case 'radius':
        this.arc.updateRadius(this.newValue);
        break;
      case 'angles':
        this.arc.updateAngles(
          this.newValue.startAngle,
          this.newValue.endAngle
        );
        break;
      default:
        // Simple property update
        this.arc[this.property] = this.newValue;
        break;
    }
    
    // Update renderer
    this.updateRenderers();
  }
  
  undo() {
    console.log(`Undoing ModifyArcCommand: ${this.property}`);
    
    // Restore the original value based on property type
    switch (this.property) {
      case 'center':
        this.arc.updateCenter(this.oldValue);
        break;
      case 'radius':
        this.arc.updateRadius(this.oldValue);
        break;
      case 'angles':
        this.arc.updateAngles(
          this.oldValue.startAngle,
          this.oldValue.endAngle
        );
        break;
      default:
        // Simple property update
        this.arc[this.property] = this.oldValue;
        break;
    }
    
    // Update renderer
    this.updateRenderers();
  }
  
  updateRenderers() {
    if (this.selectTool.arcRenderer) {
      this.selectTool.arcRenderer.render(
        this.selectTool.arcs,
        null,
        this.selectTool.lastMousePosition,
        this.arc
      );
    }
  }
}

/**
 * Command for deleting an arc
 */
export class DeleteArcCommand extends Command {
  constructor(selectTool, arc) {
    super();
    this.selectTool = selectTool;
    this.arc = arc;
    this.arcIndex = null;
  }
  
  execute() {
    console.log('Executing DeleteArcCommand for arc:', this.arc.id);
    
    // Find the arc's index in the arcs array
    this.arcIndex = this.selectTool.arcs.findIndex(a => a.id === this.arc.id);
    
    if (this.arcIndex !== -1) {
      // Remove the arc from the array
      this.selectTool.arcs.splice(this.arcIndex, 1);
      
      // Clear selection
      this.selectTool.clearSelection();
      
      // Update renderer
      this.updateRenderers();
    }
  }
  
  undo() {
    console.log('Undoing DeleteArcCommand for arc:', this.arc.id);
    
    if (this.arcIndex !== null && this.arcIndex !== -1) {
      // Add the arc back to the array at the same index
      this.selectTool.arcs.splice(this.arcIndex, 0, this.arc);
      
      // Re-select the arc
      this.selectTool.selectObject(this.arc);
      
      // Update renderer
      this.updateRenderers();
    }
  }
  
  updateRenderers() {
    if (this.selectTool.arcRenderer) {
      this.selectTool.arcRenderer.render(
        this.selectTool.arcs,
        null,
        this.selectTool.lastMousePosition,
        this.selectTool.selectedObject ? this.selectTool.selectedObject.object : null
      );
    }
  }
}