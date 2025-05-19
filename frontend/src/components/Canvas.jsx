// // src/components/Canvas.jsx - update to ensure camera and drawing are properly coordinated
// import React, { useEffect, useRef, useState } from "react";
// import PixiRenderer from "../core/engine/PixiRenderer";
// import SceneManager from "../core/engine/SceneManager";
// import WallTool from "../tools/WallTool";
// import SelectTool from "../tools/SelectTool";
// import WallRenderer from "../renderers/WallRenderer";
// import ToolManager from "../tools/ToolManager";
// import Toolbar from "./Toolbar";
// import Sidebar from "./Sidebar";
// import WallToolSettings from "./WallToolSettings";
// import { PIXELS_PER_METER } from "../core/geometry/MeasurementUtils";
// import WallOutlineRenderer from "../renderers/WallOutlineRenderer";
// import HistoryManager from "../core/history/HistoryManager";

// const Canvas = () => {
//   const containerRef = useRef(null);
//   const rendererRef = useRef(null);
//   const sceneManagerRef = useRef(null);
//   const toolManagerRef = useRef(null);
//   const wallToolRef = useRef(null);
//   const selectToolRef = useRef(null);
//   const wallRendererRef = useRef(null);
//   const wallOutlineRendererRef = useRef(null);
//   const historyManagerRef = useRef(null);

//   const [zoomLevel, setZoomLevel] = useState(1);
//   const [currentTool, setCurrentTool] = useState("wall");
//   const [selectedObject, setSelectedObject] = useState(null);
//   const [defaultThickness, setDefaultThickness] = useState(1.0); // Default 10cm thickness in meters
//   const [viewScale, setViewScale] = useState({
//     pixels: PIXELS_PER_METER,
//     meters: 1,
//   });
//   const [isInitialized, setIsInitialized] = useState(false);
//   const [showFPS, setShowFPS] = useState(true); // Set to true to show by default
//   const [fps, setFps] = useState(0);

//   // Initialize PixiJS and tools
//   useEffect(() => {
//     if (!containerRef.current || rendererRef.current) return;

//     const renderer = new PixiRenderer(containerRef.current);
//     rendererRef.current = renderer;

//     renderer.initialize().then((app) => {
//       const sceneManager = new SceneManager(app);
//       sceneManagerRef.current = sceneManager;

//       renderer.setSceneManager(sceneManager);

//       // Add a slight delay to ensure the renderer has correctly calculated dimensions
//       setTimeout(() => {
//         if (renderer.camera) {
//           // Center the camera on initialization
//           renderer.camera.centerView();
//           console.log("Initial camera position set");
//         }

//         const wallRenderer = new WallRenderer(renderer);
//         wallRendererRef.current = wallRenderer;

//         const wallOutlineRenderer = new WallOutlineRenderer(renderer);
//         wallOutlineRendererRef.current = wallOutlineRenderer;

//         // Initialize tools with default thickness in meters
//         const wallTool = new WallTool(
//           renderer,
//           wallRenderer,
//           historyManagerRef.current
//         );
//         wallTool.setDefaultThickness(defaultThickness);
//         wallTool.outlineRenderer = wallOutlineRenderer; // ADD THIS LINE
//         wallTool.onWallAdded = () => {
//           // Simple direct rendering - no force update needed
//           renderWalls();
//         };
//         wallToolRef.current = wallTool;

//         const selectTool = new SelectTool(
//           renderer,
//           wallRenderer,
//           wallTool.walls,
//           historyManagerRef.current
//         );
//         selectTool.wallTool = wallTool; // Give select tool access to wallTool for node updates
//         selectTool.setOnSelectionChange(setSelectedObject);
//         selectToolRef.current = selectTool;

//         const toolManager = new ToolManager();
//         toolManagerRef.current = toolManager;

//         // Register tools
//         toolManager.registerTool("wall", wallTool);
//         toolManager.registerTool("select", selectTool);

//         // Activate initial tool
//         toolManager.activateTool(currentTool);

