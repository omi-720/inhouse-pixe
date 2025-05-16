// src/renderers/WallRenderer.js
import { Graphics, Text } from 'pixi.js';
import { buildWallPolygon } from '../core/geometry/GeometryUtils';
import { 
  formatDistance, 
  calculateWallMidpoint,
  calculateWallAngle,
  getWallBounds,
  isObjectInViewport,
  PIXELS_PER_METER,
  metersToPixels, 
  pixelsToMeters
} from '../core/geometry/MeasurementUtils';

export default class WallRenderer {
  constructor(pixiRenderer) {
    this.pixiRenderer = pixiRenderer;
    this.app = pixiRenderer.app;
    this.graphics = new Graphics();
    
    // Initialize the measurement texts map properly
    this.measurementTexts = new Map();
    
    // Create dedicated graphics for nodes in UI layer
    this.nodeGraphics = new Graphics();
    
    // Create separate graphics for hatch patterns so they don't get cleared
    this.hatchGraphics = new Graphics();
    
    // Initialize connected walls
    this.connectedWalls = [];
    
    // Create a specific graphics object for connected walls
    this.connectedWallsGraphics = new Graphics();
    
    // Make sure the graphics are added to the right layer
    const wallsLayer = this.pixiRenderer.sceneManager?.getLayer('walls');
    if (wallsLayer) {
      wallsLayer.addChild(this.graphics);
      wallsLayer.addChild(this.hatchGraphics);
      wallsLayer.addChild(this.connectedWallsGraphics);
    } else {
      console.warn('Walls layer not found, falling back to stage');
      this.app.stage.addChild(this.graphics);
      this.app.stage.addChild(this.hatchGraphics);
      this.app.stage.addChild(this.connectedWallsGraphics);
    }
    
    // Add node graphics to UI layer
    const uiLayer = this.pixiRenderer.sceneManager?.getLayer('ui');
    if (uiLayer) {
      uiLayer.addChild(this.nodeGraphics);
    } else {
      this.app.stage.addChild(this.nodeGraphics);
    }
    
    // Bind the update method for attaching to the render loop
    this.update = this.update.bind(this);
    
    // Store the current selected wall for persistent updates
    this.selectedWall = null;
    
    // Start the update loop if app exists
    if (this.app) {
      this.app.ticker.add(this.update);
    }
  }

  getStrokeWidthForZoom(zoom) {
  // Base width in world units (meters)
  const baseWidth = 0.02;
  
  // Apply inverse scaling but ensure a minimum width
  // This ensures visibility at high zoom levels
  const calculatedWidth = baseWidth / Math.sqrt(zoom) * 0.5;
  
  // Ensure a minimum visible thickness (in meters)
  return Math.max(calculatedWidth, 0.001);
}
  
  
  
  // Add an update method that will run on every frame
  update() {
    // Update text positions for all visible measurements
    this.updateAllTextPositions();
    
    // Update node indicators
    this.updateNodeIndicators();
    
    // Update hatch patterns for selected walls
    this.updateHatchPatterns();
  }


 
  
  
  // Add this new method to your WallRenderer.js
  updateNodeIndicators() {
    // Skip if no camera or no mouse position
    if (!this.pixiRenderer.camera || !this._lastRenderParams || !this._lastRenderParams.mousePosition) return;
    
    const { nodes, mousePosition } = this._lastRenderParams;
    if (!nodes || !mousePosition) return;
    
    // Clear previous graphics
    this.nodeGraphics.clear();
    if (this.snapGraphics) this.snapGraphics.clear();
    
    // Fixed size in pixels for dots
    const dotSize = 5;
    const zoom = this.pixiRenderer.camera.getZoomLevel();
    
    // Get threshold scaled with zoom
    const threshold = 0.05 / Math.max(0.1, Math.sqrt(zoom));
    
    // Find nearest node for snap indicator
    const nearestNode = this.findNearestNode(nodes, mousePosition, threshold);
    
    // Draw nearest node snap indicator (blue) if found
    if (nearestNode) {
      if (!this.snapGraphics) {
        this.snapGraphics = new Graphics();
        const uiLayer = this.pixiRenderer.sceneManager?.getLayer('ui');
        if (uiLayer) {
          uiLayer.addChild(this.snapGraphics);
        } else {
          this.app.stage.addChild(this.snapGraphics);
        }
      }
      
      const screenPos = this.pixiRenderer.camera.worldToScreen(nearestNode.x, nearestNode.y);
      this.snapGraphics.circle(screenPos.x, screenPos.y, 6);
      this.snapGraphics.fill({ color: 0x0066ff, alpha: 1 });
    }
    
    // Draw endpoint indicators (blue)
    const nodeColor = 0x0066ff;
    nodes.forEach(node => {
      // Only show true endpoints
      if (node.wallIds.length === 1) {
        const distance = Math.hypot(node.x - mousePosition.x, node.y - mousePosition.y);
        if (distance < threshold) {
          const screenPos = this.pixiRenderer.camera.worldToScreen(node.x, node.y);
          this.nodeGraphics.circle(screenPos.x, screenPos.y, dotSize);
          this.nodeGraphics.fill({ color: nodeColor, alpha: 1 });
        }
      }
    });
  }
  
