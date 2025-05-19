// src/renderers/ZoneRenderer.js
import { Graphics, Text } from 'pixi.js';
import { isObjectInViewport } from '../core/geometry/MeasurementUtils';

export default class ZoneRenderer {
  constructor(pixiRenderer) {
    this.pixiRenderer = pixiRenderer;
    this.app = pixiRenderer.app;
    
    // Create graphics objects for world-space rendering
    this.graphics = new Graphics();
    this.previewGraphics = new Graphics();
    
    // Create graphics for screen-space fixed UI
    this.screenGraphics = new Graphics();
    
    // Map to store labels and measurements
    this.zoneLabels = new Map();
    
    // Make sure the graphics are added to the right layer
    const zonesLayer = this.pixiRenderer.sceneManager?.getLayer('floors');
    if (zonesLayer) {
      zonesLayer.addChild(this.graphics);
      zonesLayer.addChild(this.previewGraphics);
    } else {
      console.warn('Zones layer not found, falling back to stage');
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
      zones: [],
      currentZone: null,
      mousePosition: null,
      selectedZone: null
    };
  }
  
  update() {
    // Update text positions
    this.updateLabelPositions();
    
    // Update preview line if drawing
    this.updatePreviewLine();
  }
  
  updateLabelPositions() {
    // Skip if no camera
    if (!this.pixiRenderer.camera) return;
    
    // Update each label position
    this.zoneLabels.forEach((textObj, zoneId) => {
      // Skip if text isn't visible
      if (!textObj.visible) return;
      
      // Find the zone for this text
      const zone = textObj.zone;
      if (!zone) return;
      
      // Calculate centroid for text position
      const centroid = this.calculateZoneCentroid(zone);
      
      // Convert to screen coordinates
      const screenPos = this.pixiRenderer.camera.worldToScreen(centroid.x, centroid.y);
      
      // Update text position
      textObj.position.set(screenPos.x, screenPos.y);
    });
  }
  
  calculateZoneCentroid(zone) {
    if (!zone.points || zone.points.length === 0) {
      return { x: 0, y: 0 };
    }
    
    let sumX = 0;
    let sumY = 0;
    
    for (const point of zone.points) {
      sumX += point.x;
      sumY += point.y;
    }
    
    return {
      x: sumX / zone.points.length,
      y: sumY / zone.points.length
    };
  }
  
  updatePreviewLine() {
    // Skip if no mousePosition or currentZone
    const { currentZone, mousePosition } = this._lastRenderParams;
    if (!currentZone || !mousePosition || !this.pixiRenderer.camera) return;
    
    // Don't show preview line for closed zones
    if (currentZone.isClosed) return;
    
    // Only show preview line if zone has at least one point
    if (currentZone.points.length === 0) return;
    
    // Clear screen graphics before redrawing
    this.screenGraphics.clear();
    
    // Get the last point of the current zone
    const lastPoint = currentZone.points[currentZone.points.length - 1];
    
    // Convert to screen coordinates
    const lastPointScreen = this.pixiRenderer.camera.worldToScreen(lastPoint.x, lastPoint.y);
    const mouseScreen = this.pixiRenderer.camera.worldToScreen(mousePosition.x, mousePosition.y);
    
    // Draw dashed line from last point to mouse position
    this.screenGraphics.moveTo(lastPointScreen.x, lastPointScreen.y);
    this.screenGraphics.lineTo(mouseScreen.x, mouseScreen.y);
    this.screenGraphics.stroke({ 
      color: 0x0066ff, 
      width: 1.5,
      alpha: 0.8,
      dash: [5, 5] // Dashed line for preview
    });
    
    // If we're near the first point and have at least 2 points, draw a closing indicator
    if (currentZone.points.length >= 2) {
      const firstPoint = currentZone.points[0];
      const dx = Math.abs(mousePosition.x - firstPoint.x);
      const dy = Math.abs(mousePosition.y - firstPoint.y);
      
      // If mouse is close to first point, draw an indicator
      if (dx < 0.1 && dy < 0.1) {
        const firstPointScreen = this.pixiRenderer.camera.worldToScreen(firstPoint.x, firstPoint.y);
        
        // Draw a highlight circle around the first point
        this.screenGraphics.circle(firstPointScreen.x, firstPointScreen.y, 8);
        this.screenGraphics.stroke({ 
          color: 0x00ff00, // Green for closing indicator
          width: 2,
          alpha: 0.8
        });
      }
    }
  }
  
