// // src/renderers/CircleRenderer.js
// import { Graphics, Text } from 'pixi.js';
// import { isObjectInViewport } from '../core/geometry/MeasurementUtils';

// export default class CircleRenderer {
//   constructor(pixiRenderer) {
//     this.pixiRenderer = pixiRenderer;
//     this.app = pixiRenderer.app;
    
//     // Create graphics objects for world-space rendering
//     this.graphics = new Graphics();
//     this.previewGraphics = new Graphics();
    
//     // Create graphics for screen-space fixed UI
//     this.screenGraphics = new Graphics();
    
//     // Map to store measurements text objects
//     this.measurementTexts = new Map();
    
//     // Make sure the graphics are added to the right layer
//     const circlesLayer = this.pixiRenderer.sceneManager?.getLayer('walls');
//     if (circlesLayer) {
//       circlesLayer.addChild(this.graphics);
//       circlesLayer.addChild(this.previewGraphics);
//     } else {
//       console.warn('Circles layer not found, falling back to stage');
//       this.app.stage.addChild(this.graphics);
//       this.app.stage.addChild(this.previewGraphics);
//     }
    
//     // Add screen graphics to UI layer
//     const uiLayer = this.pixiRenderer.sceneManager?.getLayer('ui');
//     if (uiLayer) {
//       uiLayer.addChild(this.screenGraphics);
//     } else {
//       this.app.stage.addChild(this.screenGraphics);
//     }
    
//     // Bind the update method
//     this.update = this.update.bind(this);
    
//     // Start the update loop if app exists
//     if (this.app) {
//       this.app.ticker.add(this.update);
//     }
    
//     // Track the last render parameters for updates
//     this._lastRenderParams = {
//       circles: [],
//       currentCircle: null,
//       mousePosition: null,
//       selectedCircle: null
//     };
//   }
  
//   update() {
//     // Update text positions
//     this.updateMeasurementPositions();
    
//     // Update radius line for current circle only (not selected)
//     if (this._lastRenderParams.currentCircle) {
//       this.updateRadiusLine(this._lastRenderParams.currentCircle);
//     } else {
//       // Clear any existing radius lines when not drawing
//       this.screenGraphics.clear();
//     }
//   }
  
//   updateMeasurementPositions() {
//     // Skip if no camera
//     if (!this.pixiRenderer.camera) return;
    
//     // Update each text position
//     this.measurementTexts.forEach((textObj, circleId) => {
//       // Skip if text isn't visible
//       if (!textObj.visible) return;
      
//       // Find the circle for this text
//       const circle = textObj.circle;
//       if (!circle) return;
      
//       // Convert to screen coordinates
//       const screenPos = this.pixiRenderer.camera.worldToScreen(circle.center.x, circle.center.y);
      
//       // Update text position
//       textObj.position.set(screenPos.x, screenPos.y);
//     });
//   }
  
//   updateRadiusLine(circle) {
//     // Skip if no camera
//     if (!this.pixiRenderer.camera) return;
    
//     // Clear screen graphics for redraws
//     this.screenGraphics.clear();
    
//     // Only draw radius line for circles that are being created (not for completed circles)
//     const lastParams = this._lastRenderParams;
//     if (lastParams.currentCircle !== circle) {
//       return; // Don't draw radius line for existing circles
//     }
    
//     // Convert center to screen coordinates
//     const center = this.pixiRenderer.camera.worldToScreen(circle.center.x, circle.center.y);
    
//     // Calculate a point on the circle's edge (right side)
//     const edgePoint = this.pixiRenderer.camera.worldToScreen(
//       circle.center.x + circle.radius,
//       circle.center.y
//     );
    
//     // Draw radius line with dashed style
//     this.screenGraphics.moveTo(center.x, center.y);
//     this.screenGraphics.lineTo(edgePoint.x, edgePoint.y);
//     this.screenGraphics.stroke({ 
//       color: 0x0066ff, 
//       width: 1.5,
//       alpha: 0.8,
//       dash: [5, 5]
//     });
    
//     // Draw a small dot at the center
//     this.screenGraphics.circle(center.x, center.y, 3);
//     this.screenGraphics.fill({ color: 0x0066ff, alpha: 1 });
//   }
  
