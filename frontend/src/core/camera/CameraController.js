// src/core/camera/CameraController.js
import { PIXELS_PER_METER } from '../geometry/MeasurementUtils';

export default class CameraController {
    constructor(pixiRenderer) {
        this.pixiRenderer = pixiRenderer;
        this.app = pixiRenderer.app;
        this.onTransformChange = null;
        
        // Camera state
        this.zoom = 1.0;  // Represents scale factor where 1.0 = 1 meter shown at PIXELS_PER_METER pixels
        
        // Initially center the view (will be updated in initialize)
        this.position = { x: 0, y: 0 };
        
        // Set extreme zoom limits for micro to macro scale
        this.minZoom = 1 / 1e6;  // Can zoom in to 0.000001 meters (1μm detail)
        this.maxZoom = 1e3;      // Can zoom out to show 800,000m+ on screen
      
        // For space key panning
        this.isSpaceDown = false;
        
        // Tracking state for input handling
        this.isDragging = false;
        this.lastMousePosition = null;
        
        // Bind methods
        this.onWheel = this.onWheel.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onResize = this.onResize.bind(this);
        
        this.initialize();
    }
    
    initialize() {
        if (!this.app) return;
        
        // Set up event listeners
        const canvas = this.app.canvas;
        canvas.addEventListener('wheel', this.onWheel);
        canvas.addEventListener('mousedown', this.onMouseDown);
        canvas.addEventListener('mousemove', this.onMouseMove);
        canvas.addEventListener('mouseup', this.onMouseUp);
        
        // Add keyboard event listeners
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        
        // Add resize listener
        window.addEventListener('resize', this.onResize);
        
        // Center the view on initialization
        this.centerView();
        
        // Initial transform update
        this.updateTransform();
    }
    
    destroy() {
        if (!this.app) return;
        
        // Remove event listeners
        const canvas = this.app.canvas;
        canvas.removeEventListener('wheel', this.onWheel);
        canvas.removeEventListener('mousedown', this.onMouseDown);
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('mouseup', this.onMouseUp);
        
        // Remove keyboard event listeners
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        
        // Remove resize listener
        window.removeEventListener('resize', this.onResize);
    }
    
    // Center the view based on screen dimensions
    centerView() {
        if (!this.app || !this.app.renderer) return;
        
        // Calculate world center point (in meters)
        const screenWidth = this.app.renderer.width;
        const screenHeight = this.app.renderer.height;
        
        // Convert screen center coordinates to world coordinates (meters)
        // This places (0,0) at the center of the screen
        const centerX = screenWidth / 2 / (this.zoom * PIXELS_PER_METER);
        const centerY = screenHeight / 2 / (this.zoom * PIXELS_PER_METER);
        
        // Set camera position to center the view
        this.position = { x: -centerX, y: -centerY };
        
        // Update the transform after centering
        this.updateTransform();
        
        console.log('View centered at:', this.position, 'Zoom:', this.zoom);
    }
    
    // Handle window resize
    onResize() {
        // Center the view when window is resized
        this.centerView();
    }
    
    onWheel(e) {
        e.preventDefault();
      
        // Adjust zoom factor based on current zoom level for smooth experience
        // Use smaller adjustments at extreme zoom levels
        let zoomFactor;
        if (this.zoom < 0.01) {
            // Very zoomed in - use smaller adjustment
            zoomFactor = e.deltaY > 0 ? 0.8 : 1.25;
        } else if (this.zoom > 10) {
            // Very zoomed out - use smaller adjustment
            zoomFactor = e.deltaY > 0 ? 0.8 : 1.25;
        } else {
            // Normal zoom range - use standard adjustment
            zoomFactor = e.deltaY > 0 ? 0.8 : 1.25;
        }
      
        // Get mouse position relative to canvas
        const mousePos = this.pixiRenderer.getMousePosition(e);
      
        // Convert to world space (in meters)
        const worldPos = this.screenToWorld(mousePos.x, mousePos.y);
      
        // Apply zoom
        const newZoom = Math.max(
            this.minZoom,
            Math.min(this.maxZoom, this.zoom * zoomFactor)
        );
      
        // Calculate new camera position to zoom toward mouse
        if (newZoom !== this.zoom) {
            const zoomRatio = newZoom / this.zoom;
            this.position.x = worldPos.x - (worldPos.x - this.position.x) / zoomRatio;
            this.position.y = worldPos.y - (worldPos.y - this.position.y) / zoomRatio;
            this.zoom = newZoom;
          
            // Update transform
            this.updateTransform();

            
        }
    }
    