  // New method to update all text positions
  updateAllTextPositions() {
    // Skip if no camera
    if (!this.pixiRenderer.camera) return;
    
    // Update each text position based on its wall
    this.measurementTexts.forEach((textObj, wallId) => {
      // Skip if text isn't visible
      if (!textObj.visible) return;
      
      // Find the wall for this text
      const wall = textObj.wall;
      if (!wall) return;
      
      // Get the wall midpoint
      const midpoint = calculateWallMidpoint(wall);
      
      // Convert to screen coordinates
      const screenPos = this.pixiRenderer.camera.worldToScreen(midpoint.x, midpoint.y);
      
      // Update text position
      textObj.position.set(screenPos.x, screenPos.y);
      
      // Get the wall angle and adjust text rotation
      const angle = calculateWallAngle(wall);
      
      // Adjust text rotation to be readable but in screen coordinates
      let rotation = angle;
      if (angle > Math.PI/2 || angle < -Math.PI/2) {
        rotation += Math.PI; // Flip text if wall is mostly vertical
      }
      textObj.rotation = rotation;
    });
  }
 

  forceUpdate() {
    // Update immediately
    this.update();
    
    // Re-render with the last parameters
    if (this._lastRenderParams) {
      const { walls, nodes, currentWall, selectedWall, mousePosition, skipOutlines } = this._lastRenderParams;
      this.render(walls, nodes, currentWall, selectedWall, mousePosition, skipOutlines);
    }
  }


  findNearestNode(nodes, pos, threshold = 0.05) { // Fixed 5cm threshold
    if (!nodes || !nodes.length || !pos) return null;
    
    let nearestNode = null;
    let minDistance = Infinity;
    
    nodes.forEach(node => {
      // ONLY consider true endpoints (connected to one wall)
      if (node.wallIds.length === 1) {
        const distance = Math.hypot(node.x - pos.x, node.y - pos.y);
        if (distance < threshold && distance < minDistance) {
          minDistance = distance;
          nearestNode = node;
        }
      }
    });
    
    return nearestNode;
  }

