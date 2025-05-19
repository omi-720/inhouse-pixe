// src/renderers/PolygonRenderer.js
import { Graphics, Text } from 'pixi.js';
import { isObjectInViewport } from '../core/geometry/MeasurementUtils';

export default class PolygonRenderer {
  constructor(pixiRenderer) {
    this.pixiRenderer = pixiRenderer;
    this.app = pixiRenderer.app;
    
    // Create graphics objects for world-space rendering
    this.graphics = new Graphics();
    this.previewGraphics = new Graphics();
    
    // Create graphics for screen-space fixed UI
    this.screenGraphics = new Graphics();
    
    // Map to store measurements text objects
    this.measurementTexts = new Map();
    
    // Make sure the graphics are added to the right layer
    const polygonsLayer = this.pixiRenderer.sceneManager?.getLayer('walls');
    if (polygonsLayer) {
      polygonsLayer.addChild(this.graphics);
      polygonsLayer.addChild(this.previewGraphics);
    } else {
      console.warn('Polygons layer not found, falling back to stage');
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
      polygons: [],
      currentPolygon: null,
      mousePosition: null,
      selectedPolygon: null
    };
  }
  
  update() {
    // Update text positions
    this.updateMeasurementPositions();
    
    // Update hover effects if needed
    this.updateHoverEffects();
    
    // Update preview line to cursor if drawing
    this.updatePreviewLine();
  }
  
  updateMeasurementPositions() {
    // Skip if no camera
    if (!this.pixiRenderer.camera) return;
    
    // Update each text position
    this.measurementTexts.forEach((textObj, polygonId) => {
      // Skip if text isn't visible
      if (!textObj.visible) return;
      
      // Find the polygon for this text
      const polygon = textObj.polygon;
      if (!polygon) return;
      
      // Calculate centroid for text position
      const centroid = this.calculatePolygonCentroid(polygon);
      
      // Convert to screen coordinates
      const screenPos = this.pixiRenderer.camera.worldToScreen(centroid.x, centroid.y);
      
      // Update text position
      textObj.position.set(screenPos.x, screenPos.y);
    });
  }
  
  calculatePolygonCentroid(polygon) {
    if (!polygon.points || polygon.points.length === 0) {
      return { x: 0, y: 0 };
    }
    
    let sumX = 0;
    let sumY = 0;
    
    for (const point of polygon.points) {
      sumX += point.x;
      sumY += point.y;
    }
    
    return {
      x: sumX / polygon.points.length,
      y: sumY / polygon.points.length
    };
  }
  
  updateHoverEffects() {
    // Update hover effects based on mouse position
    const mousePos = this._lastRenderParams.mousePosition;
    if (!mousePos) return;
    
    // Handle hover effects if needed
  }
  
