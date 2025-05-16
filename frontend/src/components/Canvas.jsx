// src/components/Canvas.jsx - update to ensure camera and drawing are properly coordinated
import React, { useEffect, useRef, useState } from "react";
import PixiRenderer from "../core/engine/PixiRenderer";
import SceneManager from "../core/engine/SceneManager";
import WallTool from "../tools/WallTool";
import SelectTool from "../tools/SelectTool";
import WallRenderer from "../renderers/WallRenderer";
import ToolManager from "../tools/ToolManager";
import Toolbar from "./Toolbar";
import Sidebar from "./Sidebar";
import WallToolSettings from "./WallToolSettings";
import { PIXELS_PER_METER } from "../core/geometry/MeasurementUtils";
import WallOutlineRenderer from "../renderers/WallOutlineRenderer";
import HistoryManager from "../core/history/HistoryManager";

const Canvas = () => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneManagerRef = useRef(null);
  const toolManagerRef = useRef(null);
  const wallToolRef = useRef(null);
  const selectToolRef = useRef(null);
  const wallRendererRef = useRef(null);
  const wallOutlineRendererRef = useRef(null);
  const historyManagerRef = useRef(null);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentTool, setCurrentTool] = useState("wall");
  const [selectedObject, setSelectedObject] = useState(null);
  const [defaultThickness, setDefaultThickness] = useState(1.0); // Default 10cm thickness in meters
  const [viewScale, setViewScale] = useState({
    pixels: PIXELS_PER_METER,
    meters: 1,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFPS, setShowFPS] = useState(true); // Set to true to show by default
  const [fps, setFps] = useState(0);

  // Initialize PixiJS and tools
  useEffect(() => {
    if (!containerRef.current || rendererRef.current) return;

    const renderer = new PixiRenderer(containerRef.current);
    rendererRef.current = renderer;

    renderer.initialize().then((app) => {
      const sceneManager = new SceneManager(app);
      sceneManagerRef.current = sceneManager;

      renderer.setSceneManager(sceneManager);

      // Add a slight delay to ensure the renderer has correctly calculated dimensions
      setTimeout(() => {
        if (renderer.camera) {
          // Center the camera on initialization
          renderer.camera.centerView();
          console.log("Initial camera position set");
        }

        const wallRenderer = new WallRenderer(renderer);
        wallRendererRef.current = wallRenderer;

        const wallOutlineRenderer = new WallOutlineRenderer(renderer);
        wallOutlineRendererRef.current = wallOutlineRenderer;

        // Initialize tools with default thickness in meters
        const wallTool = new WallTool(
          renderer,
          wallRenderer,
          historyManagerRef.current
        );
        wallTool.setDefaultThickness(defaultThickness);
        wallTool.outlineRenderer = wallOutlineRenderer; // ADD THIS LINE
        wallTool.onWallAdded = () => {
          // Simple direct rendering - no force update needed
          renderWalls();
        };
        wallToolRef.current = wallTool;

        const selectTool = new SelectTool(
          renderer,
          wallRenderer,
          wallTool.walls,
          historyManagerRef.current
        );
        selectTool.wallTool = wallTool; // Give select tool access to wallTool for node updates
        selectTool.setOnSelectionChange(setSelectedObject);
        selectToolRef.current = selectTool;

        const toolManager = new ToolManager();
        toolManagerRef.current = toolManager;

        // Register tools
        toolManager.registerTool("wall", wallTool);
        toolManager.registerTool("select", selectTool);

        // Activate initial tool
        toolManager.activateTool(currentTool);

        // Mark initialization as complete
        setIsInitialized(true);
      }, 100); // 100ms delay to ensure everything is ready

      // Update zoom display with calculated scale
      const updateZoomDisplay = () => {
        if (renderer.camera) {
          const zoom = renderer.camera.getZoomLevel();
          setZoomLevel(zoom);

          // Calculate viewable area metrics
          if (app.renderer && zoom > 0) {
            const pixelsPerMeter = PIXELS_PER_METER * zoom;
            const visibleWidthInMeters = app.renderer.width / pixelsPerMeter;
            const visibleHeightInMeters = app.renderer.height / pixelsPerMeter;

            // Update view scale information
            setViewScale({
              pixels: pixelsPerMeter,
              meters: Math.max(visibleWidthInMeters, visibleHeightInMeters),
              width: visibleWidthInMeters.toFixed(2),
              height: visibleHeightInMeters.toFixed(2),
            });
          }
        }
      };

      const intervalId = setInterval(updateZoomDisplay, 100);

      // Set focus to the canvas for key events
      if (containerRef.current) {
        containerRef.current.focus();
      }

      return () => {
        clearInterval(intervalId);

        if (toolManagerRef.current) {
          const activeTool = toolManagerRef.current.getCurrentTool();
          if (activeTool) activeTool.deactivate();
        }

        if (rendererRef.current) {
          rendererRef.current.destroy();
          rendererRef.current = null;
        }

        if (wallOutlineRendererRef.current) {
          wallOutlineRendererRef.current.destroy();
          wallOutlineRendererRef.current = null;
        }
      };
    });
  }, []);

  useEffect(() => {
    const handleGlobalKeydown = (e) => {
      console.log("Global keydown:", e.key, e.ctrlKey);
    };

    document.addEventListener("keydown", handleGlobalKeydown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeydown);
    };
  }, []);

  useEffect(() => {
    if (!historyManagerRef.current) {
      historyManagerRef.current = new HistoryManager();
      console.log("History manager initialized in Canvas component");

      // Add test button to debug undo/redo
      window.testUndo = () => {
        console.log("Testing undo function");
        historyManagerRef.current.printStacks();
        historyManagerRef.current.undo();
      };

      window.testRedo = () => {
        console.log("Testing redo function");
        historyManagerRef.current.printStacks();
        historyManagerRef.current.redo();
      };
    }

    return () => {
      if (historyManagerRef.current) {
        historyManagerRef.current.destroy();
        historyManagerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete key to delete selected wall
      if (e.key === "Delete" || e.key === "Backspace") {
        if (
          currentTool === "select" &&
          selectToolRef.current &&
          selectToolRef.current.selectedObject
        ) {
          e.preventDefault();
          selectToolRef.current.deleteSelectedWall();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentTool]);

  // Update active tool when currentTool changes
  useEffect(() => {
    if (toolManagerRef.current && currentTool) {
      // If switching to select tool, make sure it has the current walls and nodes
      if (
        currentTool === "select" &&
        selectToolRef.current &&
        wallToolRef.current
      ) {
        selectToolRef.current.setWalls(wallToolRef.current.walls);
      }

      toolManagerRef.current.activateTool(currentTool);

      // Clear selection when switching away from select tool
      if (currentTool !== "select") {
        setSelectedObject(null);
      }
    }
  }, [currentTool, isInitialized]);

  // Make sure select tool has updated walls when they change
  useEffect(() => {
    if (selectToolRef.current && wallToolRef.current) {
      selectToolRef.current.setWalls(wallToolRef.current.walls);
    }
  }, [wallToolRef.current?.walls?.length]);

  // Add a useEffect to measure FPS
  useEffect(() => {
    if (!showFPS) return;

    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const now = performance.now();

      // Update FPS every second
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      if (showFPS) {
        requestAnimationFrame(measureFPS);
      }
    };

    const animationId = requestAnimationFrame(measureFPS);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [showFPS]);

  // Handle default thickness change
  const handleDefaultThicknessChange = (thickness) => {
    setDefaultThickness(thickness);
    if (wallToolRef.current) {
      wallToolRef.current.setDefaultThickness(thickness);
    }
  };

  // Reset camera view handler
  const handleResetView = () => {
    if (rendererRef.current && rendererRef.current.camera) {
      rendererRef.current.camera.reset();
      // Force a re-render of walls after reset
      renderWalls();
    }
  };

  // Tool change handler
  const handleToolChange = (toolName) => {
    setCurrentTool(toolName);
  };

  // Handle property editing
  const handlePropertyEdit = (property, value, objectId) => {
    if (selectToolRef.current) {
      selectToolRef.current.updateSelectedObject(property, value);
    }
  };

  // This function will render the walls with appropriate settings
  const renderWalls = () => {
    if (wallRendererRef.current && wallToolRef.current) {
      const walls = wallToolRef.current.walls;
      const nodes = wallToolRef.current.nodes;
      const currentWall = wallToolRef.current.currentWall;

      // Get selected wall and connected walls if in select mode
      let selectedWall = null;
      let connectedWalls = [];

      if (selectedObject && currentTool === "select") {
        selectedWall = selectedObject.object;
        // Get connected walls from selection object if available
        connectedWalls = selectedObject.connectedWalls || [];
      }

      const mousePosition = wallToolRef.current.mousePosition;

      // Pass connected walls to render method
      wallRendererRef.current.render(
        walls,
        nodes,
        currentWall,
        selectedWall,
        mousePosition,
        true, // Skip outlines parameter
        connectedWalls // New parameter for connected walls
      );

      // Always render high-quality outlines
      if (wallOutlineRendererRef.current) {
        const allWalls = [...walls];
        if (currentWall) allWalls.push(currentWall);
        wallOutlineRendererRef.current.render(allWalls, selectedWall);
      }
    }
  };

  // Re-render walls when selection or tool changes
  useEffect(() => {
    renderWalls();
  }, [selectedObject, currentTool]);

  useEffect(() => {
    if (isInitialized) {
      registerRenderCallback();
    }
  }, [isInitialized]);

  // Format zoom level for display
  const formatZoomLevel = (zoom) => {
    if (zoom < 0.01) {
      return zoom.toExponential(2); // For microscopic zoom
    } else if (zoom < 1) {
      return zoom.toFixed(3); // For detailed zoom
    } else if (zoom < 10) {
      return zoom.toFixed(2); // For normal zoom
    } else {
      return zoom.toFixed(1); // For far-out zoom
    }
  };

  // Format scale for human-readable display
  const getScaleDescription = () => {
    if (viewScale.meters < 0.01) {
      return `${(viewScale.meters * 1000).toFixed(1)}mm visible`;
    } else if (viewScale.meters < 1) {
      return `${(viewScale.meters * 100).toFixed(1)}cm visible`;
    } else if (viewScale.meters < 1000) {
      return `${viewScale.meters.toFixed(1)}m visible`;
    } else {
      return `${(viewScale.meters / 1000).toFixed(2)}km visible`;
    }
  };

  const registerRenderCallback = () => {
    if (!rendererRef.current || !rendererRef.current.camera) return;

    // Add a callback to camera for zoom/pan events that forces complete re-rendering
    rendererRef.current.camera.onTransformChange = () => {
      // Force a complete re-render of all walls
      if (
        wallToolRef.current &&
        wallRendererRef.current &&
        selectToolRef.current
      ) {
        // Get current selection
        const selectedObj = selectToolRef.current.selectedObject;
        const selectedWall = selectedObj ? selectedObj.object : null;
        const connectedWalls = selectedObj
          ? selectedObj.connectedWalls || []
          : [];

        // Get all necessary components
        const walls = wallToolRef.current.walls;
        const nodes = wallToolRef.current.nodes;
        const currentWall = wallToolRef.current.currentWall;
        const mousePosition = wallToolRef.current.mousePosition;

        // Perform a complete render including connected walls
        wallRendererRef.current.render(
          walls,
          nodes,
          currentWall,
          selectedWall,
          mousePosition,
          false,
          connectedWalls
        );

        // Also update outlines
        if (wallOutlineRendererRef.current) {
          const allWalls = [...walls];
          if (currentWall) allWalls.push(currentWall);
          wallOutlineRendererRef.current.invalidate(); // Force redraw
          wallOutlineRendererRef.current.render(allWalls, selectedWall);
        }
      }
    };

    // Add direct reference to outline renderer in WallTool
    if (wallToolRef.current && wallOutlineRendererRef.current) {
      wallToolRef.current.outlineRenderer = wallOutlineRendererRef.current;
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "#f7f7f7", // Light background to see the canvas area
          tabIndex: 0,
        }}
      />

      {/* Add the toolbar component */}
      <Toolbar currentTool={currentTool} onToolChange={handleToolChange} />

      {/* Show wall settings when wall tool is active */}
      {currentTool === "wall" && (
        <WallToolSettings
          defaultThickness={defaultThickness}
          onDefaultThicknessChange={handleDefaultThicknessChange}
        />
      )}

      {/* Add the sidebar component - only visible when select tool is active */}
      {currentTool === "select" && (
        <Sidebar selectedObject={selectedObject} onEdit={handlePropertyEdit} />
      )}

      {showFPS && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            background: "rgba(0,0,0,0.5)",
            color: "white",
            padding: "5px 10px",
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: "monospace",
          }}
          onClick={() => setShowFPS(false)} // Click to hide
        >
          FPS: {fps}
        </div>
      )}

      {/* Enhanced zoom control with scale information */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          background: "rgba(255,255,255,0.85)",
          padding: "10px",
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          fontSize: "12px",
          minWidth: "160px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
          View Information
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Zoom:</span>
          <span>{formatZoomLevel(zoomLevel)}x</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Scale:</span>
          <span>{Math.round(viewScale.pixels)} px/m</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}
        >
          <span>View:</span>
          <span>
            {viewScale.width}m × {viewScale.height}m
          </span>
        </div>
        <div style={{ fontSize: "10px", color: "#666", marginBottom: "8px" }}>
          {getScaleDescription()}
        </div>
        <button
          onClick={handleResetView}
          style={{
            width: "100%",
            padding: "4px",
            fontSize: "11px",
            backgroundColor: "#f0f0f0",
            border: "1px solid #ccc",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          Reset View (1:1 Scale)
        </button>
        <div style={{ marginTop: "5px", fontSize: "10px", color: "#666" }}>
          Press ESC to end drawing
        </div>
        <div style={{ marginTop: "3px", fontSize: "10px", color: "#666" }}>
          SPACE + drag to pan view
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "60px",
          left: "10px",
          display: "flex",
          gap: "5px",
        }}
      >
        <button
          onClick={() => historyManagerRef.current.undo()}
          title="Undo (Ctrl+Z)"
          style={{
            padding: "5px 10px",
            background: "#f0f0f0",
            border: "1px solid #ccc",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          Undo
        </button>
        <button
          onClick={() => historyManagerRef.current.redo()}
          title="Redo (Ctrl+Y)"
          style={{
            padding: "5px 10px",
            background: "#f0f0f0",
            border: "1px solid #ccc",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          Redo
        </button>
      </div>
    </div>
  );
};

export default Canvas;