  // Complete fixed render method
render(walls, nodes, currentWall = null, selectedWall = null, mousePosition = null, skipOutlines = false, connectedWalls = []) {
  // Store parameters including connected walls
  this._lastRenderParams = { 
    walls, 
    nodes, 
    currentWall, 
    selectedWall, 
    mousePosition, 
    skipOutlines, 
    connectedWalls 
  };
  
  // Update stored walls
  this.selectedWall = selectedWall;
  this.connectedWalls = connectedWalls || [];
  
  // Start with a clean slate
  this.graphics.clear();
  this.hatchGraphics.clear();
  this.connectedWallsGraphics.clear();
  
  // Get camera for culling and LOD
  const camera = this.pixiRenderer.camera;
  const zoom = camera ? camera.getZoomLevel() : 1;
  
  // Calculate detail level based on zoom
  const detailLevel = this.calculateDetailLevel(zoom);
  
  // Calculate viewport bounds for culling
  const viewportBounds = this.getViewportBounds();
  
  // CRITICAL CHANGE: Only hide measurements for walls that are not selected, connected, current, or previous
  // Create sets for quick lookup
  const selectedWallId = selectedWall ? selectedWall.id : null;
  const connectedWallIds = new Set(connectedWalls.map(wall => wall.id));
  const currentWallId = currentWall ? currentWall.id : null;
  const previousWallId = (walls.length > 0) ? walls[walls.length - 1].id : null;
  
  this.measurementTexts.forEach((textObj, wallId) => {
    // Keep measurement visible if it's the selected wall, connected wall, current wall, or previous wall
    if (wallId === selectedWallId || 
        connectedWallIds.has(wallId) || 
        wallId === currentWallId || 
        wallId === previousWallId) {
      // Keep it visible
      if (textObj.wall) {
        textObj.visible = true; 
      }
    } else {
      // Hide others
      textObj.visible = false;
    }
  });
  
  // Draw ALL walls (existing and current) with white fill
  const allWalls = [...walls];
  if (currentWall) allWalls.push(currentWall);
  
  // First pass: Draw all wall fills
  allWalls.forEach(wall => {
    const wallBounds = getWallBounds(wall, wall.thickness);
    if (viewportBounds && !isObjectInViewport(wallBounds, viewportBounds)) {
      return;
    }
    
    // Draw wall fill - always white - PASS ZOOM PARAMETER HERE
    this.drawWallFill(wall, allWalls, 0xFFFFFF, 1, zoom, detailLevel);
  });
  
  // Draw hatch pattern for selected wall using dedicated graphics
  if (selectedWall) {
    const wallBounds = getWallBounds(selectedWall, selectedWall.thickness);
    if (!viewportBounds || isObjectInViewport(wallBounds, viewportBounds)) {
      this.drawWallHatchPattern(
        selectedWall, 
        allWalls, 
        0x0066ff, // Blue for selected wall
        zoom, // PASS ZOOM PARAMETER HERE
        detailLevel,
        this.hatchGraphics
      );
    }
  }
  
  // Draw hatch patterns for connected walls using a different color
  if (this.connectedWalls && this.connectedWalls.length > 0) {
    this.connectedWalls.forEach(connectedWall => {
      const wallBounds = getWallBounds(connectedWall, connectedWall.thickness);
      if (!viewportBounds || isObjectInViewport(wallBounds, viewportBounds)) {
        this.drawWallHatchPattern(
          connectedWall, 
          allWalls, 
          0x00AA66, // Light green for connected walls
          zoom, // PASS ZOOM PARAMETER HERE
          detailLevel,
          this.connectedWallsGraphics
        );
      }
    });
  }
  
  // Draw outlines if not skipped
  if (!skipOutlines) {
    allWalls.forEach(wall => {
      const wallBounds = getWallBounds(wall, wall.thickness);
      if (viewportBounds && !isObjectInViewport(wallBounds, viewportBounds)) {
        return;
      }
      
      // Use preview color for current wall, regular color for others
      const color = (wall === currentWall) ? 0x0066ff : 0x000000;
      const alpha = (wall === currentWall) ? 0.8 : 1.0;
      
      // Draw the outline - PASS ZOOM PARAMETER HERE
      this.drawWallOutline(wall, allWalls, color, alpha, zoom, detailLevel);
    });
  }
  
  // Show measurements for selected and connected walls
  if (selectedWall) {
    this.updateWallMeasurement(selectedWall, zoom, detailLevel);
    
    // Also show measurements for connected walls
    if (this.connectedWalls && this.connectedWalls.length > 0) {
      this.connectedWalls.forEach(connectedWall => {
        this.updateWallMeasurement(connectedWall, zoom, detailLevel);
      });
    }
  }
  
  // Show measurements for current wall and previous wall when drawing
  if (currentWall) {
    this.updateWallMeasurement(currentWall, zoom, detailLevel);
    
    if (walls.length > 0) {
      const previousWall = walls[walls.length - 1];
      this.updateWallMeasurement(previousWall, zoom, detailLevel);
    }
  }
  
  // Draw snap indicator
  if (currentWall && mousePosition) {
    const nearestNode = this.findNearestNode(nodes, mousePosition);
    if (nearestNode) {
      this.drawSnapIndicator(nearestNode, zoom);
    }
  }
  
  // Draw nodes - always last to be on top
  if (detailLevel > 0 && mousePosition) {
    this.drawNodes(nodes, zoom, mousePosition, detailLevel);
  }
  
  console.log("Zoom:", zoom, "Scale:", this.pixiRenderer.camera.getPixelsPerMeter?.());
}
drawWallHatchPattern(wall, allWalls, color, zoom = 1, detailLevel = 2, graphicsObj = null) {
  // Use provided graphics or default to main graphics
  const g = graphicsObj || this.graphics;
  
  const polygon = buildWallPolygon(wall, allWalls);
  if (!polygon) return;
  
  const { line1Start, line1End, line2Start, line2End } = polygon;
  
  // Calculate wall length in meters
  const wallLength = Math.hypot(
    wall.end.x - wall.start.x,
    wall.end.y - wall.start.y
  );
  
  if (wallLength === 0) return;
  
  // Calculate hatch spacing based on detail level (in meters)
  let hatchSpacing;
  switch(detailLevel) {
    case 0: return; // No hatching for ultra low detail
    case 1: hatchSpacing = Math.max(0.2, wall.thickness); break;
    case 2: hatchSpacing = Math.max(0.1, wall.thickness / 1.5); break;
    case 3: hatchSpacing = Math.max(0.05, wall.thickness / 2); break;
    case 4: hatchSpacing = Math.max(0.02, wall.thickness / 3); break;
  }
  
  const numLines = Math.ceil(wallLength / hatchSpacing) + 1;
  
  // Calculate appropriate stroke width for current zoom
  const strokeWidth = this.getStrokeWidthForZoom(zoom);
  
  // Draw diagonal lines from the first edge to the second edge
  for (let i = 0; i < numLines; i++) {
    const t = i / (numLines - 1);
    
    // Interpolate points along both edges
    const x1 = line1Start.x + t * (line1End.x - line1Start.x);
    const y1 = line1Start.y + t * (line1End.y - line1Start.y);
    const x2 = line2Start.x + t * (line2End.x - line2Start.x);
    const y2 = line2Start.y + t * (line2End.y - line2Start.y);
    
    // Draw line from edge 1 to edge 2
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    
    // Use the SAME line width as the wall outlines for consistency
    g.setStrokeStyle({
      color: color,
      width: strokeWidth, // Dynamic width based on zoom
      alpha: 0.8
    });
    g.stroke();
  }
}
  