//   render(circles = [], currentCircle = null, mousePosition = null, selectedCircle = null) {
//     // Store parameters for updates
//     this._lastRenderParams = { circles, currentCircle, mousePosition, selectedCircle };
    
//     // Get camera for coordinate conversion and culling
//     const camera = this.pixiRenderer.camera;
//     const zoom = camera ? camera.getZoomLevel() : 1;
    
//     // Clear previous graphics
//     this.graphics.clear();
//     this.previewGraphics.clear();
//     this.screenGraphics.clear();
    
//     // Calculate viewport bounds for culling
//     const viewportBounds = this.getViewportBounds();
    
//     // Clean up measurement texts for deleted circles
//     this.cleanupMeasurementTexts(circles);
    
//     // Draw all existing circles
//     circles.forEach(circle => {
//       if (viewportBounds) {
//         const circleBounds = circle.getBounds();
//         if (!isObjectInViewport(circleBounds, viewportBounds)) {
//           return;
//         }
//       }
      
//       this.drawPerfectCircle(
//         this.graphics, 
//         circle, 
//         circle === selectedCircle ? 0x0066ff : 0x000000, 
//         zoom
//       );
      
//       // Show measurement for selected circle
//       if (circle === selectedCircle) {
//         this.updateCircleMeasurement(circle, zoom);
//       } else {
//         // Hide measurement for non-selected circles
//         const textObj = this.measurementTexts.get(circle.id);
//         if (textObj) {
//           textObj.visible = false;
//         }
//       }
//     });
    
//     // Draw the current preview circle if it exists
//     if (currentCircle) {
//       this.drawPerfectCircle(
//         this.previewGraphics, 
//         currentCircle, 
//         0x0066ff, // Blue color for preview
//         zoom, 
//         0.8  // Lower alpha for preview
//       );
      
//       // Always show measurement for the preview circle
//       this.updateCircleMeasurement(currentCircle, zoom);
      
//       // Update radius line - only for the preview (current) circle
//       this.updateRadiusLine(currentCircle);
//     }
//   }
  
//   // New method that draws a perfect circle using Bezier curves
//   drawPerfectCircle(graphics, circle, color, zoom, alpha = 1) {
//     // Calculate stroke width based on zoom level
//     const strokeWidth = this.getStrokeWidthForZoom(zoom);
    
//     const centerX = circle.center.x;
//     const centerY = circle.center.y;
//     const radius = circle.radius;
    
//     // Clear any previous content on this graphics object
//     // graphics.clear(); - clearing happens in render method
    
//     // Fill with white first
//     this.drawEllipticalArc(graphics, centerX, centerY, radius, radius, 0, 0, Math.PI * 2);
//     graphics.fill({ color: 0xffffff, alpha: 1 });
    
//     // Then stroke with specified color
//     this.drawEllipticalArc(graphics, centerX, centerY, radius, radius, 0, 0, Math.PI * 2);
//     graphics.stroke({ 
//       color: color, 
//       width: strokeWidth,
//       alpha: alpha,
//       alignment: 0
//     });
    
//     // Draw center point as a small circle
//     graphics.circle(centerX, centerY, strokeWidth * 1.2);
//     graphics.fill({ color: color, alpha: alpha });
//   }
  
//   // Method to draw a perfect circle (or ellipse) using elliptical arc approximation
//   drawEllipticalArc(graphics, cx, cy, rx, ry, rotation, startAngle, endAngle) {
//     // Define how many Bezier curves to use - more for larger circles
//     const curves = 8; // Use 8 Bezier curves (32 points) for a full circle
    
//     // Calculate the total angle
//     const delta = endAngle - startAngle;
//     const step = delta / curves;
    
//     // Starting point
//     const start = {
//       x: cx + rx * Math.cos(startAngle),
//       y: cy + ry * Math.sin(startAngle)
//     };
    
//     graphics.moveTo(start.x, start.y);
    
//     // Draw the Bezier curves that approximate the elliptical arc
//     for (let i = 0; i < curves; i++) {
//       const theta1 = startAngle + i * step;
//       const theta2 = theta1 + step;
      
//       // Calculate control points for the Bezier curve
//       const anchor = 4/3 * Math.tan((theta2 - theta1) / 4);
      
