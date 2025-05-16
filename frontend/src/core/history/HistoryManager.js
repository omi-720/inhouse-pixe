// src/core/history/HistoryManager.js

// Use a singleton pattern to ensure only one instance exists
let instance = null;

export default class HistoryManager {
  constructor(maxHistorySize = 100) {
    // If an instance already exists, return it
    if (instance) {
      console.log('Using existing HistoryManager instance');
      return instance;
    }
    
    // Set up new instance
    console.log('Creating new HistoryManager instance');
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySize = maxHistorySize;
    this.isUndoRedoInProgress = false;
    
    // Bind methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    
    // Add keyboard listener to document level
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Debug helpers
    this.id = Math.random().toString(36).substr(2, 9);
    console.log(`HistoryManager initialized with ID: ${this.id}`);
    
    // Store instance for singleton pattern
    instance = this;
  }
  
  /**
   * Adds a command to the history stack
   * @param {Object} command - The command object with execute and undo methods
   */
  executeCommand(command) {
    // Don't add to history if this is part of an undo/redo operation
    if (this.isUndoRedoInProgress) return;
    
    console.log(`[${this.id}] Executing command:`, command.constructor.name);
    
    // Execute the command
    command.execute();
    
    // Add to undo stack
    this.undoStack.push(command);
    
    // Clear redo stack when a new command is executed
    this.redoStack = [];
    
    // Trim history if it exceeds max size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    
    console.log(`[${this.id}] Undo stack size: ${this.undoStack.length}`);
  }
  
  /**
   * Undoes the last command
   */
  undo() {
    if (this.undoStack.length === 0) {
      console.log(`[${this.id}] Nothing to undo`);
      return;
    }
    
    console.log(`[${this.id}] Undoing last command, stack size: ${this.undoStack.length}`);
    
    // Mark that we're performing an undo operation
    this.isUndoRedoInProgress = true;
    
    try {
      // Get the last command from the undo stack
      const command = this.undoStack.pop();
      
      // Undo the command
      command.undo();
      
      // Move to redo stack
      this.redoStack.push(command);
      
      console.log(`[${this.id}] Undo complete. Undo stack: ${this.undoStack.length}, Redo stack: ${this.redoStack.length}`);
    } catch (error) {
      console.error(`[${this.id}] Error during undo:`, error);
    } finally {
      // Always reset the flag
      this.isUndoRedoInProgress = false;
    }
  }
  
  /**
   * Redoes the last undone command
   */
  redo() {
    if (this.redoStack.length === 0) {
      console.log(`[${this.id}] Nothing to redo`);
      return;
    }
    
    console.log(`[${this.id}] Redoing last command, stack size: ${this.redoStack.length}`);
    
    // Mark that we're performing a redo operation
    this.isUndoRedoInProgress = true;
    
    try {
      // Get the last command from the redo stack
      const command = this.redoStack.pop();
      
      // Re-execute the command
      command.execute();
      
      // Move back to undo stack
      this.undoStack.push(command);
      
      console.log(`[${this.id}] Redo complete. Undo stack: ${this.undoStack.length}, Redo stack: ${this.redoStack.length}`);
    } catch (error) {
      console.error(`[${this.id}] Error during redo:`, error);
    } finally {
      // Always reset the flag
      this.isUndoRedoInProgress = false;
    }
  }
  
  /**
   * Handles keyboard shortcuts for undo/redo
   */
  handleKeyDown(e) {
    // Check for Ctrl+Z (Undo)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      console.log(`[${this.id}] Ctrl+Z detected - undoing`);
      e.preventDefault(); // Prevent browser's default undo
      this.undo();
    }
    
    // Check for Ctrl+Y or Ctrl+Shift+Z (Redo)
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      console.log(`[${this.id}] Ctrl+Y or Ctrl+Shift+Z detected - redoing`);
      e.preventDefault(); // Prevent browser's default redo
      this.redo();
    }
  }
  
  /**
   * Clears all history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    console.log(`[${this.id}] History cleared`);
  }
  
  /**
   * Clean up event listeners
   */
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    console.log(`[${this.id}] HistoryManager destroyed`);
    // Reset singleton instance
    if (instance === this) {
      instance = null;
    }
  }
  
  // Debug helper
  printStacks() {
    console.log(`[${this.id}] UNDO STACK (${this.undoStack.length}):`, this.undoStack.map(cmd => cmd.constructor.name));
    console.log(`[${this.id}] REDO STACK (${this.redoStack.length}):`, this.redoStack.map(cmd => cmd.constructor.name));
  }
}