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
import React, { useEffect, useRef, useState } from "react";
import PixiRenderer from "../core/engine/PixiRenderer";
import SceneManager from "../core/engine/SceneManager";

// Import all tools
import WallTool from "../tools/WallTool";
import SelectTool from "../tools/SelectTool";
import CircleTool from "../tools/CircleTool";
import PolygonTool from "../tools/PolygonTool";
import CircleSelectTool from "../tools/CircleSelectTool";
import PolygonSelectTool from "../tools/PolygonSelectTool";
import ZoneTool from "../tools/ZoneTool";
import ZoneSelectTool from "../tools/ZoneSelectTool";
import ZoneDividerTool from "../tools/ZoneDividerTool";
import ZoneDividerSelectTool from "../tools/ZoneDividerSelectTool";
import ArcTool from "../tools/ArcTool";
import ArcSelectTool from "../tools/ArcSelectTool";

// Import all renderers
import WallRenderer from "../renderers/WallRenderer";
import CircleRenderer from "../renderers/CircleRenderer";
import PolygonRenderer from "../renderers/PolygonRenderer";
import ZoneRenderer from "../renderers/ZoneRenderer";
import ZoneDividerRenderer from "../renderers/ZoneDividerRenderer";
import ArcRenderer from "../renderers/ArcRenderer";

// Import toolbars and sidebars for different types
import Toolbar from "./Toolbar";
import Sidebar from "./Sidebar";
import CircleSidebar from "./CircleSidebar";
import PolygonSidebar from "./PolygonSidebar";

// Import settings panels
import WallToolSettings from "./WallToolSettings";
import CircleToolSettings from "./CircleToolSettings";
import PolygonToolSettings from "./PolygonToolSettings";

// Import constants and utilities
import { PIXELS_PER_METER } from "../core/geometry/MeasurementUtils";
import WallOutlineRenderer from "../renderers/WallOutlineRenderer";
import HistoryManager from "../core/history/HistoryManager";
import ToolManager from "../tools/ToolManager";