//       const cp1 = {
//         x: cx + rx * (Math.cos(theta1) - anchor * Math.sin(theta1)),
//         y: cy + ry * (Math.sin(theta1) + anchor * Math.cos(theta1))
//       };
      
//       const cp2 = {
//         x: cx + rx * (Math.cos(theta2) + anchor * Math.sin(theta2)),
//         y: cy + ry * (Math.sin(theta2) - anchor * Math.cos(theta2))
//       };
      
//       const end = {
//         x: cx + rx * Math.cos(theta2),
//         y: cy + ry * Math.sin(theta2)
//       };
      
//       // Draw the Bezier curve
//       graphics.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
//     }
//   }
  
//   updateCircleMeasurement(circle, zoom = 1) {
//     // Skip rendering of tiny circles
//     if (circle.radius < 0.01) { // Less than 1cm
//       // Hide measurement if it exists
//       if (this.measurementTexts.has(circle.id)) {
//         const textObj = this.measurementTexts.get(circle.id);
//         textObj.visible = false;
//       }
//       return;
//     }
    
//     // Format radius and area
//     const radiusText = this.formatLength(circle.radius);
//     const diameterText = this.formatLength(circle.radius * 2);
//     const areaText = this.formatArea(circle.area);
    
//     // Create combined text
//     const measurementText = `R: ${radiusText}\nD: ${diameterText}\nA: ${areaText}`;
    
//     // Create or update text
//     let textObj;
//     if (this.measurementTexts.has(circle.id)) {
//       textObj = this.measurementTexts.get(circle.id);
//       textObj.text = measurementText;
//       textObj.visible = true;
//       textObj.circle = circle; // Store reference to the circle
//     } else {
//       // Use new Text constructor syntax for Pixi v8
//       textObj = new Text({
//         text: measurementText,
//         style: {
//           fontFamily: 'Arial, Helvetica, sans-serif',
//           fontSize: 14,
//           fontWeight: 'bold',
//           fill: 0x0000ff, // Blue text
//           align: 'center',
//           stroke: {
//             color: 0xFFFFFF,
//             width: 3
//           },
//           letterSpacing: 0.5,
//           backgroundColor: 0xFFFFFF,
//           padding: 4
//         }
//       });
      
//       textObj.anchor.set(0.5, 0.5);
//       textObj.resolution = 2; // Higher resolution for crisp text
//       textObj.circle = circle; // Store reference to the circle
      
//       // Add text to the UI layer
//       const measurementsLayer = this.pixiRenderer.sceneManager?.getLayer('measurements');
//       if (measurementsLayer) {
//         measurementsLayer.addChild(textObj);
//       } else {
//         // Fallback to regular UI layer
//         const uiLayer = this.pixiRenderer.sceneManager?.getLayer('ui');
//         if (uiLayer) {
//           uiLayer.addChild(textObj);
//         } else {
//           this.app.stage.addChild(textObj);
//         }
//       }
      
//       this.measurementTexts.set(circle.id, textObj);
//     }
    
//     // Convert world position to screen position for initial text placement
//     const camera = this.pixiRenderer.camera;
//     if (camera) {
//       const screenPos = camera.worldToScreen(circle.center.x, circle.center.y);
//       textObj.position.set(screenPos.x, screenPos.y);
//     }
    
//     // Fixed font size regardless of zoom
//     textObj.style.fontSize = 14;
    
//     // Always full opacity
//     textObj.alpha = 1;
//   }
  
//   formatLength(length) {
//     // length is already in meters
//     if (length < 0.01) {
//       return `${(length * 1000).toFixed(0)}mm`;
//     } else if (length < 1) {
//       return `${(length * 100).toFixed(1)}cm`;
//     } else if (length < 10) {
//       return `${length.toFixed(2)}m`;
//     } else if (length < 100) {
//       return `${length.toFixed(1)}m`;
//     } else {
//       return `${Math.round(length)}m`;
//     }
//   }
  
//   formatArea(area) {
//     // area is in square meters
//     if (area < 0.01) {
//       return `${(area * 10000).toFixed(0)}cm²`;
//     } else if (area < 1) {
//       return `${(area * 100).toFixed(2)}m²`;
//     } else if (area < 10000) {
//       return `${area.toFixed(2)}m²`;
//     } else {
//       // Convert to hectares
//       return `${(area / 10000).toFixed(2)}ha`;
//     }
//   }
  