  // Modify updateHatchPatterns to include connected walls
  updateHatchPatterns() {
    // Clear previous hatch patterns
    this.hatchGraphics.clear();
    this.connectedWallsGraphics.clear();
    
    // Get walls from last render
    const walls = this._lastRenderParams?.walls || [];
    
    // Skip if no camera
    if (!this.pixiRenderer.camera) return;
    
    const zoom = this.pixiRenderer.camera.getZoomLevel();
    const detailLevel = this.calculateDetailLevel(zoom);
    
    // Draw hatch pattern for selected wall
    if (this.selectedWall) {
      this.drawWallHatchPattern(
        this.selectedWall, 
        walls, 
        0x0066ff, // Blue for selected
        zoom, 
        detailLevel,
        this.hatchGraphics
      );
    }
    
    // Draw hatch patterns for connected walls
    if (this.connectedWalls && this.connectedWalls.length > 0) {
      this.connectedWalls.forEach(connectedWall => {
        this.drawWallHatchPattern(
          connectedWall, 
          walls, 
          0x00AA66, // Light green for connected
          zoom, 
          detailLevel,
          this.connectedWallsGraphics
        );
      });
    }
  }
  
  // Add this helper method to draw wall outlines
  drawWallOutline(wall, allWalls, color, alpha, zoom, detailLevel) {
  const polygon = buildWallPolygon(wall, allWalls, zoom);
  if (!polygon) return;
  
  const { line1Start, line1End, line2End, line2Start } = polygon;
  
  this.graphics.moveTo(line1Start.x, line1Start.y);
  this.graphics.lineTo(line1End.x, line1End.y);
  this.graphics.lineTo(line2End.x, line2End.y);
  this.graphics.lineTo(line2Start.x, line2Start.y);
  this.graphics.lineTo(line1Start.x, line1Start.y);
  
  // Calculate appropriate stroke width for current zoom
  const strokeWidth = this.getStrokeWidthForZoom(zoom);
  
  this.graphics.stroke({ 
    color: color, 
    width: strokeWidth, // Dynamic width based on zoom
    alpha: alpha,
    join: 'miter',
    cap: 'square'
  });
}
  
