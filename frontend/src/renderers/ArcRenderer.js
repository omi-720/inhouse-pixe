// src/renderers/ArcRenderer.js
import { Graphics, Text } from 'pixi.js';
import { isObjectInViewport } from '../core/geometry/MeasurementUtils';

export default class ArcRenderer {
  constructor(pixiRenderer) {
    this.pixiRenderer = pixiRenderer;
    this.app = pixiRenderer.app;
    
    // Create graphics objects for world-space rendering
    this.graphics = new Graphics();
    this.previewGraphics = new Graphics();
    
    // Create graphics for screen-space fixed UI
    this.screenGraphics = new Graphics();
    
    // Map to store measurement text objects
    this.measurementTexts = new Map();
    
    // Make sure the graphics are added to the right layer
    const arcsLayer = this.pixiRenderer.sceneManager?.getLayer('walls');
    if (arcsLayer) {
      arcsLayer.addChild(this.graphics);
      arcsLayer.addChild(this.previewGraphics);
    } else {
      console.warn('Arcs layer not found, falling back to stage');
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
      arcs: [],
      currentArc: null,
      mousePosition: null,
      selectedArc: null
    };
  }
  
  update() {
    // Update text positions
    this.updateMeasurementPositions();
    
    // Update control points for currently active arc
    this.updateControlPoints();
  }
  
  updateMeasurementPositions() {
    // Skip if no camera
    if (!this.pixiRenderer.camera) return;
    
    // Update each text position
    this.measurementTexts.forEach((textObj, arcId) => {
      // Skip if text isn't visible
      if (!textObj.visible) return;
      
      // Find the arc for this text
      const arc = textObj.arc;
      if (!arc) return;
      
      // Calculate position for the text (at the middle of the arc)
      const midAngle = (arc.startAngle + arc.endAngle) / 2;
      const radius = arc.radius;
      
      // Calculate position at midpoint of the arc
      const textPos = {
        x: arc.center.x + radius * 0.8 * Math.cos(midAngle),
        y: arc.center.y + radius * 0.8 * Math.sin(midAngle)
      };
      
      // Convert to screen coordinates
      const screenPos = this.pixiRenderer.camera.worldToScreen(textPos.x, textPos.y);
      
      // Update text position
      textObj.position.set(screenPos.x, screenPos.y);
      
      // Adjust text rotation to follow the arc
      let rotation = midAngle;
      if (Math.cos(midAngle) < 0) {
        rotation += Math.PI; // Flip text to be readable
      }
      textObj.rotation = rotation;
    });
  }
  
  updateControlPoints() {
    // Skip if no camera or no current/selected arc
    const { currentArc, selectedArc } = this._lastRenderParams;
    if (!this.pixiRenderer.camera || (!currentArc && !selectedArc)) return;
    
    // Clear screen graphics for redrawing
    this.screenGraphics.clear();
    
    // Get the arc to draw control points for
    const arc = selectedArc || currentArc;
    
    // Get endpoints and center
    const endpoints = arc.getEndpoints();
    const center = arc.center;
    
    // Convert to screen coordinates
    const centerScreen = this.pixiRenderer.camera.worldToScreen(center.x, center.y);
    const startScreen = this.pixiRenderer.camera.worldToScreen(endpoints.start.x, endpoints.start.y);
    const endScreen = this.pixiRenderer.camera.worldToScreen(endpoints.end.x, endpoints.end.y);
    
    // Draw center control point
    this.screenGraphics.circle(centerScreen.x, centerScreen.y, 6);
    this.screenGraphics.fill({ color: 0xaa0000, alpha: 1 }); // Red for center
    
    // Draw start control point
    this.screenGraphics.circle(startScreen.x, startScreen.y, 6);
    this.screenGraphics.fill({ color: 0x00aa00, alpha: 1 }); // Green for start
    
    // Draw end control point
    this.screenGraphics.circle(endScreen.x, endScreen.y, 6);
    this.screenGraphics.fill({ color: 0x0066ff, alpha: 1 }); // Blue for end
    
    // Draw radius lines
    this.screenGraphics.moveTo(centerScreen.x, centerScreen.y);
    this.screenGraphics.lineTo(startScreen.x, startScreen.y);
    this.screenGraphics.stroke({ 
      color: 0x00aa00, 
      width: 1,
      alpha: 0.6,
      dash: [5, 5]
    });
    
    this.screenGraphics.moveTo(centerScreen.x, centerScreen.y);
    this.screenGraphics.lineTo(endScreen.x, endScreen.y);
    this.screenGraphics.stroke({ 
      color: 0x0066ff, 
      width: 1,
      alpha: 0.6,
      dash: [5, 5]
    });
  }
  