  updatePreviewLine() {
    // Skip if no mousePosition or currentPolygon
    const { currentPolygon, mousePosition } = this._lastRenderParams;
    if (!currentPolygon || !mousePosition || !this.pixiRenderer.camera) return;
    
    // Don't show preview line for closed polygons
    if (currentPolygon.isClosed) return;
    
    // Only show preview line if polygon has at least one point
    if (currentPolygon.points.length === 0) return;
    
    // Clear screen graphics before redrawing
    this.screenGraphics.clear();
    
    // Get the last point of the current polygon
    const lastPoint = currentPolygon.points[currentPolygon.points.length - 1];
    
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
    if (currentPolygon.points.length >= 2) {
      const firstPoint = currentPolygon.points[0];
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
  
  render(polygons = [], currentPolygon = null, mousePosition = null, selectedPolygon = null) {
    // Store parameters for updates
    this._lastRenderParams = { polygons, currentPolygon, mousePosition, selectedPolygon };
    
    // Get camera for coordinate conversion and culling
    const camera = this.pixiRenderer.camera;
    const zoom = camera ? camera.getZoomLevel() : 1;
    
    // Clear previous graphics
    this.graphics.clear();
    this.previewGraphics.clear();
    this.screenGraphics.clear();
    
    // Calculate detail level based on zoom
    const detailLevel = this.calculateDetailLevel(zoom);
    
    // Calculate viewport bounds for culling
    const viewportBounds = this.getViewportBounds();
    
    // Clean up measurement texts for deleted polygons
    this.cleanupMeasurementTexts(polygons);
    
    // Draw all existing polygons
    polygons.forEach(polygon => {
      if (viewportBounds) {
        const polygonBounds = polygon.getBounds();
        if (!isObjectInViewport(polygonBounds, viewportBounds)) {
          return;
        }
      }
      
      this.drawPolygon(
        this.graphics, 
        polygon, 
        polygon === selectedPolygon ? 0x0066ff : 0x000000, 
        zoom, 
        detailLevel
      );
      
      // Show measurement for selected polygon
      if (polygon === selectedPolygon) {
        this.updatePolygonMeasurement(polygon, zoom, detailLevel);
      } else {
        // Hide measurement for non-selected polygons
        const textObj = this.measurementTexts.get(polygon.id);
        if (textObj) {
          textObj.visible = false;
        }
      }
    });
    
    // Draw the current preview polygon if it exists
    if (currentPolygon) {
      this.drawPolygon(
        this.previewGraphics, 
        currentPolygon, 
        0x0066ff, // Blue color for preview
        zoom, 
        detailLevel, 
        0.8  // Lower alpha for preview
      );
      
      // Always show measurement for the preview polygon
      this.updatePolygonMeasurement(currentPolygon, zoom, detailLevel);
      
      // Draw point markers
      this.drawPointMarkers(currentPolygon, zoom);
    }
  }
  
  drawPolygon(graphics, polygon, color, zoom, detailLevel, alpha = 1) {
    // Skip if no points
    if (!polygon.points || polygon.points.length < 2) return;
    
    // Calculate stroke width based on zoom level
    const strokeWidth = this.getStrokeWidthForZoom(zoom);
    
    // Start drawing the polygon
    if (polygon.points.length > 0) {
      const firstPoint = polygon.points[0];
      graphics.moveTo(firstPoint.x, firstPoint.y);
      
      // Draw the polygon as a series of lines
      for (let i = 1; i < polygon.points.length; i++) {
        const point = polygon.points[i];
        graphics.lineTo(point.x, point.y);
      }
      
      // Close the polygon if it's marked as closed
      if (polygon.isClosed) {
        graphics.lineTo(firstPoint.x, firstPoint.y);
        
        // Apply a semi-transparent fill instead of fully opaque white
        // This allows visibility of layers beneath while still showing the polygon area
        graphics.fill({ color: 0xffffff, alpha: 0.1 });
      }
      
      // Stroke the polygon outline
      graphics.stroke({ 
        color: color, 
        width: strokeWidth,
        alpha: alpha,
        join: 'round',
        cap: 'round'
      });
    }
    
    // Only draw vertex points for editing mode or while actively drawing
    if (polygon === this._lastRenderParams.selectedPolygon || polygon === this._lastRenderParams.currentPolygon) {
      this.drawPoints(graphics, polygon, color, strokeWidth, alpha);
    }
  }
  
  drawPoints(graphics, polygon, color, strokeWidth, alpha) {
    polygon.points.forEach((point, index) => {
      // Draw a circle at each point
      graphics.circle(point.x, point.y, strokeWidth * 2);
      graphics.fill({ color: color, alpha: alpha });
      
      // Highlight the first point for unclosed polygons
      if (index === 0 && !polygon.isClosed) {
        graphics.circle(point.x, point.y, strokeWidth * 3);
        graphics.stroke({ 
          color: color, 
          width: strokeWidth * 0.5,
          alpha: alpha
        });
      }
    });
  }
  
  drawPointMarkers(polygon, zoom) {
    // Skip if no camera or no polygon
    if (!this.pixiRenderer.camera || !polygon) return;
    
    // Only draw point markers if we're actively drawing this polygon
    // or if it's the selected polygon in edit mode
    if (polygon !== this._lastRenderParams.currentPolygon && 
        polygon !== this._lastRenderParams.selectedPolygon) {
      return;
    }
    
    // Calculate appropriate size for markers based on zoom
    const markerSize = 5; // Fixed size in screen space
    
    // Draw markers for each point
    polygon.points.forEach((point, index) => {
      // Convert to screen coordinates
      const screenPos = this.pixiRenderer.camera.worldToScreen(point.x, point.y);
      
      // Draw point marker in screen space
      this.screenGraphics.circle(screenPos.x, screenPos.y, markerSize);
      
      // Use different fill for first point
      if (index === 0) {
        this.screenGraphics.fill({ color: 0x00aa00, alpha: 1 }); // Green for first point
      } else {
        this.screenGraphics.fill({ color: 0x0066ff, alpha: 1 }); // Blue for other points
      }
    });
  }
  
  updatePolygonMeasurement(polygon, zoom = 1, detailLevel = 2) {
    // Skip rendering of tiny polygons or polygons with fewer than 2 points
    if (!polygon.points || polygon.points.length < 2) {
      // Hide measurement if it exists
      if (this.measurementTexts.has(polygon.id)) {
        const textObj = this.measurementTexts.get(polygon.id);
        textObj.visible = false;
      }
      return;
    }
    
    // Format perimeter and area
    const perimeterText = this.formatLength(polygon.perimeter);
    let areaText = '';
    
    // Only show area for closed polygons
    if (polygon.isClosed && polygon.points.length >= 3) {
      areaText = `\nA: ${this.formatArea(polygon.area)}`;
    }
    
    // Create combined text
    const measurementText = `P: ${perimeterText}${areaText}`;
    
    // Create or update text
    let textObj;
    if (this.measurementTexts.has(polygon.id)) {
      textObj = this.measurementTexts.get(polygon.id);
      textObj.text = measurementText;
      textObj.visible = true;
      textObj.polygon = polygon; // Store reference to the polygon
    } else {
      // Use new Text constructor syntax for Pixi v8
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
      textObj.polygon = polygon; // Store reference to the polygon
      
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
      
      this.measurementTexts.set(polygon.id, textObj);
    }
    
    // Calculate centroid for text position
    const centroid = this.calculatePolygonCentroid(polygon);
    
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
  
  calculateDetailLevel(zoom) {
    // Define zoom thresholds for different detail levels
    if (zoom < 0.001) return 0;      // Showing >1km per screen - minimal details
    if (zoom < 0.01) return 1;       // 100m view - basic details 
    if (zoom < 0.1) return 2;        // 10m view - medium details
    if (zoom < 1.0) return 3;        // 1m view - high details
    return 4;                        // <1m view - ultra high details
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
  
  cleanupMeasurementTexts(polygons) {
    // Get all current polygon IDs
    const currentIds = new Set(polygons.map(polygon => polygon.id));
    
    // Remove text objects for polygons that no longer exist
    for (const [polygonId, textObj] of this.measurementTexts.entries()) {
      if (!currentIds.has(polygonId)) {
        // Remove from the correct parent
        if (textObj.parent) {
          textObj.parent.removeChild(textObj);
        }
        
        // Destroy the text object
        textObj.destroy();
        
        // Remove from map
        this.measurementTexts.delete(polygonId);
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