//         // Mark initialization as complete
//         setIsInitialized(true);
//       }, 100); // 100ms delay to ensure everything is ready

//       // Update zoom display with calculated scale
//       const updateZoomDisplay = () => {
//         if (renderer.camera) {
//           const zoom = renderer.camera.getZoomLevel();
//           setZoomLevel(zoom);

//           // Calculate viewable area metrics
//           if (app.renderer && zoom > 0) {
//             const pixelsPerMeter = PIXELS_PER_METER * zoom;
//             const visibleWidthInMeters = app.renderer.width / pixelsPerMeter;
//             const visibleHeightInMeters = app.renderer.height / pixelsPerMeter;

//             // Update view scale information
//             setViewScale({
//               pixels: pixelsPerMeter,
//               meters: Math.max(visibleWidthInMeters, visibleHeightInMeters),
//               width: visibleWidthInMeters.toFixed(2),
//               height: visibleHeightInMeters.toFixed(2),
//             });
//           }
//         }
//       };

//       const intervalId = setInterval(updateZoomDisplay, 100);

//       // Set focus to the canvas for key events
//       if (containerRef.current) {
//         containerRef.current.focus();
//       }

//       return () => {
//         clearInterval(intervalId);

//         if (toolManagerRef.current) {
//           const activeTool = toolManagerRef.current.getCurrentTool();
//           if (activeTool) activeTool.deactivate();
//         }

//         if (rendererRef.current) {
//           rendererRef.current.destroy();
//           rendererRef.current = null;
//         }

//         if (wallOutlineRendererRef.current) {
//           wallOutlineRendererRef.current.destroy();
//           wallOutlineRendererRef.current = null;
//         }
//       };
//     });
//   }, []);

//   useEffect(() => {
//     const handleGlobalKeydown = (e) => {
//       console.log("Global keydown:", e.key, e.ctrlKey);
//     };

//     document.addEventListener("keydown", handleGlobalKeydown);

//     return () => {
//       document.removeEventListener("keydown", handleGlobalKeydown);
//     };
//   }, []);

//   useEffect(() => {
//     if (!historyManagerRef.current) {
//       historyManagerRef.current = new HistoryManager();
//       console.log("History manager initialized in Canvas component");

//       // Add test button to debug undo/redo
//       window.testUndo = () => {
//         console.log("Testing undo function");
//         historyManagerRef.current.printStacks();
//         historyManagerRef.current.undo();
//       };

//       window.testRedo = () => {
//         console.log("Testing redo function");
//         historyManagerRef.current.printStacks();
//         historyManagerRef.current.redo();
//       };
//     }

//     return () => {
//       if (historyManagerRef.current) {
//         historyManagerRef.current.destroy();
//         historyManagerRef.current = null;
//       }
//     };
//   }, []);

//   useEffect(() => {
//     const handleKeyDown = (e) => {
//       // Delete key to delete selected wall
//       if (e.key === "Delete" || e.key === "Backspace") {
//         if (
//           currentTool === "select" &&
//           selectToolRef.current &&
//           selectToolRef.current.selectedObject
//         ) {
//           e.preventDefault();
//           selectToolRef.current.deleteSelectedWall();
//         }
//       }
//     };

//     window.addEventListener("keydown", handleKeyDown);

//     return () => {
//       window.removeEventListener("keydown", handleKeyDown);
//     };
//   }, [currentTool]);

//   // Update active tool when currentTool changes
//   useEffect(() => {
//     if (toolManagerRef.current && currentTool) {
//       // If switching to select tool, make sure it has the current walls and nodes
//       if (
//         currentTool === "select" &&
//         selectToolRef.current &&
//         wallToolRef.current
//       ) {
//         selectToolRef.current.setWalls(wallToolRef.current.walls);
//       }

//       toolManagerRef.current.activateTool(currentTool);

//       // Clear selection when switching away from select tool
//       if (currentTool !== "select") {
//         setSelectedObject(null);
//       }
//     }
//   }, [currentTool, isInitialized]);