    // Correctly convert screen coordinates to world coordinates (meters)
    screenToWorld(screenX, screenY) {
        return {
            x: screenX / (this.zoom * PIXELS_PER_METER) + this.position.x,
            y: screenY / (this.zoom * PIXELS_PER_METER) + this.position.y
        };
    }
    
    // Correctly convert world coordinates (meters) to screen coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.position.x) * this.zoom * PIXELS_PER_METER,
            y: (worldY - this.position.y) * this.zoom * PIXELS_PER_METER
        };
    }
    
    // Handle space key down
    onKeyDown(e) {
        // Check if space key (key code 32)
        if (e.keyCode === 32 || e.key === ' ') {
            this.isSpaceDown = true;
          
            // Change cursor to indicate panning is available
            if (this.app.canvas) {
                this.app.canvas.style.cursor = 'grab';
            }
          
            // Prevent default space bar behavior (scrolling)
            e.preventDefault();
        }
    }
    
    // Handle space key up
    onKeyUp(e) {
        // Check if space key
        if (e.keyCode === 32 || e.key === ' ') {
            this.isSpaceDown = false;
            this.lastMousePosition = null;
          
            // Reset cursor
            if (this.app.canvas) {
                this.app.canvas.style.cursor = 'default';
            }
          
            // Prevent default
            e.preventDefault();
        }
    }
    
    onMouseDown(e) {
        // Only handle middle mouse button for regular panning (non-space key)
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            this.isDragging = true;
            this.lastMousePosition = this.pixiRenderer.getMousePosition(e);
            e.preventDefault(); // Prevent text selection
        }
    }
    
    // Update onMouseMove to handle space key panning
    onMouseMove(e) {
        // Handle space key panning (no click required)
        if (this.isSpaceDown) {
            const currentMousePosition = this.pixiRenderer.getMousePosition(e);
          
            // If this is the first move since space was pressed, just record position
            if (!this.lastMousePosition) {
                this.lastMousePosition = currentMousePosition;
                return;
            }
          
            const dx = currentMousePosition.x - this.lastMousePosition.x;
            const dy = currentMousePosition.y - this.lastMousePosition.y;
          
            // Move camera in opposite direction of mouse movement
            // IMPORTANT: Convert screen pixels to world meters
            this.position.x -= dx / (this.zoom * PIXELS_PER_METER);
            this.position.y -= dy / (this.zoom * PIXELS_PER_METER);
          
            // Update last position
            this.lastMousePosition = currentMousePosition;
          
            // Update transform
            this.updateTransform();
          
            // Change cursor to grabbing when actively panning
            if (this.app.canvas) {
                this.app.canvas.style.cursor = 'grabbing';
            }
        }
        
        // Original dragging behavior (for middle mouse button)
        else if (this.isDragging) {
            const currentMousePosition = this.pixiRenderer.getMousePosition(e);
            const dx = currentMousePosition.x - this.lastMousePosition.x;
            const dy = currentMousePosition.y - this.lastMousePosition.y;
          
            // Move camera in opposite direction of drag
            // IMPORTANT: Convert screen pixels to world meters
            this.position.x -= dx / (this.zoom * PIXELS_PER_METER);
            this.position.y -= dy / (this.zoom * PIXELS_PER_METER);
          
            // Update last position
            this.lastMousePosition = currentMousePosition;
          
            // Update transform
            this.updateTransform();
        }
    }
    
    // Update onMouseUp to keep the original functionality
    onMouseUp(e) {
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            this.isDragging = false;
            this.lastMousePosition = null;
        }
    }
    
    updateTransform() {
        if (!this.app) return;
        
        const sceneManager = this.pixiRenderer.sceneManager;
        if (!sceneManager) return;
        
        // Get the world container
        const worldContainer = sceneManager.getWorldContainer();
        if (!worldContainer) return;
        
        // Convert meters to pixels using PIXELS_PER_METER
        const pixelScale = this.zoom * PIXELS_PER_METER;
        
        // Apply transform to the world container
        worldContainer.scale.set(pixelScale, pixelScale);
        worldContainer.position.set(
          -this.position.x * pixelScale,
          -this.position.y * pixelScale
        );
      
        // IMPORTANT: Trigger onTransformChange callback more consistently
        if (this.onTransformChange) {
          // Use requestAnimationFrame to ensure the transform gets applied first
          requestAnimationFrame(() => {
            this.onTransformChange();
          });
        }
      }
    
    reset() {
        // Reset zoom to default
        this.zoom = 1.0;
        
        // Center the view
        this.centerView();
        
        console.log("View reset to center at zoom:", this.zoom);
    }
    
    getZoomLevel() {
        return this.zoom;
    }
}