const Canvas = () => {
  // Base references
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneManagerRef = useRef(null);
  const toolManagerRef = useRef(null);
  const historyManagerRef = useRef(null);

  // Tool references
  const wallToolRef = useRef(null);
  const selectToolRef = useRef(null);
  const circleToolRef = useRef(null);
  const circleSelectToolRef = useRef(null);
  const polygonToolRef = useRef(null);
  const polygonSelectToolRef = useRef(null);
  const zoneToolRef = useRef(null);
  const zoneSelectToolRef = useRef(null);
  const zoneDividerToolRef = useRef(null);
  const zoneDividerSelectToolRef = useRef(null);
  const arcToolRef = useRef(null);
  const arcSelectToolRef = useRef(null);

  // Renderer references
  const wallRendererRef = useRef(null);
  const wallOutlineRendererRef = useRef(null);
  const circleRendererRef = useRef(null);
  const polygonRendererRef = useRef(null);
  const zoneRendererRef = useRef(null);
  const zoneDividerRendererRef = useRef(null);
  const arcRendererRef = useRef(null);

  // UI state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentTool, setCurrentTool] = useState("wall");
  const [selectedObject, setSelectedObject] = useState(null);
  const [defaultThickness, setDefaultThickness] = useState(1.0); // Default 1m thickness
  const [viewScale, setViewScale] = useState({
    pixels: PIXELS_PER_METER,
    meters: 1,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFPS, setShowFPS] = useState(true);
  const [fps, setFps] = useState(0);

  // Tool settings state
  const [showCircleMeasurements, setShowCircleMeasurements] = useState(true);
  const [showPolygonMeasurements, setShowPolygonMeasurements] = useState(true);
  const [showZoneMeasurements, setShowZoneMeasurements] = useState(true);
  const [zoneDividerThickness, setZoneDividerThickness] = useState(0.05); // 5cm default

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

        // Initialize renderers in the correct order (bottom to top layers)

        // 1. Zone renderer (bottom layer)
        const zoneRenderer = new ZoneRenderer(renderer);
        zoneRendererRef.current = zoneRenderer;

        // 2. Zone divider renderer
        const zoneDividerRenderer = new ZoneDividerRenderer(renderer);
        zoneDividerRendererRef.current = zoneDividerRenderer;

        // 3. Wall renderer
        const wallRenderer = new WallRenderer(renderer);
        wallRendererRef.current = wallRenderer;

        const wallOutlineRenderer = new WallOutlineRenderer(renderer);
        wallOutlineRendererRef.current = wallOutlineRenderer;

        // 4. Circle renderer
        const circleRenderer = new CircleRenderer(renderer);
        circleRendererRef.current = circleRenderer;

        // 5. Polygon renderer
        const polygonRenderer = new PolygonRenderer(renderer);
        polygonRendererRef.current = polygonRenderer;

        // 6. Arc renderer
        const arcRenderer = new ArcRenderer(renderer);
        arcRendererRef.current = arcRenderer;

        // Initialize all tools with their renderers

        // 1. Zone tools
        const zoneTool = new ZoneTool(
          renderer,
          zoneRenderer,
          historyManagerRef.current
        );
        zoneTool.onZoneAdded = () => {
          renderZones();
        };
        zoneToolRef.current = zoneTool;

        const zoneSelectTool = new ZoneSelectTool(
          renderer,
          zoneRenderer,
          zoneTool.zones,
          historyManagerRef.current
        );
        zoneSelectTool.setOnSelectionChange((obj) => {
          if (obj && obj.type === "zone") {
            setSelectedObject(obj);
          } else if (!obj) {
            setSelectedObject(null);
          }
        });
        zoneSelectToolRef.current = zoneSelectTool;

        // 2. Zone divider tools
        const zoneDividerTool = new ZoneDividerTool(
          renderer,
          zoneDividerRenderer,
          zoneTool, // Pass zone tool reference for boundary snapping
          historyManagerRef.current
        );
        zoneDividerTool.setDefaultThickness(zoneDividerThickness);
        zoneDividerTool.onDividerAdded = () => {
          renderZoneDividers();
        };
        zoneDividerToolRef.current = zoneDividerTool;

        const zoneDividerSelectTool = new ZoneDividerSelectTool(
          renderer,
          zoneDividerRenderer,
          zoneDividerTool.dividers,
          historyManagerRef.current
        );
        zoneDividerSelectTool.setOnSelectionChange((obj) => {
          if (obj && obj.type === "zoneDivider") {
            setSelectedObject(obj);
          } else if (!obj) {
            setSelectedObject(null);
          }
        });
        zoneDividerSelectToolRef.current = zoneDividerSelectTool;

        // 3. Wall tools
        const wallTool = new WallTool(
          renderer,
          wallRenderer,
          historyManagerRef.current
        );
        wallTool.setDefaultThickness(defaultThickness);
        wallTool.outlineRenderer = wallOutlineRenderer;
        wallTool.onWallAdded = () => {
          renderWalls();
        };
        wallToolRef.current = wallTool;

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

        // 4. Circle tools
        const circleTool = new CircleTool(
          renderer,
          circleRenderer,
          historyManagerRef.current
        );
        circleTool.onCircleAdded = () => {
          renderCircles();
        };
        circleToolRef.current = circleTool;

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

        // 5. Polygon tools
        const polygonTool = new PolygonTool(
          renderer,
          polygonRenderer,
          historyManagerRef.current
        );
        polygonTool.onPolygonAdded = () => {
          renderPolygons();
        };
        polygonToolRef.current = polygonTool;

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

        // 6. Arc tools
        const arcTool = new ArcTool(
          renderer,
          arcRenderer,
          historyManagerRef.current
        );
        arcTool.onArcAdded = () => {
          renderArcs();
        };
        arcToolRef.current = arcTool;

        const arcSelectTool = new ArcSelectTool(
          renderer,
          arcRenderer,
          arcTool.arcs,
          historyManagerRef.current
        );
        arcSelectTool.setOnSelectionChange((obj) => {
          if (obj && obj.type === "arc") {
            setSelectedObject(obj);
          } else if (!obj) {
            setSelectedObject(null);
          }
        });
        arcSelectToolRef.current = arcSelectTool;

        // Initialize the tool manager
        toolManagerRef.current = new ToolManager();

        // Register all tools
        toolManagerRef.current.registerTool("wall", wallTool);
        toolManagerRef.current.registerTool("select", selectTool);
        toolManagerRef.current.registerTool("circle", circleTool);
        toolManagerRef.current.registerTool("circleSelect", circleSelectTool);
        toolManagerRef.current.registerTool("polygon", polygonTool);
        toolManagerRef.current.registerTool("polygonSelect", polygonSelectTool);
        toolManagerRef.current.registerTool("zone", zoneTool);
        toolManagerRef.current.registerTool("zoneSelect", zoneSelectTool);
        toolManagerRef.current.registerTool("zoneDivider", zoneDividerTool);
        toolManagerRef.current.registerTool(
          "zoneDividerSelect",
          zoneDividerSelectTool
        );
        toolManagerRef.current.registerTool("arc", arcTool);
        toolManagerRef.current.registerTool("arcSelect", arcSelectTool);

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

        if (zoneRendererRef.current) {
          zoneRendererRef.current.destroy();
          zoneRendererRef.current = null;
        }

        if (zoneDividerRendererRef.current) {
          zoneDividerRendererRef.current.destroy();
          zoneDividerRendererRef.current = null;
        }

        if (arcRendererRef.current) {
          arcRendererRef.current.destroy();
          arcRendererRef.current = null;
        }
      };
    });
  }, []);

  useEffect(() => {
    const handleGlobalKeydown = (e) => {
      console.log("Global keydown:", e.key, e.ctrlKey);

      // Handle undo/redo keyboard shortcuts
      if (e.ctrlKey && e.key === "z" && historyManagerRef.current) {
        historyManagerRef.current.undo();
      } else if (e.ctrlKey && e.key === "y" && historyManagerRef.current) {
        historyManagerRef.current.redo();
      }
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
      // Delete key to delete selected object - handled by each select tool
      if (e.key === "Delete" || e.key === "Backspace") {
        // Each tool already has its own handler for this
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentTool]);

  // Update active tool when currentTool changes
  useEffect(() => {
    if (toolManagerRef.current && currentTool && isInitialized) {
      if (currentTool === "select") {
        // First deactivate all select tools
        const selectTools = [
          "select",
          "circleSelect",
          "polygonSelect",
          "zoneSelect",
          "zoneDividerSelect",
          "arcSelect",
        ];
        for (const toolName of selectTools) {
          if (toolManagerRef.current.tools[toolName]) {
            toolManagerRef.current.tools[toolName].deactivate();
          }
        }

        // Ensure selection tools have current data
        updateSelectionToolsData();

        // Activate all select tools so they can handle their respective objects
        for (const toolName of selectTools) {
          if (toolManagerRef.current.tools[toolName]) {
            toolManagerRef.current.tools[toolName].activate();
          }
        }
      } else {
        // For non-select tools, activate normally
        toolManagerRef.current.activateTool(currentTool);

        // Clear selection when changing tools
        setSelectedObject(null);
      }

      // Update all renderers
      renderAll();
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

    if (zoneSelectToolRef.current && zoneToolRef.current) {
      zoneSelectToolRef.current.setZones(zoneToolRef.current.zones);
    }

    if (zoneDividerSelectToolRef.current && zoneDividerToolRef.current) {
      zoneDividerSelectToolRef.current.setDividers(
        zoneDividerToolRef.current.dividers
      );
    }

    if (arcSelectToolRef.current && arcToolRef.current) {
      arcSelectToolRef.current.setArcs(arcToolRef.current.arcs);
    }
  };

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

  // Handler for wall thickness change
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

    // Call the appropriate update method based on selection type
    switch (selectedObject.type) {
      case "wall":
        if (selectToolRef.current) {
          selectToolRef.current.updateSelectedObject(property, value);
        }
        break;
      case "circle":
        if (circleSelectToolRef.current) {
          circleSelectToolRef.current.updateSelectedObject(property, value);
        }
        break;
      case "polygon":
        if (polygonSelectToolRef.current) {
          polygonSelectToolRef.current.updateSelectedObject(property, value);
        }
        break;
      case "zone":
        if (zoneSelectToolRef.current) {
          zoneSelectToolRef.current.updateSelectedObject(property, value);
        }
        break;
      case "zoneDivider":
        if (zoneDividerSelectToolRef.current) {
          zoneDividerSelectToolRef.current.updateSelectedObject(
            property,
            value
          );
        }
        break;
      case "arc":
        if (arcSelectToolRef.current) {
          arcSelectToolRef.current.updateSelectedObject(property, value);
        }
        break;
    }
  };

  // Circle measurements toggle handler
  const handleCircleMeasurementsToggle = (show) => {
    setShowCircleMeasurements(show);
    renderCircles();
  };

  // Polygon measurements toggle handler
  const handlePolygonMeasurementsToggle = (show) => {
    setShowPolygonMeasurements(show);
    renderPolygons();
  };

  // Zone measurements toggle handler
  const handleZoneMeasurementsToggle = (show) => {
    setShowZoneMeasurements(show);
    renderZones();
  };

  // Zone divider thickness handler
  const handleZoneDividerThicknessChange = (thickness) => {
    setZoneDividerThickness(thickness);
    if (zoneDividerToolRef.current) {
      zoneDividerToolRef.current.setDefaultThickness(thickness);
    }
  };

  // Render functions for each object type
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
        connectedWalls = selectedObject.connectedWalls || [];
      }

      const mousePosition = wallToolRef.current.mousePosition;

      // Render walls
      wallRendererRef.current.render(
        walls,
        nodes,
        currentWall,
        selectedWall,
        mousePosition,
        true, // Skip outlines parameter
        connectedWalls
      );

      // Always render high-quality outlines
      if (wallOutlineRendererRef.current) {
        const allWalls = [...walls];
        if (currentWall) allWalls.push(currentWall);
        wallOutlineRendererRef.current.invalidate(); // Force redraw
        wallOutlineRendererRef.current.render(allWalls, selectedWall);
      }
    }
  };

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

  const renderZones = () => {
    if (zoneRendererRef.current && zoneToolRef.current) {
      const zones = zoneToolRef.current.zones;
      const currentZone = zoneToolRef.current.currentZone;

      // Get selected zone if in select mode
      let selectedZone = null;
      if (
        selectedObject &&
        selectedObject.type === "zone" &&
        currentTool === "select"
      ) {
        selectedZone = selectedObject.object;
      }

      const mousePosition = zoneToolRef.current.mousePosition;

      // Render zones
      zoneRendererRef.current.render(
        zones,
        currentZone,
        mousePosition,
        selectedZone
      );
    }
  };

  const renderZoneDividers = () => {
    if (zoneDividerRendererRef.current && zoneDividerToolRef.current) {
      const dividers = zoneDividerToolRef.current.dividers;
      const currentDivider = zoneDividerToolRef.current.currentDivider;

      // Get selected divider if in select mode
      let selectedDivider = null;
      if (
        selectedObject &&
        selectedObject.type === "zoneDivider" &&
        currentTool === "select"
      ) {
        selectedDivider = selectedObject.object;
      }

      const mousePosition = zoneDividerToolRef.current.mousePosition;

      // Render zone dividers
      zoneDividerRendererRef.current.render(
        dividers,
        currentDivider,
        mousePosition,
        selectedDivider
      );
    }
  };

  const renderArcs = () => {
    if (arcRendererRef.current && arcToolRef.current) {
      const arcs = arcToolRef.current.arcs;
      const currentArc = arcToolRef.current.currentArc;

      // Get selected arc if in select mode
      let selectedArc = null;
      if (
        selectedObject &&
        selectedObject.type === "arc" &&
        currentTool === "select"
      ) {
        selectedArc = selectedObject.object;
      }

      const mousePosition = arcToolRef.current.mousePosition;

      // Render arcs
      arcRendererRef.current.render(
        arcs,
        currentArc,
        mousePosition,
        selectedArc
      );
    }
  };

  // Render all objects
  const renderAll = () => {
    // Render in bottom-to-top layer order
    renderZones();
    renderZoneDividers();
    renderWalls();
    renderCircles();
    renderPolygons();
    renderArcs();
  };

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
      case "zone":
        // For now, use a simple dynamic sidebar for zones
        return (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "250px",
              background: "rgba(255,255,255,0.85)",
              padding: "15px",
              borderRadius: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              fontSize: "14px",
            }}
          >
            <h3 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>
              Zone Properties
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Area:</span>
                <span>{selectedObject.object.area.toFixed(2)} m²</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Perimeter:</span>
                <span>{selectedObject.object.perimeter.toFixed(2)} m</span>
              </div>
            </div>
          </div>
        );
      case "zoneDivider":
        // Simple sidebar for zone dividers
        return (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "250px",
              background: "rgba(255,255,255,0.85)",
              padding: "15px",
              borderRadius: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              fontSize: "14px",
            }}
          >
            <h3 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>
              Zone Divider Properties
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "5px" }}
            >
              <label>Thickness:</label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="number"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={selectedObject.object.thickness}
                  onChange={(e) =>
                    handlePropertyEdit("thickness", parseFloat(e.target.value))
                  }
                  style={{
                    width: "100%",
                    padding: "5px",
                    border: "1px solid #ccc",
                    borderRadius: "3px",
                  }}
                />
                <span style={{ marginLeft: "5px" }}>m</span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "5px",
              }}
            >
              <input
                type="checkbox"
                id="isDashed"
                checked={selectedObject.object.isDashed}
                onChange={(e) =>
                  handlePropertyEdit("isDashed", e.target.checked)
                }
                style={{ marginRight: "10px" }}
              />
              <label htmlFor="isDashed">Dashed Line</label>
            </div>
          </div>
        );
      case "arc":
        // Simple sidebar for arcs
        return (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "250px",
              background: "rgba(255,255,255,0.85)",
              padding: "15px",
              borderRadius: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              fontSize: "14px",
            }}
          >
            <h3 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>
              Arc Properties
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "5px" }}
            >
              <label>Radius:</label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={selectedObject.object.radius}
                  onChange={(e) =>
                    handlePropertyEdit("radius", parseFloat(e.target.value))
                  }
                  style={{
                    width: "100%",
                    padding: "5px",
                    border: "1px solid #ccc",
                    borderRadius: "3px",
                  }}
                />
                <span style={{ marginLeft: "5px" }}>m</span>
              </div>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Arc Length:</span>
                <span>
                  {selectedObject.object.arcLength?.toFixed(2) || "0.00"} m
                </span>
              </div>
            </div>
          </div>
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
      case "zone":
        return (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "250px",
              background: "rgba(255,255,255,0.85)",
              padding: "15px",
              borderRadius: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "14px",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
              Zone Settings
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "5px" }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  id="showZoneMeasurements"
                  checked={showZoneMeasurements}
                  onChange={(e) =>
                    handleZoneMeasurementsToggle(e.target.checked)
                  }
                  style={{ marginRight: "10px" }}
                />
                <label htmlFor="showZoneMeasurements">Show Measurements</label>
              </div>
            </div>
            <div
              style={{
                marginTop: "15px",
                fontSize: "12px",
                color: "#666",
              }}
            >
              Click to add zone points. Double-click or click the first point to
              close the zone.
            </div>
          </div>
        );
      case "zoneDivider":
        return (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "250px",
              background: "rgba(255,255,255,0.85)",
              padding: "15px",
              borderRadius: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "14px",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
              Zone Divider Settings
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "5px" }}
            >
              <label>Divider Thickness:</label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="number"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={zoneDividerThickness}
                  onChange={(e) =>
                    handleZoneDividerThicknessChange(parseFloat(e.target.value))
                  }
                  style={{
                    width: "100%",
                    padding: "5px",
                    border: "1px solid #ccc",
                    borderRadius: "3px",
                  }}
                />
                <span style={{ marginLeft: "5px" }}>m</span>
              </div>
            </div>
            <div
              style={{
                marginTop: "15px",
                fontSize: "12px",
                color: "#666",
              }}
            >
              Click within a zone or on a zone boundary to start drawing a
              divider.
            </div>
          </div>
        );
      case "arc":
        return (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "250px",
              background: "rgba(255,255,255,0.85)",
              padding: "15px",
              borderRadius: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "14px",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
              Arc Settings
            </h3>
            <div
              style={{
                marginTop: "15px",
                fontSize: "12px",
                color: "#666",
              }}
            >
              1. First click sets the center point.
              <br />
              2. Second click sets radius and start angle.
              <br />
              3. Third click sets the end angle and completes the arc.
            </div>
          </div>
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

      {/* Add the toolbar component with expanded tools */}
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

      {/* History control buttons */}
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
          onClick={() => historyManagerRef.current?.undo()}
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
          onClick={() => historyManagerRef.current?.redo()}
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