  render(zones = [], currentZone = null, mousePosition = null, selectedZone = null) {
    // Store parameters for updates
    this._lastRenderParams = { zones, currentZone, mousePosition, selectedZone };
    
    // Get camera for coordinate conversion and culling
    const camera = this.pixiRenderer.camera;
    const zoom = camera ? camera.getZoomLevel() : 1;
    
    // Clear previous graphics
    this.graphics.clear();
    this.previewGraphics.clear();
    this.screenGraphics.clear();
    
    // Calculate viewport bounds for culling
    const viewportBounds = this.getViewportBounds();
    
    // Clean up labels for deleted zones
    this.cleanupZoneLabels(zones);
    
    // Draw all existing zones
    zones.forEach(zone => {
      if (viewportBounds) {
        const zoneBounds = zone.getBounds();
        if (!isObjectInViewport(zoneBounds, viewportBounds)) {
          return;
        }
      }
      
      this.drawZone(
        this.graphics, 
        zone, 
        zone === selectedZone ? 0x0066ff : 0x000000, 
        zoom
      );
      
      // Show label for selected zone
      if (zone === selectedZone) {
        this.updateZoneLabel(zone, zoom);
      } else {
        // Hide label for non-selected zones
        const textObj = this.zoneLabels.get(zone.id);
        if (textObj) {
          textObj.visible = true; // Always show zone labels
        }
      }
    });
    
    // Draw the current preview zone if it exists
    if (currentZone) {
      this.drawZone(
        this.previewGraphics, 
        currentZone, 
        0x0066ff, // Blue color for preview
        zoom, 
        0.8  // Lower alpha for preview
      );
      
      // Always show label for the preview zone
      this.updateZoneLabel(currentZone, zoom);
      
      // Draw point markers for the preview zone
      this.drawPointMarkers(currentZone, zoom);
    }
  }
  
  drawZone(graphics, zone, strokeColor, zoom, alpha = 1) {
    // Skip if no points
    if (!zone.points || zone.points.length < 2) return;
    
    // Calculate stroke width based on zoom level
    const strokeWidth = this.getStrokeWidthForZoom(zoom);
    
    // Start drawing the zone
    if (zone.points.length > 0) {
      const firstPoint = zone.points[0];
      graphics.moveTo(firstPoint.x, firstPoint.y);
      
      // Draw the zone as a series of lines
      for (let i = 1; i < zone.points.length; i++) {
        const point = zone.points[i];
        graphics.lineTo(point.x, point.y);
      }
      
      // Close the zone if it's marked as closed
      if (zone.isClosed) {
        graphics.lineTo(firstPoint.x, firstPoint.y);
        
        // Fill the zone with semi-transparent color
        graphics.fill({
          color: zone.fillColor || 0xEEEEEE,
          alpha: zone.fillAlpha || 0.2
        });
      }
      
      // Stroke the zone outline
      graphics.stroke({ 
        color: strokeColor, 
        width: zone.borderThickness || strokeWidth,
        alpha: alpha,
        join: 'round',
        cap: 'round'
      });
    }
    
    // Only draw vertex points for editing mode or while actively drawing
    if (zone === this._lastRenderParams.selectedZone || zone === this._lastRenderParams.currentZone) {
      this.drawPoints(graphics, zone, strokeColor, strokeWidth * 1.5, alpha);
    }
  }
  
