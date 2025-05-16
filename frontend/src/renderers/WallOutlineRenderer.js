// src/renderers/WallOutlineRenderer.js
import { Graphics } from 'pixi.js';
import { buildWallPolygon } from '../core/geometry/GeometryUtils';
import { getWallBounds, isObjectInViewport } from '../core/geometry/MeasurementUtils';

export default class WallOutlineRenderer {
  constructor(pixiRenderer) {
    this.pixiRenderer = pixiRenderer;
    this.app = pixiRenderer.app;
    
    // Create a graphics object for screen-space outlines (in UI layer)
    this.outlineGraphics = new Graphics();
    this.outlineGraphics.resolution = 4; // INCREASE to 4x for higher quality
    this.outlineGraphics.zIndex = 100;
    
    // Create a second graphics object specifically for smooth lines
    this.smoothLines = new Graphics();
    this.smoothLines.resolution = 4; // Higher resolution
    this.smoothLines.zIndex = 101; // Higher zIndex to ensure it's on top
    
    // Add to UI layer for screen-space rendering
    const uiLayer = this.pixiRenderer.sceneManager?.getLayer('ui');
    if (uiLayer) {
      uiLayer.sortableChildren = true;
      uiLayer.addChild(this.outlineGraphics);
      uiLayer.addChild(this.smoothLines);
    } else {
      console.warn('UI layer not found, falling back to stage');
      this.app.stage.addChild(this.outlineGraphics);
      this.app.stage.addChild(this.smoothLines);
    }
    
    // Last camera state to detect changes
    this.lastCameraState = {
      zoom: 0,
      x: 0, 
      y: 0
    };
    
    // Flags for redrawing
    this.needsRedraw = true;
    this.forceRedraw = false;
    
    // Bind update method
    this.update = this.update.bind(this);
    
    // Add to ticker
    if (this.app) {
      this.app.ticker.add(this.update);
    }
  }
  
  update() {
    const camera = this.pixiRenderer.camera;
    if (!camera) return;
    
    // Check if camera state has changed
    const currentZoom = camera.getZoomLevel();
    const currentPos = camera.position;
    
    if (currentZoom !== this.lastCameraState.zoom || 
        currentPos.x !== this.lastCameraState.x || 
        currentPos.y !== this.lastCameraState.y) {
      
      // Update last state
      this.lastCameraState = {
        zoom: currentZoom,
        x: currentPos.x,
        y: currentPos.y
      };
      
      // Redraw outlines at new camera position/zoom
      this.needsRedraw = true;
    }
  }
  
  render(walls, selectedWall = null) {
    // Always force redraw - this fixes the issue where walls might not appear
    this.needsRedraw = true;
    this.forceRedraw = true;
    
    if (!this.needsRedraw && !this.forceRedraw) return;
    this.needsRedraw = false;
    this.forceRedraw = false;
    
    const camera = this.pixiRenderer.camera;
    if (!camera) return;
    
    // Clear previous graphics
    this.outlineGraphics.clear();
    this.smoothLines.clear();
    
    // Calculate adaptive line width based on zoom
    const zoom = camera.getZoomLevel();
    const lineWidth = Math.max(1.5, Math.min(3, 2 / Math.sqrt(zoom)));
    
    // Get viewport bounds for culling
    const viewportBounds = this.getViewportBounds();
    
    // Draw each wall outline in screen space
    walls.forEach(wall => {
      if (!wall) return; // Skip null walls
      
      // Skip walls outside viewport
      const wallBounds = getWallBounds(wall, wall.thickness);
      if (viewportBounds && !isObjectInViewport(wallBounds, viewportBounds)) {
        return;
      }
      
      // Build wall polygon with ALL walls to ensure consistent mitering
      const polygon = buildWallPolygon(wall, walls);
      if (!polygon) return;
      
      const { line1Start, line1End, line2End, line2Start } = polygon;
      
      // Convert polygon points to screen coordinates
      const screenPoints = [
        camera.worldToScreen(line1Start.x, line1Start.y),
        camera.worldToScreen(line1End.x, line1End.y),
        camera.worldToScreen(line2End.x, line2End.y),
        camera.worldToScreen(line2Start.x, line2Start.y)
      ];
      
      // Draw the high-quality smooth outline using PixiJS 8 API
      this.drawSmoothLine(screenPoints, wall === selectedWall ? 0x0066ff : 0x000000, lineWidth);
    });
  }
  
  // New method for high-quality line drawing using PixiJS 8 API
  drawSmoothLine(points, color, lineWidth) {
    // Set stroke style (PixiJS 8 API)
    this.smoothLines.setStrokeStyle({
      width: lineWidth,
      color: color,
      alpha: 1,
      alignment: 0.5,  // Center alignment
      join: 'round',   // Use round joins for smoother corners
      cap: 'round',    // Use round caps for smoother line ends
      miterLimit: 1,   // Lower miter limit to avoid spikes
    });
    
    // Draw the outline path
    this.smoothLines.moveTo(points[0].x, points[0].y);
    this.smoothLines.lineTo(points[1].x, points[1].y);
    this.smoothLines.lineTo(points[2].x, points[2].y);
    this.smoothLines.lineTo(points[3].x, points[3].y);
    this.smoothLines.lineTo(points[0].x, points[0].y);
    this.smoothLines.stroke();
  }
  
  // Force a redraw on next render call (use when walls change)
  invalidate() {
    this.forceRedraw = true;
  }
  
  getViewportBounds() {
    if (!this.pixiRenderer.camera) return null;
    
    const camera = this.pixiRenderer.camera;
    const app = this.app;
    
    // Calculate viewport bounds in world coordinates
    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(
      app.renderer.width,
      app.renderer.height
    );
    
    // Add buffer (scaled by zoom level for consistency)
    const bufferSize = 10 / camera.getZoomLevel(); 
    
    return {
      minX: topLeft.x - bufferSize,
      minY: topLeft.y - bufferSize,
      maxX: bottomRight.x + bufferSize,
      maxY: bottomRight.y + bufferSize
    };
  }
  
  destroy() {
    if (this.app) {
      this.app.ticker.remove(this.update);
    }
    
    if (this.outlineGraphics) {
      this.outlineGraphics.destroy();
      this.outlineGraphics = null;
    }
    
    if (this.smoothLines) {
      this.smoothLines.destroy();
      this.smoothLines = null;
    }
  }
}