  // Update destroy method to clean up new graphics
  destroy() {
    // Remove ticker update
    if (this.app) {
      this.app.ticker.remove(this.update);
    }
    
    // Clean up all measurement texts
    this.cleanupMeasurementTexts([]);
    
    // Clean up graphics
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    
    if (this.hatchGraphics) {
      this.hatchGraphics.destroy();
      this.hatchGraphics = null;
    }
    
    if (this.connectedWallsGraphics) {
      this.connectedWallsGraphics.destroy();
      this.connectedWallsGraphics = null;
    }
    
    if (this.nodeGraphics) {
      this.nodeGraphics.destroy();
      this.nodeGraphics = null;
    }
    
    if (this.snapGraphics) {
      this.snapGraphics.destroy();
      this.snapGraphics = null;
    }
  }



    
    // Calculate detail level based on zoom and real-world scale
    calculateDetailLevel(zoom) {
      // Define zoom thresholds for different detail levels in terms of meters visible on screen
      // 0 = ultra low (distant view), 4 = ultra high (very close)
      if (zoom < 0.001) return 0;      // Showing >1km per screen - minimal details
      if (zoom < 0.01) return 1;       // 100m view - basic details 
      if (zoom < 0.1) return 2;        // 10m view - medium details
      if (zoom < 1.0) return 3;        // 1m view - high details
      return 4;                        // <1m view - ultra high details
    }
    
    // Find walls directly connected to the selected wall
    findDirectlyConnectedWalls(selectedWall, allWalls, nodes) {
      const connectedWallIds = new Set([selectedWall.id]);
      
      // Find nodes at both endpoints of the selected wall
      const startNode = nodes.find(node => 
        Math.abs(node.x - selectedWall.start.x) < 0.1 && 
        Math.abs(node.y - selectedWall.start.y) < 0.1
      );
      
      const endNode = nodes.find(node => 
        Math.abs(node.x - selectedWall.end.x) < 0.1 && 
        Math.abs(node.y - selectedWall.end.y) < 0.1
      );
      
      // Check connected walls at the start node
      if (startNode) {
        startNode.wallIds.forEach(wallId => {
          if (wallId !== selectedWall.id) {
            connectedWallIds.add(wallId);
          }
        });
      }
      
      // Check connected walls at the end node
      if (endNode) {
        endNode.wallIds.forEach(wallId => {
          if (wallId !== selectedWall.id) {
            connectedWallIds.add(wallId);
          }
        });
      }
      
      return connectedWallIds;
    }