//   // Make sure select tool has updated walls when they change
//   useEffect(() => {
//     if (selectToolRef.current && wallToolRef.current) {
//       selectToolRef.current.setWalls(wallToolRef.current.walls);
//     }
//   }, [wallToolRef.current?.walls?.length]);

//   // Add a useEffect to measure FPS
//   useEffect(() => {
//     if (!showFPS) return;

//     let frameCount = 0;
//     let lastTime = performance.now();

//     const measureFPS = () => {
//       frameCount++;
//       const now = performance.now();

//       // Update FPS every second
//       if (now - lastTime >= 1000) {
//         setFps(Math.round((frameCount * 1000) / (now - lastTime)));
//         frameCount = 0;
//         lastTime = now;
//       }

//       if (showFPS) {
//         requestAnimationFrame(measureFPS);
//       }
//     };

//     const animationId = requestAnimationFrame(measureFPS);

//     // Cleanup on unmount
//     return () => {
//       cancelAnimationFrame(animationId);
//     };
//   }, [showFPS]);

//   // Handle default thickness change
//   const handleDefaultThicknessChange = (thickness) => {
//     setDefaultThickness(thickness);
//     if (wallToolRef.current) {
//       wallToolRef.current.setDefaultThickness(thickness);
//     }
//   };

//   // Reset camera view handler
//   const handleResetView = () => {
//     if (rendererRef.current && rendererRef.current.camera) {
//       rendererRef.current.camera.reset();
//       // Force a re-render of walls after reset
//       renderWalls();
//     }
//   };

//   // Tool change handler
//   const handleToolChange = (toolName) => {
//     setCurrentTool(toolName);
//   };

//   // Handle property editing
//   const handlePropertyEdit = (property, value, objectId) => {
//     if (selectToolRef.current) {
//       selectToolRef.current.updateSelectedObject(property, value);
//     }
//   };

//   // This function will render the walls with appropriate settings
//   const renderWalls = () => {
//     if (wallRendererRef.current && wallToolRef.current) {
//       const walls = wallToolRef.current.walls;
//       const nodes = wallToolRef.current.nodes;
//       const currentWall = wallToolRef.current.currentWall;

//       // Get selected wall and connected walls if in select mode
//       let selectedWall = null;
//       let connectedWalls = [];

//       if (selectedObject && currentTool === "select") {
//         selectedWall = selectedObject.object;
//         // Get connected walls from selection object if available
//         connectedWalls = selectedObject.connectedWalls || [];
//       }

//       const mousePosition = wallToolRef.current.mousePosition;

//       // Pass connected walls to render method
//       wallRendererRef.current.render(
//         walls,
//         nodes,
//         currentWall,
//         selectedWall,
//         mousePosition,
//         true, // Skip outlines parameter
//         connectedWalls // New parameter for connected walls
//       );

//       // Always render high-quality outlines
//       if (wallOutlineRendererRef.current) {
//         const allWalls = [...walls];
//         if (currentWall) allWalls.push(currentWall);
//         wallOutlineRendererRef.current.render(allWalls, selectedWall);
//       }
//     }
//   };

//   // Re-render walls when selection or tool changes
//   useEffect(() => {
//     renderWalls();
//   }, [selectedObject, currentTool]);

//   useEffect(() => {
//     if (isInitialized) {
//       registerRenderCallback();
//     }
//   }, [isInitialized]);

//   // Format zoom level for display
//   const formatZoomLevel = (zoom) => {
//     if (zoom < 0.01) {
//       return zoom.toExponential(2); // For microscopic zoom
//     } else if (zoom < 1) {
//       return zoom.toFixed(3); // For detailed zoom
//     } else if (zoom < 10) {
//       return zoom.toFixed(2); // For normal zoom
//     } else {
//       return zoom.toFixed(1); // For far-out zoom
//     }
//   };