  drawPoints(graphics, zone, color, pointSize, alpha) {
    zone.points.forEach((point, index) => {
      // Draw a circle at each point
      graphics.circle(point.x, point.y, pointSize);
      graphics.fill({ color: color, alpha: alpha });
      
      // Highlight the first point for unclosed zones
      if (index === 0 && !zone.isClosed) {
        graphics.circle(point.x, point.y, pointSize * 1.5);
        graphics.stroke({ 
          color: color, 
          width: pointSize * 0.25,
          alpha: alpha
        });
      }
    });
  }
  
  drawPointMarkers(zone, zoom) {
    // Skip if no camera or no zone
    if (!this.pixiRenderer.camera || !zone) return;
    
    // Only draw point markers if it's the current zone being drawn
    // or if it's the selected zone in edit mode
    if (zone !== this._lastRenderParams.currentZone && 
        zone !== this._lastRenderParams.selectedZone) {
      return;
    }
    
    // Draw markers for each point
    zone.points.forEach((point, index) => {
      // Convert to screen coordinates
      const screenPos = this.pixiRenderer.camera.worldToScreen(point.x, point.y);
      
      // Draw point marker in screen space
      this.screenGraphics.circle(screenPos.x, screenPos.y, 5);
      
      // Use different fill for first point
      if (index === 0) {
        this.screenGraphics.fill({ color: 0x00aa00, alpha: 1 }); // Green for first point
      } else {
        this.screenGraphics.fill({ color: 0x0066ff, alpha: 1 }); // Blue for other points
      }
    });
  }
  
  updateZoneLabel(zone, zoom = 1) {
    // Skip zones with fewer than 2 points
    if (!zone.points || zone.points.length < 2) {
      // Hide label if it exists
      if (this.zoneLabels.has(zone.id)) {
        const textObj = this.zoneLabels.get(zone.id);
        textObj.visible = false;
      }
      return;
    }
    
    // Format zone information
    let labelText = zone.name || "Zone";
    
    // Add area information for closed zones
    if (zone.isClosed && zone.area > 0) {
      labelText += `\n${this.formatArea(zone.area)}`;
    }
    
    // Create or update text
    let textObj;
    if (this.zoneLabels.has(zone.id)) {
      textObj = this.zoneLabels.get(zone.id);
      textObj.text = labelText;
      textObj.visible = true;
      textObj.zone = zone; // Store reference to the zone
    } else {
      // Create new text object
      textObj = new Text({
        text: labelText,
        style: {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 14,
          fontWeight: 'bold',
          fill: 0x333333, // Dark gray text
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
      textObj.zone = zone; // Store reference to the zone
      
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
      
      this.zoneLabels.set(zone.id, textObj);
    }
    
    // Calculate centroid for text position
    const centroid = this.calculateZoneCentroid(zone);
    
    // Convert world position to screen position for initial text placement
    const camera = this.pixiRenderer.camera;
    if (camera) {
      const screenPos = camera.worldToScreen(centroid.x, centroid.y);
      textObj.position.set(screenPos.x, screenPos.y);
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
  
  formatArea(area) {
    // area is in square meters
    if (area < 0.01) {
      return `${(area * 10000).toFixed(0)}cm²`;
    } else if (area < 1) {
      return `${(area * 100).toFixed(2)}m²`;
    } else if (area < 10000) {
      return `${area.toFixed(2)}m²`;
    } else {
      // Convert to hectares
      return `${(area / 10000).toFixed(2)}ha`;
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
  
  cleanupZoneLabels(zones) {
    // Get all current zone IDs
    const currentIds = new Set(zones.map(zone => zone.id));
    
    // Remove text objects for zones that no longer exist
    for (const [zoneId, textObj] of this.zoneLabels.entries()) {
      if (!currentIds.has(zoneId)) {
        // Remove from the correct parent
        if (textObj.parent) {
          textObj.parent.removeChild(textObj);
        }
        
        // Destroy the text object
        textObj.destroy();
        
        // Remove from map
        this.zoneLabels.delete(zoneId);
      }
    }
  }
  
  destroy() {
    // Remove ticker update
    if (this.app) {
      this.app.ticker.remove(this.update);
    }
    
    // Clean up all labels
    this.cleanupZoneLabels([]);
    
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