  // Simplified diagonal hatch pattern for Pixi.js v8 with detail scaling
  drawWallHatchPattern(wall, allWalls, color, zoom = 1, detailLevel = 2, graphicsObj = null) {
    // Use provided graphics or default to main graphics
    const g = graphicsObj || this.graphics;
    
    const polygon = buildWallPolygon(wall, allWalls);
    if (!polygon) return;
    
    const { line1Start, line1End, line2Start, line2End } = polygon;
    
    // Calculate wall length in meters
    const wallLength = Math.hypot(
      wall.end.x - wall.start.x,
      wall.end.y - wall.start.y
    );
    
    if (wallLength === 0) return;
    
    // Calculate hatch spacing based on detail level (in meters)
    let hatchSpacing;
    switch(detailLevel) {
      case 0: return; // No hatching for ultra low detail
      case 1: hatchSpacing = Math.max(0.2, wall.thickness); break;
      case 2: hatchSpacing = Math.max(0.1, wall.thickness / 1.5); break;
      case 3: hatchSpacing = Math.max(0.05, wall.thickness / 2); break;
      case 4: hatchSpacing = Math.max(0.02, wall.thickness / 3); break;
    }
    
    const numLines = Math.ceil(wallLength / hatchSpacing) + 1;
    
    // Draw diagonal lines from the first edge to the second edge
    for (let i = 0; i < numLines; i++) {
      const t = i / (numLines - 1);
      
      // Interpolate points along both edges
      const x1 = line1Start.x + t * (line1End.x - line1Start.x);
      const y1 = line1Start.y + t * (line1End.y - line1Start.y);
      const x2 = line2Start.x + t * (line2End.x - line2Start.x);
      const y2 = line2Start.y + t * (line2End.y - line2Start.y);
      
      // Draw line from edge 1 to edge 2
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      
      // Use the SAME line width as the wall outlines for consistency (0.02)
      g.setStrokeStyle({
        color: color,
        width: 0.02, 
        alpha: 0.8
      });
      g.stroke();
    }
  }