//   // Format scale for human-readable display
//   const getScaleDescription = () => {
//     if (viewScale.meters < 0.01) {
//       return `${(viewScale.meters * 1000).toFixed(1)}mm visible`;
//     } else if (viewScale.meters < 1) {
//       return `${(viewScale.meters * 100).toFixed(1)}cm visible`;
//     } else if (viewScale.meters < 1000) {
//       return `${viewScale.meters.toFixed(1)}m visible`;
//     } else {
//       return `${(viewScale.meters / 1000).toFixed(2)}km visible`;
//     }
//   };

//   const registerRenderCallback = () => {
//     if (!rendererRef.current || !rendererRef.current.camera) return;

//     // Add a callback to camera for zoom/pan events that forces complete re-rendering
//     rendererRef.current.camera.onTransformChange = () => {
//       // Force a complete re-render of all walls
//       if (
//         wallToolRef.current &&
//         wallRendererRef.current &&
//         selectToolRef.current
//       ) {
//         // Get current selection
//         const selectedObj = selectToolRef.current.selectedObject;
//         const selectedWall = selectedObj ? selectedObj.object : null;
//         const connectedWalls = selectedObj
//           ? selectedObj.connectedWalls || []
//           : [];

//         // Get all necessary components
//         const walls = wallToolRef.current.walls;
//         const nodes = wallToolRef.current.nodes;
//         const currentWall = wallToolRef.current.currentWall;
//         const mousePosition = wallToolRef.current.mousePosition;

//         // Perform a complete render including connected walls
//         wallRendererRef.current.render(
//           walls,
//           nodes,
//           currentWall,
//           selectedWall,
//           mousePosition,
//           false,
//           connectedWalls
//         );

//         // Also update outlines
//         if (wallOutlineRendererRef.current) {
//           const allWalls = [...walls];
//           if (currentWall) allWalls.push(currentWall);
//           wallOutlineRendererRef.current.invalidate(); // Force redraw
//           wallOutlineRendererRef.current.render(allWalls, selectedWall);
//         }
//       }
//     };

//     // Add direct reference to outline renderer in WallTool
//     if (wallToolRef.current && wallOutlineRendererRef.current) {
//       wallToolRef.current.outlineRenderer = wallOutlineRendererRef.current;
//     }
//   };

//   return (
//     <div style={{ position: "relative", width: "100%", height: "100%" }}>
//       <div
//         ref={containerRef}
//         style={{
//           width: "100%",
//           height: "100%",
//           overflow: "hidden",
//           background: "#f7f7f7", // Light background to see the canvas area
//           tabIndex: 0,
//         }}
//       />

//       {/* Add the toolbar component */}
//       <Toolbar currentTool={currentTool} onToolChange={handleToolChange} />

//       {/* Show wall settings when wall tool is active */}
//       {currentTool === "wall" && (
//         <WallToolSettings
//           defaultThickness={defaultThickness}
//           onDefaultThicknessChange={handleDefaultThicknessChange}
//         />
//       )}

//       {/* Add the sidebar component - only visible when select tool is active */}
//       {currentTool === "select" && (
//         <Sidebar selectedObject={selectedObject} onEdit={handlePropertyEdit} />
//       )}

//       {showFPS && (
//         <div
//           style={{
//             position: "absolute",
//             top: "10px",
//             left: "10px",
//             background: "rgba(0,0,0,0.5)",
//             color: "white",
//             padding: "5px 10px",
//             borderRadius: "4px",
//             fontSize: "12px",
//             fontFamily: "monospace",
//           }}
//           onClick={() => setShowFPS(false)} // Click to hide
//         >
//           FPS: {fps}
//         </div>
//       )}

