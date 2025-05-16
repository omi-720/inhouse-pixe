// src/tools/ToolManager.js
export default class ToolManager {
  constructor() {
    this.tools = {};
    this.activeTool = null;
  }
  
  registerTool(name, tool) {
    this.tools[name] = tool;
  }
  
  activateTool(name) {
    // First deactivate current tool if there is one
    if (this.activeTool) {
      this.activeTool.deactivate();
    }
    
    // Activate new tool
    if (this.tools[name]) {
      this.tools[name].activate();
      this.activeTool = this.tools[name];
      console.log(`Activated tool: ${name}`);
      return true;
    }
    
    return false;
  }
  
  getCurrentTool() {
    return this.activeTool;
  }
}