  getEdgeKey(p1, p2) {
    // Sort points to ensure the same edge is identified regardless of direction
    const points = [
      { x: Math.round(p1.x * 100) / 100, y: Math.round(p1.y * 100) / 100 },
      { x: Math.round(p2.x * 100) / 100, y: Math.round(p2.y * 100) / 100 }
    ].sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.y - b.y;
    });
    
    // Return a string key
    return `${points[0].x},${points[0].y}-${points[1].x},${points[1].y}`;
  }

  // Draw wall fill with detail level support
  drawWallFill(wall, allWalls, color = 0xFFFFFF, alpha = 1, zoom = 1, detailLevel = 2) {
  const polygon = buildWallPolygon(wall, allWalls, zoom);
  if (!polygon) return;
  
  const { line1Start, line1End, line2End, line2Start } = polygon;
  
  // Create polygon points array
  const points = [
    line1Start.x, line1Start.y,
    line1End.x, line1End.y,
    line2End.x, line2End.y,
    line2Start.x, line2Start.y
  ];
  
  // Draw the polygon with white fill
  this.graphics.poly(points);
  this.graphics.fill({ color: 0xFFFFFF, alpha: 1 });
}
  
  // Draw wall preview outline with detail level support
  drawPreviewOutline(wall, allWalls, color = 0x0066ff, alpha = 0.8, zoom = 1, detailLevel = 2) {
  const polygon = buildWallPolygon(wall, allWalls, zoom);
  if (!polygon) return;
  
  const { line1Start, line1End, line2End, line2Start } = polygon;
  
  // Create polygon points array
  const points = [
    line1Start.x, line1Start.y,
    line1End.x, line1End.y,
    line2End.x, line2End.y,
    line2Start.x, line2Start.y
  ];
  
  // Calculate appropriate stroke width for current zoom
  const strokeWidth = this.getStrokeWidthForZoom(zoom);
  
  // Draw the outline
  this.graphics.poly(points);
  this.graphics.setStrokeStyle({ 
    color: color, 
    width: strokeWidth, // Dynamic width based on zoom
    alpha: alpha,
    join: 'miter',
    cap: 'square'
  });
  this.graphics.stroke();
}
drawWallOutlines(walls, zoom, viewportBounds, detailLevel = 2) {
  // Skip outline drawing at ultra low detail level
  if (detailLevel === 0) return;
  
  // Draw detailed thin outlines for each wall
  walls.forEach(wall => {
    // Skip walls outside viewport
    const wallBounds = getWallBounds(wall, wall.thickness);
    if (viewportBounds && !isObjectInViewport(wallBounds, viewportBounds)) {
      return;
    }
    
    const polygon = buildWallPolygon(wall, walls, zoom);
    if (!polygon) return;
    
    const { line1Start, line1End, line2End, line2Start } = polygon;
    
    // Draw complete outline
    this.graphics.moveTo(line1Start.x, line1Start.y);
    this.graphics.lineTo(line1End.x, line1End.y);
    this.graphics.lineTo(line2End.x, line2End.y);
    this.graphics.lineTo(line2Start.x, line2Start.y);
    this.graphics.lineTo(line1Start.x, line1Start.y);
    
    // Calculate appropriate stroke width for current zoom
    const strokeWidth = this.getStrokeWidthForZoom(zoom);
    
    // Thin black outline with dynamic width
    this.graphics.setStrokeStyle({ 
      color: 0x000000, 
      width: strokeWidth,
      alpha: 1,
      join: 'miter',
      cap: 'square'
    });
    this.graphics.stroke();
  });
}
  
  // Draw wall outlines with detail level support
  drawWallOutlines(walls, zoom, viewportBounds, detailLevel = 2) {
  // Skip outline drawing at ultra low detail level
  if (detailLevel === 0) return;
  
  // Draw detailed thin outlines for each wall
  walls.forEach(wall => {
    // Skip walls outside viewport
    const wallBounds = getWallBounds(wall, wall.thickness);
    if (viewportBounds && !isObjectInViewport(wallBounds, viewportBounds)) {
      return;
    }
    
    const polygon = buildWallPolygon(wall, walls, zoom);
    if (!polygon) return;
    
    const { line1Start, line1End, line2End, line2Start } = polygon;
    
    // Draw complete outline
    this.graphics.moveTo(line1Start.x, line1Start.y);
    this.graphics.lineTo(line1End.x, line1End.y);
    this.graphics.lineTo(line2End.x, line2End.y);
    this.graphics.lineTo(line2Start.x, line2Start.y);
    this.graphics.lineTo(line1Start.x, line1Start.y);
    
    // Calculate appropriate stroke width for current zoom
    const strokeWidth = this.getStrokeWidthForZoom(zoom);
    
    // Thin black outline with dynamic width
    this.graphics.setStrokeStyle({ 
      color: 0x000000, 
      width: strokeWidth,
      alpha: 1,
      join: 'miter',
      cap: 'square'
    });
    this.graphics.stroke();
  });
}

  // Draw nodes with detail level support
  drawNodes(nodes, zoom = 1, hoverPosition = null, detailLevel = 2) {
    // Just store the data - actual drawing happens in updateNodeIndicators
    if (this._lastRenderParams) {
      this._lastRenderParams.nodes = nodes;
      this._lastRenderParams.mousePosition = hoverPosition;
    }
  }

  drawSnapIndicator(position, zoom = 1) {
    // Initialize snapGraphics if needed, but actual drawing happens in updateNodeIndicators
    if (!this.snapGraphics) {
      this.snapGraphics = new Graphics();
      const uiLayer = this.pixiRenderer.sceneManager?.getLayer('ui');
      if (uiLayer) {
        uiLayer.addChild(this.snapGraphics);
      } else {
        this.app.stage.addChild(this.snapGraphics);
      }
    }
  }
  
  
  // Enhanced measurement display with high quality at all zoom levels
