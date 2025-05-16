// src/renderers/WallAngleRenderer.js - Updated with position tracking
import { Graphics, Text } from 'pixi.js';
import { PIXELS_PER_METER } from '../core/geometry/MeasurementUtils';

export default class WallAngleRenderer {
  constructor(pixiRenderer) {
    this.pixiRenderer = pixiRenderer;
    this.app = pixiRenderer.app;
    
    // Create two separate graphics objects - one for world coordinates and one for screen
    this.worldGraphics = new Graphics(); // For elements that should scale with zoom
    this.screenGraphics = new Graphics(); // For elements that should remain fixed size
    
    // Create text in screen space for consistent size
    this.angleText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0x0000ff,
        align: 'center',
        fontWeight: 'bold',
        backgroundColor: 0xffffff,
        padding: 4,
        stroke: {
          color: 0xffffff,
          width: 2
        }
      }
    });
    this.angleText.anchor.set(0.5, 0.5);
    this.angleText.visible = false;
    
    // Angle snap settings
    this.snapAngles = [0, 90, 180, 270, 360]; // In degrees
    this.snapThreshold = 5; // Snap within 5 degrees
    
    // Store current angle data for updating positions
    this.currentAngleData = null;
    
    // Add to the UI layer for screen-space rendering
    const uiLayer = this.pixiRenderer.sceneManager?.getLayer('ui');
    if (uiLayer) {
      uiLayer.addChild(this.screenGraphics);
      uiLayer.addChild(this.angleText);
    } else {
      console.warn('UI layer not found, falling back to stage');
      this.app.stage.addChild(this.screenGraphics);
      this.app.stage.addChild(this.angleText);
    }
    
    // Add to the walls layer for world-space rendering
    const wallsLayer = this.pixiRenderer.sceneManager?.getLayer('walls');
    if (wallsLayer) {
      wallsLayer.addChild(this.worldGraphics);
    } else {
      console.warn('Walls layer not found, falling back to stage');
      this.app.stage.addChild(this.worldGraphics);
    }
    
    // Bind the update method for attaching to the render loop
    this.update = this.update.bind(this);
    
    // Start the update loop if app exists
    if (this.app) {
      this.app.ticker.add(this.update);
    }
  }
  
  // Add an update method that will run on every frame
  update() {
    // Update angle graphics and text positions
    this.updatePosition();
  }
  
  // Method to update position based on current angle data
  updatePosition() {
    // Skip if no angle data or camera
    if (!this.currentAngleData || !this.pixiRenderer.camera) return;
    
    // Clear screen graphics for redraw
    this.screenGraphics.clear();
    
    const angleData = this.currentAngleData;
    const { 
      joint, 
      angle, 
      startAngle, 
      endAngle, 
      bisector, 
      isSnapped 
    } = angleData;
    
    // Get camera for coordinate conversion
    const camera = this.pixiRenderer.camera;
    
    // Convert the joint point from world to screen coordinates
    const jointScreen = camera.worldToScreen(joint.x, joint.y);
    
    // Fixed screen-space radius for the angle arc (never scales with zoom)
    const fixedScreenRadius = 30; // 30 pixels
    
    // Draw the angle arc in screen coordinates
    this.screenGraphics.arc(
      jointScreen.x,
      jointScreen.y,
      fixedScreenRadius,
      startAngle * Math.PI / 180, 
      endAngle * Math.PI / 180
    );
    
    // Use blue color normally, green for snapped angles
    const arcColor = 0x0000ff;
    
    this.screenGraphics.stroke({ 
      color: arcColor,
      width: 2,
      alpha: 0.8
    });
    
    // Fill the arc with a semi-transparent color
    this.screenGraphics.arc(
      jointScreen.x,
      jointScreen.y,
      fixedScreenRadius - 4, // Slightly smaller for fill
      startAngle * Math.PI / 180, 
      endAngle * Math.PI / 180
    );
    
    this.screenGraphics.fill({
      color: arcColor,
      alpha: 0.2
    });
    
    // Fixed screen-space distance for text position
    const textDistance = fixedScreenRadius + 15; // 15 pixels away from arc
    
    // Calculate text position in screen coordinates using fixed size
    const textX = jointScreen.x + bisector.x * textDistance;
    const textY = jointScreen.y + bisector.y * textDistance;
    
    // Update text position
    this.angleText.position.set(textX, textY);
  }
  
  // Helper functions remain the same...
  isNear(p1, p2, threshold = 1e-2) {
    if (!p1 || !p2) return false;
    return Math.hypot(p1.x - p2.x, p1.y - p2.y) < threshold;
  }
  
  getDirectionAwayFromJoint(wall, jointPoint) {
    const start = wall.start;
    const end = wall.end;
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    let isStartAtJoint = this.isNear(start, jointPoint, 1e-2);
    let isEndAtJoint = this.isNear(end, jointPoint, 1e-2);
    
    if (isStartAtJoint) {
      return { x: dx, y: dy };
    } else if (isEndAtJoint) {
      return { x: -dx, y: -dy };
    } else {
      const distToStart = Math.hypot(start.x - jointPoint.x, start.y - jointPoint.y);
      const distToEnd = Math.hypot(end.x - jointPoint.x, end.y - jointPoint.y);
      
      return distToStart < distToEnd ? 
        { x: dx, y: dy } : 
        { x: -dx, y: -dy };
    }
  }
  
  findClosestEndpoint(point, walls, threshold = 0.2) { // 20cm in meters
    if (!point || !walls || !walls.length) return null;
    
    let closestPoint = null;
    let minDistance = Infinity;
    let sourceWall = null;
    
    walls.forEach(wall => {
      const distToStart = Math.hypot(wall.start.x - point.x, wall.start.y - point.y);
      if (distToStart < minDistance && distToStart < threshold) {
        minDistance = distToStart;
        closestPoint = { ...wall.start };
        sourceWall = wall;
      }
      
      const distToEnd = Math.hypot(wall.end.x - point.x, wall.end.y - point.y);
      if (distToEnd < minDistance && distToEnd < threshold) {
        minDistance = distToEnd;
        closestPoint = { ...wall.end };
        sourceWall = wall;
      }
    });
    
    if (closestPoint) {
      closestPoint.sourceWall = sourceWall;
    }
    
    return closestPoint;
  }
  
  // Method to check if an angle should be snapped
  shouldSnapAngle(angle) {
    // Use strict 5 degree threshold
    const threshold = 5;
    
    // Only snap at these specific angles
    const snapAngles = [0, 90, 180, 270, 360]; 
    
    for (const snapAngle of snapAngles) {
      if (Math.abs(angle - snapAngle) < threshold) {
        return snapAngle;
      }
    }
    
    // Also check 360-angle for angles near 0/360
    if (Math.abs(360 - angle) < threshold) {
      return 0; // Snap to 0 when near 360
    }
    
    return null; // No snap
  }
  
  calculateAngleData(previewWall, walls, isDrawingContinuous) {
    if (!previewWall || !walls.length || !isDrawingContinuous) return null;
    
    const previewStart = previewWall.start;
    const previewEnd = previewWall.end;
    
    const connectedStart = this.findClosestEndpoint(previewStart, walls);
    const connectedEnd = this.findClosestEndpoint(previewEnd, walls);
    
    const distStart = connectedStart ? 
      Math.hypot(previewStart.x - connectedStart.x, previewStart.y - connectedStart.y) : Infinity;
    const distEnd = connectedEnd ? 
      Math.hypot(previewEnd.x - connectedEnd.x, previewEnd.y - connectedEnd.y) : Infinity;
    
    let joint, other, source;
    
    if (distStart < distEnd) {
      joint = previewStart;
      other = previewEnd;
      source = connectedStart?.sourceWall;
    } else if (distEnd < distStart) {
      joint = previewEnd;
      other = previewStart;
      source = connectedEnd?.sourceWall;
    } else {
      return null;
    }
    
    if (!joint || !other || !source) return null;
    
    const v1 = this.getDirectionAwayFromJoint(source, joint);
    
    const v2 = {
      x: other.x - joint.x,
      y: other.y - joint.y
    };
    
    const mag1 = Math.hypot(v1.x, v1.y);
    const mag2 = Math.hypot(v2.x, v2.y);
    
    if (mag1 === 0 || mag2 === 0) return null;
    
    const norm1 = { x: v1.x / mag1, y: v1.y / mag1 };
    const norm2 = { x: v2.x / mag2, y: v2.y / mag2 };
    
    const dot = norm1.x * norm2.x + norm1.y * norm2.y;
    
    const clampedDot = Math.max(-1, Math.min(1, dot));
    let angle = Math.acos(clampedDot) * 180 / Math.PI;
    
    let startAngle = Math.atan2(norm1.y, norm1.x) * 180 / Math.PI;
    let endAngle = Math.atan2(norm2.y, norm2.x) * 180 / Math.PI;
    
    if (startAngle < 0) startAngle += 360;
    if (endAngle < 0) endAngle += 360;
    
    let arcAngle = (endAngle - startAngle + 360) % 360;
    
    if (arcAngle > 180) {
      arcAngle = 360 - arcAngle;
      const temp = startAngle;
      startAngle = endAngle;
      endAngle = temp;
    }
    
    // Check if the angle should be snapped
    const snapAngle = this.shouldSnapAngle(angle);
    let isSnapped = false;
    
    if (snapAngle !== null) {
      // We need to snap the angle
      isSnapped = true;
      angle = snapAngle;
      
      // Adjust the end angle for drawing the arc correctly
      if (snapAngle === 0 || snapAngle === 180) {
        endAngle = startAngle + snapAngle;
      } else if (snapAngle === 90 || snapAngle === 270) {
        endAngle = startAngle + snapAngle;
      }
    }
    
    // Fixed radius (in radians) for consistent size arc (will be scaled in render)
    const radius = 0.5; // 0.5 meters = 50cm
    
    const bisectorAngle = (startAngle + arcAngle / 2) % 360;
    const bisector = {
      x: Math.cos(bisectorAngle * Math.PI / 180),
      y: Math.sin(bisectorAngle * Math.PI / 180)
    };
    
    return {
      joint,
      angle,
      startAngle,
      endAngle: startAngle + arcAngle,
      radius,
      bisector,
      norm1,
      norm2,
      isSnapped,
      snapAngle,
      sourceWall: source,
      previewWall, // Store reference to the preview wall
      connectedWall: source // Store reference to the connected wall
    };
  }
  
  // Return the snapped endpoint if angle should be snapped
  getSnappedEndpoint(joint, other, angle) {
    if (angle === null) return other;
    
    // Calculate the distance from joint to other
    const distance = Math.hypot(other.x - joint.x, other.y - joint.y);
    
    // Convert angle to radians - adjust to match coordinate system
    const angleRad = angle * Math.PI / 180;
    
    // Calculate new endpoint based on angle
    return {
      x: joint.x + Math.cos(angleRad) * distance,
      y: joint.y + Math.sin(angleRad) * distance
    };
  }
  
  // Get snap guide info for visualization
  getSnapGuideInfo(previewWall, walls, isDrawingContinuous) {
    if (!previewWall || !isDrawingContinuous) return null;
    
    const angleData = this.calculateAngleData(previewWall, walls, isDrawingContinuous);
    if (!angleData || !angleData.isSnapped) return null;
    
    const { joint, snapAngle, norm1 } = angleData;
    
    // Determine which end is the joint
    const isStartJoint = this.isNear(previewWall.start, joint, 1e-2);
    
    // Get the length of the wall
    const length = Math.hypot(
      previewWall.end.x - previewWall.start.x,
      previewWall.end.y - previewWall.start.y
    );
    
    // Calculate the snapped angle in radians
    const referenceAngle = Math.atan2(norm1.y, norm1.x) * 180 / Math.PI;
    let snappedAngle = (referenceAngle + snapAngle) % 360;
    if (snappedAngle < 0) snappedAngle += 360;
    
    // Convert to radians
    const snappedRad = snappedAngle * Math.PI / 180;
    
    // Calculate new endpoint
    const snappedEnd = {
      x: joint.x + Math.cos(snappedRad) * length,
      y: joint.y + Math.sin(snappedRad) * length
    };
    
    return {
      joint,
      snappedEnd,
      isStartJoint,
      snapAngle
    };
  }
  
  // Updated render method for fixed-size UI elements with position tracking
  render(previewWall, walls, isDrawingContinuous, showDebugLines = false) {
    // Clear world graphics (will be redrawn)
    this.worldGraphics.clear();
    
    // Hide angle text if not drawing
    if (!previewWall || !isDrawingContinuous) {
      // Clear current data and hide text
      this.currentAngleData = null;
      this.angleText.visible = false;
      this.screenGraphics.clear();
      return;
    }
    
    // Calculate angle data
    const angleData = this.calculateAngleData(previewWall, walls, isDrawingContinuous);
    if (!angleData) {
      // Clear current data and hide text if no valid angle
      this.currentAngleData = null;
      this.angleText.visible = false;
      this.screenGraphics.clear();
      return;
    }
    
    // Store the current angle data for updates
    this.currentAngleData = angleData;
    
    const { 
      joint, 
      angle, 
      isSnapped 
    } = angleData;
    
    // Get camera for coordinate conversion
    const camera = this.pixiRenderer.camera;
    if (!camera) return;
    
    // Update and position the angle text
    // Show actual angle with special formatting for snapped angles
    const formattedAngle = isSnapped ? 
      `${angle.toFixed(0)}°` : // Exact integer for snapped
      `${angle.toFixed(1)}°`;  // One decimal for normal angles
    
    this.angleText.text = formattedAngle;
    
    // Set text styling - fixed font size regardless of zoom
    this.angleText.style.fill = 0x0000ff;
    this.angleText.style.fontSize = 14;
    
    // Make the text visible
    this.angleText.visible = true;
    
    // Draw initial position (updatePosition will be called each frame after this)
    this.updatePosition();
    
    
  }
  
  // Helper method to draw dashed lines in world coordinates
  drawDashedLine(x1, y1, x2, y2, color, width, dashSize, gapSize) {
    // Calculate line length and angle
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    // Normalize direction
    const nx = dx / len;
    const ny = dy / len;
    
    // Draw dashed segments
    let pos = 0;
    let drawing = true;
    
    while (pos < len) {
      const segLen = drawing ? dashSize : gapSize;
      const endPos = Math.min(pos + segLen, len);
      
      if (drawing) {
        const startX = x1 + nx * pos;
        const startY = y1 + ny * pos;
        const endX = x1 + nx * endPos;
        const endY = y1 + ny * endPos;
        
        this.worldGraphics.moveTo(startX, startY);
        this.worldGraphics.lineTo(endX, endY);
        this.worldGraphics.stroke({
          color: color,
          width: width * PIXELS_PER_METER, // Convert to pixels
          alpha: 0.7,
          cap: 'round'
        });
      }
      
      pos = endPos;
      drawing = !drawing;
    }
  }
  
  destroy() {
    // Remove from ticker
    if (this.app) {
      this.app.ticker.remove(this.update);
    }
    
    // Clean up resources
    this.worldGraphics.destroy();
    this.screenGraphics.destroy();
    this.angleText.destroy();
  }
}