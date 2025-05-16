// src/core/engine/PixiRenderer.js
import CameraController from '../camera/CameraController';

export default class PixiRenderer {
  constructor(containerElement, options = {}) {
    this.app = null;
    this.containerElement = containerElement;
    this.options = {
      background: '#ffffff',
      antialias: true,
      ...options
    };
    this.initialized = false;
    this.camera = null;
    this.sceneManager = null;
  }

  async initialize() {
    if (this.initialized) return this.app;
    
    const { Application } = await import('pixi.js');
    this.app = new Application();
    await this.app.init({
      background: this.options.background,
      resizeTo: window,
      antialias: this.options.antialias,
    });
    
    if (!this.containerElement.contains(this.app.canvas)) {
        this.containerElement.appendChild(this.app.canvas);
      }
      
    this.initialized = true;
    
    // Initialize camera after app is ready
    this.camera = new CameraController(this);
    
    return this.app;
  }

  destroy() {
    if (this.camera) {
      this.camera.destroy();
      this.camera = null;
    }
    
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
      this.initialized = false;
    }
  }

  getMousePosition(e) {
    if (!this.app) return { x: 0, y: 0 };
    
    const rect = this.app.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.app.renderer.width / rect.width),
      y: (e.clientY - rect.top) * (this.app.renderer.height / rect.height),
    };
  }
  
  // Get world-space mouse position (accounting for camera)
  getWorldMousePosition(e) {
    if (!this.camera) return this.getMousePosition(e);
    
    const screenPos = this.getMousePosition(e);
    return this.camera.screenToWorld(screenPos.x, screenPos.y);
  }
  
  // Add method to get scene layers for camera
  getSceneLayers() {
    if (!this.sceneManager) return null;
    return this.sceneManager.layers;
  }
  
  // Set scene manager reference
  setSceneManager(sceneManager) {
    this.sceneManager = sceneManager;
    
    // Initialize camera after scene manager is set
    if (!this.camera && this.initialized) {
      this.camera = new CameraController(this);
    }
  }
}