//   getStrokeWidthForZoom(zoom) {
//     // Base width in world units (meters)
//     const baseWidth = 0.02;
    
//     // Apply inverse scaling but ensure a minimum width
//     const calculatedWidth = baseWidth / Math.sqrt(zoom) * 0.5;
    
//     // Ensure a minimum visible thickness (in meters)
//     return Math.max(calculatedWidth, 0.001);
//   }
  
//   getViewportBounds() {
//     if (!this.pixiRenderer.camera) return null;
    
//     const camera = this.pixiRenderer.camera;
//     const app = this.app;
    
//     // Calculate viewport bounds in world coordinates (meters)
//     const topLeft = camera.screenToWorld(0, 0);
//     const bottomRight = camera.screenToWorld(
//       app.renderer.width,
//       app.renderer.height
//     );
    
//     // Add buffer (scaled by zoom level for consistency)
//     const bufferSize = 10 / camera.getZoomLevel(); 
    
//     return {
//       minX: topLeft.x - bufferSize,
//       minY: topLeft.y - bufferSize,
//       maxX: bottomRight.x + bufferSize,
//       maxY: bottomRight.y + bufferSize
//     };
//   }
  
//   cleanupMeasurementTexts(circles) {
//     // Get all current circle IDs
//     const currentIds = new Set(circles.map(circle => circle.id));
    
//     // Remove text objects for circles that no longer exist
//     for (const [circleId, textObj] of this.measurementTexts.entries()) {
//       if (!currentIds.has(circleId)) {
//         // Remove from the correct parent
//         if (textObj.parent) {
//           textObj.parent.removeChild(textObj);
//         }
        
//         // Destroy the text object
//         textObj.destroy();
        
//         // Remove from map
//         this.measurementTexts.delete(circleId);
//       }
//     }
//   }
  
//   destroy() {
//     // Remove ticker update
//     if (this.app) {
//       this.app.ticker.remove(this.update);
//     }
    
//     // Clean up all measurement texts
//     this.cleanupMeasurementTexts([]);
    
//     // Clean up graphics
//     if (this.graphics) {
//       this.graphics.destroy();
//       this.graphics = null;
//     }
    
//     if (this.previewGraphics) {
//       this.previewGraphics.destroy();
//       this.previewGraphics = null;
//     }
    
//     if (this.screenGraphics) {
//       this.screenGraphics.destroy();
//       this.screenGraphics = null;
//     }
//   }
// }

// src/renderers/CircleRenderer.js
import { Graphics, Text } from 'pixi.js';
import { isObjectInViewport } from '../core/geometry/MeasurementUtils';

