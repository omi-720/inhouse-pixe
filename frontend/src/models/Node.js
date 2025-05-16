// Updated Node.js
export default class Node {
  constructor(x, y, isIntersection = false) {
    this.x = x;
    this.y = y;
    this.wallIds = [];
    this.isIntersection = isIntersection;
  }
  
  addWallId(id) {
    if (!this.wallIds.includes(id)) {
      this.wallIds.push(id);
    }
  }
  
  // Helper method to check if this is a true endpoint (connected to only one wall)
  isTrueEndpoint() {
    return this.wallIds.length >= 1;
  }
}