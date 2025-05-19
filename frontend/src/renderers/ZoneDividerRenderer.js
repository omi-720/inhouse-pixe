// src/renderers/ZoneDividerRenderer.js
import { Graphics } from 'pixi.js';
import { isObjectInViewport } from '../core/geometry/MeasurementUtils';

export default class ZoneDividerRenderer {
  constructor(pixiRenderer) {
    this.pixiRenderer = pixiRenderer;
    this.app = pixiRenderer.app;
    
    // Create graphics objects for world-space rendering
    this.graphics = new Graphics();
    this.previewGraphics = new Graphics();
    
    // Create graphics for screen-space fixed UI
    this.screenGraphics = new Graphics();
    
    // Make sure the graphics are added to the right layer - between floors and walls
    const layerName = 'zones'; // Use a specific layer for zone dividers
    const dividerLayer = this.pixiRenderer.sceneManager?.getLayer(layerName) || 
                        this.pixiRenderer.sceneManager?.getLayer('walls');
    
    if (dividerLayer) {
      dividerLayer.addChild(this.graphics);
      dividerLayer.addChild(this.previewGraphics);
    } else {
      console.warn('Divider layer not found, falling back to stage');
      this.app.stage.addChild(this.graphics);
      this.app.stage.addChild(this.previewGraphics);
    }
    
    // Add screen graphics to UI layer
    const uiLayer = this.pixiRenderer.sceneManager?.getLayer('ui');
    if (uiLayer) {
      uiLayer.addChild(this.screenGraphics);
    } else {
      this.app.stage.addChild(this.screenGraphics);
    }
    
    // Bind the update method
    this.update = this.update.bind(this);
    
    // Start the update loop if app exists
    if (this.app) {
      this.app.ticker.add(this.update);
    }
    
    // Track the last render parameters for updates
    this._lastRenderParams = {
      dividers: [],
      currentDivider: null,
      mousePosition: null,
      selectedDivider: null
    };
  }
  
  update() {
    // Update hover effects if needed
    this.updateHoverEffects();
  }
  
  updateHoverEffects() {
    // Update hover effects based on mouse position
    const mousePos = this._lastRenderParams.mousePosition;
    if (!mousePos) return;
    
    // Handle hover effects if needed
  }
  
  render(dividers = [], currentDivider = null, mousePosition = null, selectedDivider = null) {
    // Store parameters for updates
    this._lastRenderParams = { dividers, currentDivider, mousePosition, selectedDivider };
    
    // Get camera for coordinate conversion and culling
    const camera = this.pixiRenderer.camera;
    const zoom = camera ? camera.getZoomLevel() : 1;
    
    // Clear previous graphics
    this.graphics.clear();
    this.previewGraphics.clear();
    this.screenGraphics.clear();
    
    // Calculate viewport bounds for culling
    const viewportBounds = this.getViewportBounds();
    
    // Draw all existing dividers
    dividers.forEach(divider => {
      if (viewportBounds) {
        const dividerBounds = divider.getBounds();
        if (!isObjectInViewport(dividerBounds, viewportBounds)) {
          return;
        }
      }
      
      this.drawDivider(
        this.graphics, 
        divider, 
        divider === selectedDivider ? 0x0066ff : divider.color || 0x333333, 
        zoom
      );
    });
    
    // Draw the current preview divider if it exists
    if (currentDivider) {
      this.drawDivider(
        this.previewGraphics, 
        currentDivider, 
        0x0066ff, // Blue color for preview
        zoom, 
        0.8  // Lower alpha for preview
      );
      
      // Draw special marker points for the preview divider
      this.drawDividerControlPoints(currentDivider, zoom);
    }
    
    // Draw control points for selected divider
    if (selectedDivider) {
      this.drawDividerControlPoints(selectedDivider, zoom);
    }
  }
  
  drawDivider(graphics, divider, color, zoom, alpha = 1) {
    // Calculate stroke width based on zoom level
    const strokeWidth = divider.thickness || this.getStrokeWidthForZoom(zoom);
    
    // Draw the divider line
    graphics.moveTo(divider.start.x, divider.start.y);
    graphics.lineTo(divider.end.x, divider.end.y);
    
    // Use dashed line if the divider is set to dashed
    if (divider.isDashed) {
      // Calculate dash pattern in world units
      const dashLength = divider.dashPattern ? divider.dashPattern[0] : 0.2; // 20cm dash
      const gapLength = divider.dashPattern ? divider.dashPattern[1] : 0.1;  // 10cm gap
      
      // Set stroke style with dash pattern
      graphics.stroke({ 
        color: color, 
        width: strokeWidth,
        alpha: alpha,
        cap: 'round',
        join: 'round',
        dash: [dashLength, gapLength]
      });
    } else {
      // Solid line
      graphics.stroke({ 
        color: color, 
        width: strokeWidth,
        alpha: alpha,
        cap: 'round',
        join: 'round'
      });
    }
  }
  
  drawDividerControlPoints(divider, zoom) {
    // Skip if no camera or no divider
    if (!this.pixiRenderer.camera || !divider) return;
    
    // Calculate control point size based on zoom
    const pointSize = 5; // Fixed screen pixels size
    
    // Convert points to screen coordinates
    const startScreen = this.pixiRenderer.camera.worldToScreen(divider.start.x, divider.start.y);
    const endScreen = this.pixiRenderer.camera.worldToScreen(divider.end.x, divider.end.y);
    
    // Draw start point marker in screen space
    this.screenGraphics.circle(startScreen.x, startScreen.y, pointSize);
    this.screenGraphics.fill({ color: 0x00aa00, alpha: 1 }); // Green for start point
    
    // Draw end point marker in screen space
    this.screenGraphics.circle(endScreen.x, endScreen.y, pointSize);
    this.screenGraphics.fill({ color: 0x0066ff, alpha: 1 }); // Blue for end point
  }
  
  getStrokeWidthForZoom(zoom) {
    // Base width in world units (meters)
    const baseWidth = 0.05; // 5cm default
    
    // Apply inverse scaling but ensure a minimum width
    const calculatedWidth = baseWidth / Math.sqrt(zoom) * 0.5;
    
    // Ensure a minimum visible thickness (in meters)
    return Math.max(calculatedWidth, 0.001);
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
    const bufferSize = 10 / camera.getZoomLevel(); 
    
    return {
      minX: topLeft.x - bufferSize,
      minY: topLeft.y - bufferSize,
      maxX: bottomRight.x + bufferSize,
      maxY: bottomRight.y + bufferSize
    };
  }
  
  destroy() {
    // Remove ticker update
    if (this.app) {
      this.app.ticker.remove(this.update);
    }
    
    // Clean up graphics
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    
    if (this.previewGraphics) {
      this.previewGraphics.destroy();
      this.previewGraphics = null;
    }
    
    if (this.screenGraphics) {
      this.screenGraphics.destroy();
      this.screenGraphics = null;
    }
  }
}