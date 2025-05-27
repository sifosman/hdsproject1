/**
 * Simple bin packing implementation for the HDS Group Cutlist application
 */
class SimpleBinPacking {
  constructor(bins, items, canRotate = true) {
    this.bins = bins;
    this.items = items.sort((a, b) => (b.width * b.height) - (a.width * a.height)); // Sort by area, largest first
    this.canRotate = canRotate;
    this.result = {
      bins: JSON.parse(JSON.stringify(bins)), // Deep copy
      unplacedItems: []
    };
    
    // Initialize bins with empty items array
    this.result.bins.forEach(bin => {
      bin.items = [];
    });
  }
  
  solve() {
    // Try to place each item
    for (const item of this.items) {
      let placed = false;
      
      // Try each bin
      for (const bin of this.result.bins) {
        // Skip if bin is already full
        if (bin.isFull) continue;
        
        // Try to place the item
        const placement = this.findPlacement(bin, item);
        if (placement) {
          // Place the item
          bin.items.push({
            id: item.id,
            width: placement.width,
            height: placement.height,
            x: placement.x,
            y: placement.y,
            rotated: placement.rotated
          });
          
          placed = true;
          break;
        }
      }
      
      // If item couldn't be placed, add to unplaced items
      if (!placed) {
        this.result.unplacedItems.push(item);
      }
    }
    
    return this.result;
  }
  
  findPlacement(bin, item) {
    // If bin has no items yet, place at origin
    if (bin.items.length === 0) {
      // Check if item fits in bin
      if (item.width <= bin.width && item.height <= bin.height) {
        return {
          x: 0,
          y: 0,
          width: item.width,
          height: item.height,
          rotated: false
        };
      } else if (this.canRotate && item.canRotate && item.height <= bin.width && item.width <= bin.height) {
        // Try rotated
        return {
          x: 0,
          y: 0,
          width: item.height,
          height: item.width,
          rotated: true
        };
      }
      return null;
    }
    
    // Find all possible placement points
    const points = this.findPlacementPoints(bin);
    
    // Try each point
    for (const point of points) {
      // Try normal orientation
      if (this.canFit(bin, point.x, point.y, item.width, item.height)) {
        return {
          x: point.x,
          y: point.y,
          width: item.width,
          height: item.height,
          rotated: false
        };
      }
      
      // Try rotated orientation if allowed
      if (this.canRotate && item.canRotate && this.canFit(bin, point.x, point.y, item.height, item.width)) {
        return {
          x: point.x,
          y: point.y,
          width: item.height,
          height: item.width,
          rotated: true
        };
      }
    }
    
    return null;
  }
  
  findPlacementPoints(bin) {
    const points = [];
    
    // Add origin if no items
    if (bin.items.length === 0) {
      points.push({ x: 0, y: 0 });
      return points;
    }
    
    // Add top-right and bottom-left corners of each item
    for (const item of bin.items) {
      // Top-right corner
      points.push({
        x: item.x + item.width,
        y: item.y
      });
      
      // Bottom-left corner
      points.push({
        x: item.x,
        y: item.y + item.height
      });
    }
    
    // Filter out duplicate points and points outside the bin
    return points.filter((point, index, self) => {
      // Remove duplicates
      const isDuplicate = self.findIndex(p => p.x === point.x && p.y === point.y) !== index;
      if (isDuplicate) return false;
      
      // Check if point is inside bin
      return point.x < bin.width && point.y < bin.height;
    });
  }
  
  canFit(bin, x, y, width, height) {
    // Check if item fits within bin boundaries
    if (x + width > bin.width || y + height > bin.height) {
      return false;
    }
    
    // Check if item overlaps with any existing items
    for (const item of bin.items) {
      if (this.overlaps(x, y, width, height, item.x, item.y, item.width, item.height)) {
        return false;
      }
    }
    
    return true;
  }
  
  overlaps(x1, y1, w1, h1, x2, y2, w2, h2) {
    // Check if two rectangles overlap
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }
}

module.exports = { SimpleBinPacking };