  render(arcs = [], currentArc = null, mousePosition = null, selectedArc = null) {
    // Store parameters for updates
    this._lastRenderParams = { arcs, currentArc, mousePosition, selectedArc };
    
    // Get camera for coordinate conversion and culling
    const camera = this.pixiRenderer.camera;
    const zoom = camera ? camera.getZoomLevel() : 1;
    
    // Clear previous graphics
    this.graphics.clear();
    this.previewGraphics.clear();
    this.screenGraphics.clear();
    
    // Calculate viewport bounds for culling
    const viewportBounds = this.getViewportBounds();
    
    // Clean up measurement texts for deleted arcs
    this.cleanupMeasurementTexts(arcs);
    
    // Draw all existing arcs
    arcs.forEach(arc => {
      if (viewportBounds) {
        const arcBounds = arc.getBounds();
        if (!isObjectInViewport(arcBounds, viewportBounds)) {
          return;
        }
      }
      
      this.drawArc(
        this.graphics, 
        arc, 
        arc === selectedArc ? 0x0066ff : arc.color || 0x0000FF, 
        zoom
      );
      
      // Show measurement for selected arc
      if (arc === selectedArc) {
        this.updateArcMeasurement(arc, zoom);
      } else {
        // Hide measurement for non-selected arcs
        const textObj = this.measurementTexts.get(arc.id);
        if (textObj) {
          textObj.visible = false;
        }
      }
    });
    
    // Draw the current preview arc if it exists
    if (currentArc) {
      this.drawArc(
        this.previewGraphics, 
        currentArc, 
        0x0066ff, // Blue color for preview
        zoom, 
        0.8  // Lower alpha for preview
      );
      
      // Always show measurement for the preview arc
      this.updateArcMeasurement(currentArc, zoom);
      
      // Draw control points for the preview arc
      this.updateControlPoints();
    }
    
    // Draw control points for selected arc
    if (selectedArc) {
      this.updateControlPoints();
    }
  }
  
  drawArc(graphics, arc, color, zoom, alpha = 1) {
    // Calculate stroke width based on zoom level
    const strokeWidth = arc.thickness || this.getStrokeWidthForZoom(zoom);
    
    // Get arc properties
    const { center, startAngle, endAngle, radius } = arc;
    
    // Draw a perfect arc using Pixi's arc method
    graphics.arc(
      center.x, center.y,   // Center position
      radius,               // Radius
      startAngle,           // Start angle in radians
      endAngle,             // End angle in radians
      false                 // Counterclockwise
    );
    
    // Stroke the arc
    graphics.stroke({ 
      color: color, 
      width: strokeWidth,
      alpha: alpha,
      cap: 'round'
    });
  }
  
  updateArcMeasurement(arc, zoom = 1) {
    // Skip rendering of tiny arcs
    if (arc.radius < 0.01) { // Less than 1cm
      // Hide measurement if it exists
      if (this.measurementTexts.has(arc.id)) {
        const textObj = this.measurementTexts.get(arc.id);
        textObj.visible = false;
      }
      return;
    }
    
    // Format radius and arc length
    const radiusText = this.formatLength(arc.radius);
    const arcLengthText = this.formatLength(arc.arcLength);
    
    // Create combined text
    const measurementText = `R: ${radiusText}\nL: ${arcLengthText}`;
    
    // Create or update text
    let textObj;
    if (this.measurementTexts.has(arc.id)) {
      textObj = this.measurementTexts.get(arc.id);
      textObj.text = measurementText;
      textObj.visible = true;
      textObj.arc = arc; // Store reference to the arc
    } else {
      // Create new text object
      textObj = new Text({
        text: measurementText,
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
          letterSpacing: 0.5,
          backgroundColor: 0xFFFFFF,
          padding: 4
        }
      });
      
      textObj.anchor.set(0.5, 0.5);
      textObj.resolution = 2; // Higher resolution for crisp text
      textObj.arc = arc; // Store reference to the arc
      
      // Add text to the UI layer
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
      
      this.measurementTexts.set(arc.id, textObj);
    }
    
    // Calculate mid-angle for positioning the text
    const midAngle = (arc.startAngle + arc.endAngle) / 2;
    
    // Position text along the arc at 80% of the radius
    const textPos = {
      x: arc.center.x + arc.radius * 0.8 * Math.cos(midAngle),
      y: arc.center.y + arc.radius * 0.8 * Math.sin(midAngle)
    };
    
    // Convert world position to screen position for initial text placement
    const camera = this.pixiRenderer.camera;
    if (camera) {
      const screenPos = camera.worldToScreen(textPos.x, textPos.y);
      textObj.position.set(screenPos.x, screenPos.y);
      
      // Adjust text rotation to follow the arc
      let rotation = midAngle;
      if (Math.cos(midAngle) < 0) {
        rotation += Math.PI; // Flip text to be readable
      }
      textObj.rotation = rotation;
    }
    
    // Fixed font size regardless of zoom
    textObj.style.fontSize = 14;
    
    // Fixed stroke width
    if (textObj.style.stroke) {
      textObj.style.stroke.width = 3;
    }
    
    // Always full opacity
    textObj.alpha = 1;
  }
  
  formatLength(length) {
    // length is already in meters
    if (length < 0.01) {
      return `${(length * 1000).toFixed(0)}mm`;
    } else if (length < 1) {
      return `${(length * 100).toFixed(1)}cm`;
    } else if (length < 10) {
      return `${length.toFixed(2)}m`;
    } else if (length < 100) {
      return `${length.toFixed(1)}m`;
    } else {
      return `${Math.round(length)}m`;
    }
  }
  
  getStrokeWidthForZoom(zoom) {
    // Base width in world units (meters)
    const baseWidth = 0.05;
    
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
  
  cleanupMeasurementTexts(arcs) {
    // Get all current arc IDs
    const currentIds = new Set(arcs.map(arc => arc.id));
    
    // Remove text objects for arcs that no longer exist
    for (const [arcId, textObj] of this.measurementTexts.entries()) {
      if (!currentIds.has(arcId)) {
        // Remove from the correct parent
        if (textObj.parent) {
          textObj.parent.removeChild(textObj);
        }
        
        // Destroy the text object
        textObj.destroy();
        
        // Remove from map
        this.measurementTexts.delete(arcId);
      }
    }
  }
  
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