//       {/* Enhanced zoom control with scale information */}
//       <div
//         style={{
//           position: "absolute",
//           bottom: "10px",
//           right: "10px",
//           background: "rgba(255,255,255,0.85)",
//           padding: "10px",
//           borderRadius: "4px",
//           boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
//           fontSize: "12px",
//           minWidth: "160px",
//         }}
//       >
//         <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
//           View Information
//         </div>
//         <div style={{ display: "flex", justifyContent: "space-between" }}>
//           <span>Zoom:</span>
//           <span>{formatZoomLevel(zoomLevel)}x</span>
//         </div>
//         <div style={{ display: "flex", justifyContent: "space-between" }}>
//           <span>Scale:</span>
//           <span>{Math.round(viewScale.pixels)} px/m</span>
//         </div>
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             marginBottom: "5px",
//           }}
//         >
//           <span>View:</span>
//           <span>
//             {viewScale.width}m × {viewScale.height}m
//           </span>
//         </div>
//         <div style={{ fontSize: "10px", color: "#666", marginBottom: "8px" }}>
//           {getScaleDescription()}
//         </div>
//         <button
//           onClick={handleResetView}
//           style={{
//             width: "100%",
//             padding: "4px",
//             fontSize: "11px",
//             backgroundColor: "#f0f0f0",
//             border: "1px solid #ccc",
//             borderRadius: "3px",
//             cursor: "pointer",
//           }}
//         >
//           Reset View (1:1 Scale)
//         </button>
//         <div style={{ marginTop: "5px", fontSize: "10px", color: "#666" }}>
//           Press ESC to end drawing
//         </div>
//         <div style={{ marginTop: "3px", fontSize: "10px", color: "#666" }}>
//           SPACE + drag to pan view
//         </div>
//       </div>

//       <div
//         style={{
//           position: "absolute",
//           top: "60px",
//           left: "10px",
//           display: "flex",
//           gap: "5px",
//         }}
//       >
//         <button
//           onClick={() => historyManagerRef.current.undo()}
//           title="Undo (Ctrl+Z)"
//           style={{
//             padding: "5px 10px",
//             background: "#f0f0f0",
//             border: "1px solid #ccc",
//             borderRadius: "3px",
//             cursor: "pointer",
//           }}
//         >
//           Undo
//         </button>
//         <button
//           onClick={() => historyManagerRef.current.redo()}
//           title="Redo (Ctrl+Y)"
//           style={{
//             padding: "5px 10px",
//             background: "#f0f0f0",
//             border: "1px solid #ccc",
//             borderRadius: "3px",
//             cursor: "pointer",
//           }}
//         >
//           Redo
//         </button>
//       </div>
//     </div>
//   );
// };

// export default Canvas;

// src/components/Canvas.jsx - Update with circle and polygon tools
import React, { useEffect, useRef, useState } from "react";
import PixiRenderer from "../core/engine/PixiRenderer";
import SceneManager from "../core/engine/SceneManager";
import WallTool from "../tools/WallTool";
import SelectTool from "../tools/SelectTool";
import CircleTool from "../tools/CircleTool";
import PolygonTool from "../tools/PolygonTool";
import CircleSelectTool from "../tools/CircleSelectTool";
import PolygonSelectTool from "../tools/PolygonSelectTool";
import WallRenderer from "../renderers/WallRenderer";
import CircleRenderer from "../renderers/CircleRenderer";
import PolygonRenderer from "../renderers/PolygonRenderer";
import Toolbar from "./Toolbar";
import Sidebar from "./Sidebar";
import CircleSidebar from "./CircleSidebar";
import PolygonSidebar from "./PolygonSidebar";
import WallToolSettings from "./WallToolSettings";
import CircleToolSettings from "./CircleToolSettings";
import PolygonToolSettings from "./PolygonToolSettings";
import { PIXELS_PER_METER } from "../core/geometry/MeasurementUtils";
import WallOutlineRenderer from "../renderers/WallOutlineRenderer";
import HistoryManager from "../core/history/HistoryManager";
import ToolManager from "../tools/ToolManager";