updateWallMeasurement(wall, zoom = 1, detailLevel = 2) {
  // IMPORTANT - SKIP MEASUREMENT FOR ZERO-LENGTH WALLS
  if (wall.length < 0.01) { // Less than 1cm
    // Hide measurement if it exists
    if (this.measurementTexts.has(wall.id)) {
      const textObj = this.measurementTexts.get(wall.id);
      textObj.visible = false;
    }
    return; // Exit early
  }
  
  // Calculate wall midpoint and angle
  const midpoint = calculateWallMidpoint(wall);
  const angle = calculateWallAngle(wall);
  
  // Format the length in meters
  const formattedLength = this.formatWallLength(wall.length);
  
  // Create or update text
  let textObj;
  if (this.measurementTexts.has(wall.id)) {
    textObj = this.measurementTexts.get(wall.id);
    textObj.text = formattedLength;
    textObj.visible = true;
    textObj.wall = wall; // Store reference to the wall
  } else {
    // Use new Text constructor syntax for Pixi v8 with high quality settings
    textObj = new Text({
      text: formattedLength,
      style: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 14,
        fontWeight: 'bold',
        fill: 0x0000ff, // Blue text
        align: 'center',
        stroke: {
          color: 0xFFFFFF,
          width: 3
        },
        letterSpacing: 0.5,    // Slightly spaced letters for readability
        backgroundColor: 0xFFFFFF, // White background
        padding: 4
      }
    });
    
    textObj.anchor.set(0.5, 0.5);
    textObj.resolution = 2; // Higher resolution for crisp text
    textObj.wall = wall; // Store reference to the wall
    
    // Add text to the UI layer so it's not affected by world transform
    const measurementsLayer = this.pixiRenderer.sceneManager?.getLayer('measurements');
    if (measurementsLayer) {
      measurementsLayer.addChild(textObj);
    } else {
      // Fallback to regular UI layer
      const uiLayer = this.pixiRenderer.sceneManager?.getLayer('ui');
      if (uiLayer) {
        uiLayer.addChild(textObj);
      } else {
        this.app.stage.addChild(textObj);
      }
    }
    
    this.measurementTexts.set(wall.id, textObj);
  }
  
  // Convert world position to screen position for initial text placement
  const camera = this.pixiRenderer.camera;
  if (camera) {
    const screenPos = camera.worldToScreen(midpoint.x, midpoint.y);
    textObj.position.set(screenPos.x, screenPos.y);
    
    // Adjust text rotation to be readable
    let rotation = angle;
    if (angle > Math.PI/2 || angle < -Math.PI/2) {
      rotation += Math.PI; // Flip text if wall is mostly vertical
    }
    textObj.rotation = rotation;
  }
  
  // Fixed font size regardless of zoom
  textObj.style.fontSize = 14; // Consistent 14px size
  
  // Fixed stroke width
  if (textObj.style.stroke) {
    textObj.style.stroke.width = 3;
  }
  
  // Always full opacity
  textObj.alpha = 1;
}
  
  // Format wall length in meters
  formatWallLength(length) {
    // length is already in meters, no conversion needed!
    const meters = length;
    
    // Format based on size
    if (meters < 0.01) {
      // For very small measurements, show millimeters
      return `${(meters * 1000).toFixed(0)}mm`;
    } else {
      // In the middle range show meters with appropriate precision
      if (meters < 1) {
        return `${meters.toFixed(3)}m`; // 3 decimals for small measurements
      } else if (meters < 10) {
        return `${meters.toFixed(2)}m`; // 2 decimals for medium measurements
      } else if (meters < 100) {
        return `${meters.toFixed(1)}m`; // 1 decimal for large measurements
      } else {
        return `${Math.round(meters)}m`; // No decimals for very large measurements
      }
    }
  }
  
  
  
  // When cleaning up, make sure to remove from the UI layer
  cleanupMeasurementTexts(walls) {
    // Get all current wall IDs
    const currentWallIds = new Set(walls.map(wall => wall.id));
    
    // Remove text objects for walls that no longer exist
    for (const [wallId, textObj] of this.measurementTexts.entries()) {
      if (!currentWallIds.has(wallId)) {
        // Remove from the correct parent
        if (textObj.parent) {
          textObj.parent.removeChild(textObj);
        }
        
        // Destroy the text object
        textObj.destroy();
        
        // Remove from map
        this.measurementTexts.delete(wallId);
      }
    }
  }
  
  getViewportBounds() {
    if (!this.pixiRenderer.camera) return null;
    
    const camera = this.pixiRenderer.camera;
    const app = this.app;
    
    // Calculate viewport bounds in world coordinates (meters)
    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(
      app.renderer.width,
      app.renderer.height
    );
    
    // Add buffer (scaled by zoom level for consistency)
    // Buffer size in meters
    const bufferSize = 10 / camera.getZoomLevel(); 
    
    return {
      minX: topLeft.x - bufferSize,
      minY: topLeft.y - bufferSize,
      maxX: bottomRight.x + bufferSize,
      maxY: bottomRight.y + bufferSize
    };
  }
}