export default class CircleRenderer {
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
    const circlesLayer = this.pixiRenderer.sceneManager?.getLayer('walls');
    if (circlesLayer) {
      circlesLayer.addChild(this.graphics);
      circlesLayer.addChild(this.previewGraphics);
    } else {
      console.warn('Circles layer not found, falling back to stage');
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
      circles: [],
      currentCircle: null,
      mousePosition: null,
      selectedCircle: null
    };
  }
  
  update() {
    // Update text positions
    this.updateMeasurementPositions();
    
    // Update radius line for current circle only (not selected)
    if (this._lastRenderParams.currentCircle) {
      this.updateRadiusLine(this._lastRenderParams.currentCircle);
    } else {
      // Clear any existing radius lines when not drawing
      this.screenGraphics.clear();
    }
  }
  
  updateMeasurementPositions() {
    // Skip if no camera
    if (!this.pixiRenderer.camera) return;
    
    // Update each text position
    this.measurementTexts.forEach((textObj, circleId) => {
      // Skip if text isn't visible
      if (!textObj.visible) return;
      
      // Find the circle for this text
      const circle = textObj.circle;
      if (!circle) return;
      
      // Convert to screen coordinates
      const screenPos = this.pixiRenderer.camera.worldToScreen(circle.center.x, circle.center.y);
      
      // Update text position
      textObj.position.set(screenPos.x, screenPos.y);
    });
  }
  
  updateRadiusLine(circle) {
    // Skip if no camera
    if (!this.pixiRenderer.camera) return;
    
    // Clear screen graphics for redraws
    this.screenGraphics.clear();
    
    // Only draw radius line for circles that are being created (not for completed circles)
    const lastParams = this._lastRenderParams;
    if (lastParams.currentCircle !== circle) {
      return; // Don't draw radius line for existing circles
    }
    
    // Convert center to screen coordinates
    const center = this.pixiRenderer.camera.worldToScreen(circle.center.x, circle.center.y);
    
    // Calculate a point on the circle's edge (right side)
    const edgePoint = this.pixiRenderer.camera.worldToScreen(
      circle.center.x + circle.radius,
      circle.center.y
    );
    
    // Draw radius line with dashed style
    this.screenGraphics.moveTo(center.x, center.y);
    this.screenGraphics.lineTo(edgePoint.x, edgePoint.y);
    this.screenGraphics.stroke({ 
      color: 0x0066ff, 
      width: 1.5,
      alpha: 0.8,
      dash: [5, 5]
    });
    
    // Draw a small dot at the center
    this.screenGraphics.circle(center.x, center.y, 3);
    this.screenGraphics.fill({ color: 0x0066ff, alpha: 1 });
  }
  
  render(circles = [], currentCircle = null, mousePosition = null, selectedCircle = null) {
    // Store parameters for updates
    this._lastRenderParams = { circles, currentCircle, mousePosition, selectedCircle };
    
    // Get camera for coordinate conversion and culling
    const camera = this.pixiRenderer.camera;
    const zoom = camera ? camera.getZoomLevel() : 1;
    
    // Clear previous graphics
    this.graphics.clear();
    this.previewGraphics.clear();
    this.screenGraphics.clear();
    
    // Calculate viewport bounds for culling
    const viewportBounds = this.getViewportBounds();
    
    // Clean up measurement texts for deleted circles
    this.cleanupMeasurementTexts(circles);
    
    // Draw all existing circles
    circles.forEach(circle => {
      if (viewportBounds) {
        const circleBounds = circle.getBounds();
        if (!isObjectInViewport(circleBounds, viewportBounds)) {
          return;
        }
      }
      
      this.drawPerfectCircle(
        this.graphics, 
        circle, 
        circle === selectedCircle ? 0x0066ff : 0x000000, 
        zoom
      );
      
      // Show measurement for selected circle
      if (circle === selectedCircle) {
        this.updateCircleMeasurement(circle, zoom);
      } else {
        // Hide measurement for non-selected circles
        const textObj = this.measurementTexts.get(circle.id);
        if (textObj) {
          textObj.visible = false;
        }
      }
    });
    
    // Draw the current preview circle if it exists
    if (currentCircle) {
      this.drawPerfectCircle(
        this.previewGraphics, 
        currentCircle, 
        0x0066ff, // Blue color for preview
        zoom, 
        0.8  // Lower alpha for preview
      );
      
      // Always show measurement for the preview circle
      this.updateCircleMeasurement(currentCircle, zoom);
      
      // Update radius line - only for the preview (current) circle
      this.updateRadiusLine(currentCircle);
    }
  }
  
  // New method that draws a perfect circle using Bezier curves
  drawPerfectCircle(graphics, circle, color, zoom, alpha = 1) {
    // Calculate stroke width based on zoom level
    const strokeWidth = this.getStrokeWidthForZoom(zoom);
    
    const centerX = circle.center.x;
    const centerY = circle.center.y;
    const radius = circle.radius;
    
    // Clear any previous path
    graphics.beginPath();
    
    // Draw a perfect circle with extremely high precision
    // Use 64 segments for ultra-smooth rendering
    const segments = 64;
    const angleIncrement = (Math.PI * 2) / segments;
    
    // First point
    const startX = centerX + radius;
    const startY = centerY;
    graphics.moveTo(startX, startY);
    
    // Draw arc with many small segments for perfect smoothness
    for (let i = 1; i <= segments; i++) {
      const angle = i * angleIncrement;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      graphics.lineTo(x, y);
    }
    
    // Close the path
    graphics.closePath();
    
    // Apply semi-transparent fill
    graphics.fill({ color: 0xffffff, alpha: 0.1 });
    
    // Stroke with specified color - use 'round' cap style for smoother appearance
    graphics.stroke({ 
      color: color, 
      width: strokeWidth,
      alpha: alpha,
      alignment: 0,
      join: 'round',
      cap: 'round'
    });
    
    // Only draw center point for circles that are being edited or created
    if (circle === this._lastRenderParams.selectedCircle || 
        circle === this._lastRenderParams.currentCircle) {
      graphics.circle(centerX, centerY, strokeWidth * 1.2);
      graphics.fill({ color: color, alpha: alpha });
    }
  }
  
  // Method to draw a perfect circle (or ellipse) using elliptical arc approximation
  drawEllipticalArc(graphics, cx, cy, rx, ry, rotation, startAngle, endAngle) {
    // Define how many Bezier curves to use - more for larger circles
    const curves = 16; // Increased from 8 to 16 for smoother circles
    
    // Calculate the total angle
    const delta = endAngle - startAngle;
    const step = delta / curves;
    
    // Starting point
    const start = {
      x: cx + rx * Math.cos(startAngle),
      y: cy + ry * Math.sin(startAngle)
    };
    
    graphics.moveTo(start.x, start.y);
    
    // Draw the Bezier curves that approximate the elliptical arc
    for (let i = 0; i < curves; i++) {
      const theta1 = startAngle + i * step;
      const theta2 = theta1 + step;
      
      // Calculate control points for the Bezier curve
      const anchor = 4/3 * Math.tan((theta2 - theta1) / 4);
      
      const cp1 = {
        x: cx + rx * (Math.cos(theta1) - anchor * Math.sin(theta1)),
        y: cy + ry * (Math.sin(theta1) + anchor * Math.cos(theta1))
      };
      
      const cp2 = {
        x: cx + rx * (Math.cos(theta2) + anchor * Math.sin(theta2)),
        y: cy + ry * (Math.sin(theta2) - anchor * Math.cos(theta2))
      };
      
      const end = {
        x: cx + rx * Math.cos(theta2),
        y: cy + ry * Math.sin(theta2)
      };
      
      // Draw the Bezier curve
      graphics.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
    }
  }
  
  updateCircleMeasurement(circle, zoom = 1) {
    // Skip rendering of tiny circles
    if (circle.radius < 0.01) { // Less than 1cm
      // Hide measurement if it exists
      if (this.measurementTexts.has(circle.id)) {
        const textObj = this.measurementTexts.get(circle.id);
        textObj.visible = false;
      }
      return;
    }
    
    // Format radius and area
    const radiusText = this.formatLength(circle.radius);
    const diameterText = this.formatLength(circle.radius * 2);
    const areaText = this.formatArea(circle.area);
    
    // Create combined text
    const measurementText = `R: ${radiusText}\nD: ${diameterText}\nA: ${areaText}`;
    
    // Create or update text
    let textObj;
    if (this.measurementTexts.has(circle.id)) {
      textObj = this.measurementTexts.get(circle.id);
      textObj.text = measurementText;
      textObj.visible = true;
      textObj.circle = circle; // Store reference to the circle
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
      textObj.circle = circle; // Store reference to the circle
      
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
      
      this.measurementTexts.set(circle.id, textObj);
    }
    
    // Convert world position to screen position for initial text placement
    const camera = this.pixiRenderer.camera;
    if (camera) {
      const screenPos = camera.worldToScreen(circle.center.x, circle.center.y);
      textObj.position.set(screenPos.x, screenPos.y);
    }
    
    // Fixed font size regardless of zoom
    textObj.style.fontSize = 14;
    
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
    const baseWidth = 0.04;
    
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
  
  cleanupMeasurementTexts(circles) {
    // Get all current circle IDs
    const currentIds = new Set(circles.map(circle => circle.id));
    
    // Remove text objects for circles that no longer exist
    for (const [circleId, textObj] of this.measurementTexts.entries()) {
      if (!currentIds.has(circleId)) {
        // Remove from the correct parent
        if (textObj.parent) {
          textObj.parent.removeChild(textObj);
        }
        
        // Destroy the text object
        textObj.destroy();
        
        // Remove from map
        this.measurementTexts.delete(circleId);
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