const Canvas = () => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneManagerRef = useRef(null);
  const toolManagerRef = useRef(null);
  const historyManagerRef = useRef(null);

  // Tool references
  const wallToolRef = useRef(null);
  const selectToolRef = useRef(null);
  const circleToolRef = useRef(null);
  const polygonToolRef = useRef(null);
  const circleSelectToolRef = useRef(null);
  const polygonSelectToolRef = useRef(null);

  // Renderer references
  const wallRendererRef = useRef(null);
  const wallOutlineRendererRef = useRef(null);
  const circleRendererRef = useRef(null);
  const polygonRendererRef = useRef(null);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentTool, setCurrentTool] = useState("wall");
  const [selectedObject, setSelectedObject] = useState(null);
  const [defaultThickness, setDefaultThickness] = useState(1.0); // Default 1m thickness
  const [viewScale, setViewScale] = useState({
    pixels: PIXELS_PER_METER,
    meters: 1,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFPS, setShowFPS] = useState(true); // Set to true to show by default
  const [fps, setFps] = useState(0);

  // State for circle and polygon settings
  const [showCircleMeasurements, setShowCircleMeasurements] = useState(true);
  const [showPolygonMeasurements, setShowPolygonMeasurements] = useState(true);

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

        // Initialize history manager
        if (!historyManagerRef.current) {
          historyManagerRef.current = new HistoryManager();
        }

        // Initialize renderers
        const wallRenderer = new WallRenderer(renderer);
        wallRendererRef.current = wallRenderer;

        const wallOutlineRenderer = new WallOutlineRenderer(renderer);
        wallOutlineRendererRef.current = wallOutlineRenderer;

        const circleRenderer = new CircleRenderer(renderer);
        circleRendererRef.current = circleRenderer;

        const polygonRenderer = new PolygonRenderer(renderer);
        polygonRendererRef.current = polygonRenderer;

        // Initialize tools with all the renderers
        const wallTool = new WallTool(
          renderer,
          wallRenderer,
          historyManagerRef.current
        );
        wallTool.setDefaultThickness(defaultThickness);
        wallTool.outlineRenderer = wallOutlineRenderer;
        wallTool.onWallAdded = () => {
          // Simple direct rendering - no force update needed
          renderWalls();
        };
        wallToolRef.current = wallTool;

        const circleTool = new CircleTool(
          renderer,
          circleRenderer,
          historyManagerRef.current
        );
        circleTool.onCircleAdded = () => {
          renderCircles();
        };
        circleToolRef.current = circleTool;

        const polygonTool = new PolygonTool(
          renderer,
          polygonRenderer,
          historyManagerRef.current
        );
        polygonTool.onPolygonAdded = () => {
          renderPolygons();
        };
        polygonToolRef.current = polygonTool;

        // Initialize selection tools
        const selectTool = new SelectTool(
          renderer,
          wallRenderer,
          wallTool.walls,
          historyManagerRef.current
        );
        selectTool.wallTool = wallTool;
        selectTool.setOnSelectionChange((obj) => {
          if (obj && obj.type === "wall") {
            setSelectedObject(obj);
          } else if (!obj) {
            setSelectedObject(null);
          }
        });
        selectToolRef.current = selectTool;

        const circleSelectTool = new CircleSelectTool(
          renderer,
          circleRenderer,
          circleTool.circles,
          historyManagerRef.current
        );
        circleSelectTool.setOnSelectionChange((obj) => {
          if (obj && obj.type === "circle") {
            setSelectedObject(obj);
          } else if (!obj) {
            setSelectedObject(null);
          }
        });
        circleSelectToolRef.current = circleSelectTool;

        const polygonSelectTool = new PolygonSelectTool(
          renderer,
          polygonRenderer,
          polygonTool.polygons,
          historyManagerRef.current
        );
        polygonSelectTool.setOnSelectionChange((obj) => {
          if (obj && obj.type === "polygon") {
            setSelectedObject(obj);
          } else if (!obj) {
            setSelectedObject(null);
          }
        });
        polygonSelectToolRef.current = polygonSelectTool;

        // Initialize the tool manager
        toolManagerRef.current = new ToolManager();

        // Register tools
        toolManagerRef.current.registerTool("wall", wallTool);
        toolManagerRef.current.registerTool("select", selectTool);
        toolManagerRef.current.registerTool("circle", circleTool);
        toolManagerRef.current.registerTool("polygon", polygonTool);
        toolManagerRef.current.registerTool("circleSelect", circleSelectTool);
        toolManagerRef.current.registerTool("polygonSelect", polygonSelectTool);

        // Activate initial tool
        toolManagerRef.current.activateTool(currentTool);

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

        if (circleRendererRef.current) {
          circleRendererRef.current.destroy();
          circleRendererRef.current = null;
        }

        if (polygonRendererRef.current) {
          polygonRendererRef.current.destroy();
          polygonRendererRef.current = null;
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
      // Delete key to delete selected object
      if (e.key === "Delete" || e.key === "Backspace") {
        if (
          currentTool === "select" &&
          selectToolRef.current &&
          selectToolRef.current.selectedObject
        ) {
          e.preventDefault();
          selectToolRef.current.deleteSelectedWall();
        } else if (
          currentTool === "select" &&
          circleSelectToolRef.current &&
          circleSelectToolRef.current.selectedObject
        ) {
          e.preventDefault();
          circleSelectToolRef.current.deleteSelectedCircle();
        } else if (
          currentTool === "select" &&
          polygonSelectToolRef.current &&
          polygonSelectToolRef.current.selectedObject
        ) {
          e.preventDefault();
          polygonSelectToolRef.current.deleteSelectedPolygon();
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
      // If currentTool is 'select', decide which select tool to activate based on the type of selected object
      if (currentTool === "select") {
        // First deactivate all tools
        for (const toolName of ["select", "circleSelect", "polygonSelect"]) {
          if (toolManagerRef.current.tools[toolName]) {
            toolManagerRef.current.tools[toolName].deactivate();
          }
        }

        // Make sure selection tools have current data
        updateSelectionToolsData();

        // Activate all select tools
        if (toolManagerRef.current.tools.select) {
          toolManagerRef.current.tools.select.activate();
        }
        if (toolManagerRef.current.tools.circleSelect) {
          toolManagerRef.current.tools.circleSelect.activate();
        }
        if (toolManagerRef.current.tools.polygonSelect) {
          toolManagerRef.current.tools.polygonSelect.activate();
        }
      } else {
        // For non-select tools, activate normally
        toolManagerRef.current.activateTool(currentTool);

        // Clear selection
        setSelectedObject(null);
      }
    }
  }, [currentTool, isInitialized]);

  // Update selection tools with data from drawing tools
  const updateSelectionToolsData = () => {
    if (selectToolRef.current && wallToolRef.current) {
      selectToolRef.current.setWalls(wallToolRef.current.walls);
    }
    if (circleSelectToolRef.current && circleToolRef.current) {
      circleSelectToolRef.current.setCircles(circleToolRef.current.circles);
    }
    if (polygonSelectToolRef.current && polygonToolRef.current) {
      polygonSelectToolRef.current.setPolygons(polygonToolRef.current.polygons);
    }
  };

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
      // Force a re-render of all objects after reset
      renderAll();
    }
  };

  // Tool change handler
  const handleToolChange = (toolName) => {
    setCurrentTool(toolName);
  };

  // Handle property editing
  const handlePropertyEdit = (property, value, objectId) => {
    if (!selectedObject) return;

    if (selectedObject.type === "wall" && selectToolRef.current) {
      selectToolRef.current.updateSelectedObject(property, value);
    } else if (
      selectedObject.type === "circle" &&
      circleSelectToolRef.current
    ) {
      circleSelectToolRef.current.updateSelectedObject(property, value);
    } else if (
      selectedObject.type === "polygon" &&
      polygonSelectToolRef.current
    ) {
      polygonSelectToolRef.current.updateSelectedObject(property, value);
    }
  };

  // Circle measurements toggle handler
  const handleCircleMeasurementsToggle = (show) => {
    setShowCircleMeasurements(show);
    // Update renderer to show/hide measurements
    if (circleRendererRef.current) {
      // Implementation would depend on your renderer design
      renderCircles();
    }
  };

  // Polygon measurements toggle handler
  const handlePolygonMeasurementsToggle = (show) => {
    setShowPolygonMeasurements(show);
    // Update renderer to show/hide measurements
    if (polygonRendererRef.current) {
      // Implementation would depend on your renderer design
      renderPolygons();
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

      if (
        selectedObject &&
        selectedObject.type === "wall" &&
        currentTool === "select"
      ) {
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

  // This function will render the circles
  const renderCircles = () => {
    if (circleRendererRef.current && circleToolRef.current) {
      const circles = circleToolRef.current.circles;
      const currentCircle = circleToolRef.current.currentCircle;

      // Get selected circle if in select mode
      let selectedCircle = null;
      if (
        selectedObject &&
        selectedObject.type === "circle" &&
        currentTool === "select"
      ) {
        selectedCircle = selectedObject.object;
      }

      const mousePosition = circleToolRef.current.mousePosition;

      // Render circles
      circleRendererRef.current.render(
        circles,
        currentCircle,
        mousePosition,
        selectedCircle
      );
    }
  };

  // This function will render the polygons
  const renderPolygons = () => {
    if (polygonRendererRef.current && polygonToolRef.current) {
      const polygons = polygonToolRef.current.polygons;
      const currentPolygon = polygonToolRef.current.currentPolygon;

      // Get selected polygon if in select mode
      let selectedPolygon = null;
      if (
        selectedObject &&
        selectedObject.type === "polygon" &&
        currentTool === "select"
      ) {
        selectedPolygon = selectedObject.object;
      }

      const mousePosition = polygonToolRef.current.mousePosition;

      // Render polygons
      polygonRendererRef.current.render(
        polygons,
        currentPolygon,
        mousePosition,
        selectedPolygon
      );
    }
  };

  // Render all objects
  const renderAll = () => {
    renderWalls();
    renderCircles();
    renderPolygons();
  };

  // Re-render everything when selection or tool changes
  useEffect(() => {
    renderAll();
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
      // Force a complete re-render of all objects
      renderAll();
    };

    // Add direct reference to outline renderer in WallTool
    if (wallToolRef.current && wallOutlineRendererRef.current) {
      wallToolRef.current.outlineRenderer = wallOutlineRendererRef.current;
    }
  };

  // Render the appropriate sidebar based on the selected object
  const renderSidebar = () => {
    if (!selectedObject || currentTool !== "select") return null;

    switch (selectedObject.type) {
      case "wall":
        return (
          <Sidebar
            selectedObject={selectedObject}
            onEdit={handlePropertyEdit}
          />
        );
      case "circle":
        return (
          <CircleSidebar
            selectedObject={selectedObject}
            onEdit={handlePropertyEdit}
          />
        );
      case "polygon":
        return (
          <PolygonSidebar
            selectedObject={selectedObject}
            onEdit={handlePropertyEdit}
          />
        );
      default:
        return null;
    }
  };

  // Render the appropriate tool settings based on the current tool
  const renderToolSettings = () => {
    switch (currentTool) {
      case "wall":
        return (
          <WallToolSettings
            defaultThickness={defaultThickness}
            onDefaultThicknessChange={handleDefaultThicknessChange}
          />
        );
      case "circle":
        return (
          <CircleToolSettings
            showMeasurements={showCircleMeasurements}
            onShowMeasurements={handleCircleMeasurementsToggle}
          />
        );
      case "polygon":
        return (
          <PolygonToolSettings
            showMeasurements={showPolygonMeasurements}
            onShowMeasurements={handlePolygonMeasurementsToggle}
          />
        );
      default:
        return null;
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

      {/* Show tool settings based on the current tool */}
      {renderToolSettings()}

      {/* Show sidebar for the selected object */}
      {renderSidebar()}

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
