// src/core/engine/SceneManager.js
import { Container } from 'pixi.js';

export default class SceneManager {
  constructor(app) {
    this.app = app;
    this.layers = {};
    
    // Create a container for the entire scene
    this.sceneContainer = new Container();
    this.app.stage.addChild(this.sceneContainer);
    
    // Create a world container that will be transformed by the camera
    this.worldContainer = new Container();
    this.sceneContainer.addChild(this.worldContainer);
    
    // Create a UI container that will not be transformed by the camera
    this.uiContainer = new Container();
    this.sceneContainer.addChild(this.uiContainer);
    
    // Initialize standard layers
    this.initializeLayers();
  }
  
  initializeLayers() {
    // World layers (affected by camera transform)
    this.createLayer('grid', this.worldContainer);
    this.createLayer('floors', this.worldContainer);
    this.createLayer('walls', this.worldContainer);
    this.createLayer('objects', this.worldContainer);
    this.createLayer('annotations', this.worldContainer);
    
    // UI layers (fixed position, not affected by camera)
    this.createLayer('ui', this.uiContainer);
    this.createLayer('measurements', this.uiContainer);
    this.createLayer('angles', this.uiContainer);
    this.createLayer('tooltips', this.uiContainer);
    
    // Set layer order
    this.setLayerZIndex('grid', 1);
    this.setLayerZIndex('floors', 2);
    this.setLayerZIndex('walls', 3);
    this.setLayerZIndex('objects', 4);
    this.setLayerZIndex('annotations', 5);
    
    // UI layers should always be on top
    this.setLayerZIndex('ui', 10);
    this.setLayerZIndex('measurements', 11);
    this.setLayerZIndex('angles', 12);
    this.setLayerZIndex('tooltips', 13);
    
    console.log('SceneManager: Layers initialized');
  }
  
  createLayer(name, parent) {
    const layer = new Container();
    layer.sortableChildren = true; // Add this line
    this.layers[name] = layer;
    parent.addChild(layer);
    return layer;
  }
  
  getLayer(name) {
    return this.layers[name] || null;
  }
  
  setLayerZIndex(name, zIndex) {
    const layer = this.getLayer(name);
    if (layer) {
      layer.zIndex = zIndex;
    }
  }
  
  getWorldContainer() {
    return this.worldContainer;
  }
  
  getUIContainer() {
    return this.uiContainer;
  }
  
  // Add a utility method to move an object from one layer to another
  moveToLayer(object, fromLayerName, toLayerName) {
    const fromLayer = this.getLayer(fromLayerName);
    const toLayer = this.getLayer(toLayerName);
    
    if (fromLayer && toLayer && object.parent === fromLayer) {
      fromLayer.removeChild(object);
      toLayer.addChild(object);
      return true;
    }
    
    return false;
  }
  
  // Add a method to clear all content from a specific layer
  clearLayer(name) {
    const layer = this.getLayer(name);
    if (layer) {
      layer.removeChildren();
      return true;
    }
    return false;
  }
  
  // Method to clear all layers (useful when loading a new scene)
  clearAllLayers() {
    for (const layerName in this.layers) {
      this.clearLayer(layerName);
    }
  }
}