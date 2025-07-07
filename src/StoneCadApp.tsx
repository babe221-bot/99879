import React, { useState, useEffect, useRef } from "react";
import { stoneData, surfaceFinishes, edgeProcessing } from "./data";
import {
  Stone,
  SurfaceFinish,
  EdgeProcess,
  Dimensions,
  Config,
  Calculations,
  Costs,
} from "./types";
import {
  draw3DCanvas,
  draw2DCanvas,
  lightenColor,
  darkenColor,
} from "./drawing";

const StoneCadApp: React.FC = () => {
  const [currentConfig, setCurrentConfig] = useState<Config>({
    projectType: "kitchen",
    material: "kirmenjak",
    surface: "poliranje",
    edge: "c05",
    dimensions: {
      length: 250, // cm
      width: 60, // cm
      thickness: 3, // cm
      quantity: 1,
    },
    view: "isometric",
  });

  const [status, setStatus] = useState<string>("Ready to configure");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">(
    "info"
  );

  const canvas3DRef = useRef<HTMLCanvasElement>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const rotationAngleRef = useRef<number>(0);
  const animationIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseXRef = useRef<number>(0);
  const lastMouseYRef = useRef<number>(0);

  const updateStatus = (
    message: string,
    type: "info" | "success" | "error" = "success",
    duration: number = 3000
  ) => {
    setStatus(message);
    setStatusType(type);
    if (duration > 0) {
      setTimeout(() => {
        setStatus("Ready to configure");
        setStatusType("info");
      }, duration);
    }
  };

  const currentMaterial: Stone = stoneData[currentConfig.material];
  const currentSurface: SurfaceFinish = surfaceFinishes[currentConfig.surface];
  const currentEdge: EdgeProcess = edgeProcessing[currentConfig.edge];

  const calculations: Calculations = (() => {
    const dims = currentConfig.dimensions;
    const lengthM = dims.length / 100;
    const widthM = dims.width / 100;
    const thicknessM = dims.thickness / 100;
    const volume = lengthM * widthM * thicknessM * dims.quantity;
    const surfaceArea = lengthM * widthM * 2 * dims.quantity; // Top and bottom
    const edgeLength = (lengthM + widthM) * 2 * dims.quantity;
    const weight = volume * currentMaterial.density;
    return { volume, surfaceArea, edgeLength, weight };
  })();

  const costs: Costs = (() => {
    const dims = currentConfig.dimensions;
    const lengthM = dims.length / 100;
    const widthM = dims.width / 100;
    // Surface area for costing (typically top surface)
    const surfaceAreaForCosting = lengthM * widthM * dims.quantity;
    const edgeLengthForCosting =
      (lengthM + widthM) * 2 * dims.quantity;

    const materialCost = surfaceAreaForCosting * currentMaterial.price;
    const surfaceCost = surfaceAreaForCosting * currentSurface.price;
    const edgeCost = edgeLengthForCosting * currentEdge.price;
    const totalCost = materialCost + surfaceCost + edgeCost;
    return { materialCost, surfaceCost, edgeCost, totalCost };
  })();

  const handleDimensionChange = (
    dim: keyof Dimensions,
    value: string | number
  ) => {
    setCurrentConfig((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dim]: Number(value),
      },
    }));
  };

  const updateDimensionsForProjectType = (projectType: string) => {
    const defaults: { [key: string]: Partial<Dimensions> } = {
      kitchen: { length: 250, width: 60, thickness: 3 },
      bathroom: { length: 120, width: 50, thickness: 2 },
      stepeniste: { length: 90, width: 14, thickness: 2 },
      pragovi: { length: 120, width: 15, thickness: 4 },
    };
    const defaultDims = defaults[projectType] || defaults.kitchen;
    setCurrentConfig((prev) => ({
      ...prev,
      projectType,
      dimensions: {
        ...prev.dimensions,
        ...defaultDims,
      },
    }));
  };

  // Drawing useEffect
  useEffect(() => {
    const canvas3D = canvas3DRef.current;
    const ctx3D = canvas3D?.getContext("2d");

    if (ctx3D && canvas3D) {
      draw3DCanvas(
        ctx3D,
        canvas3D,
        currentConfig,
        currentMaterial,
        rotationAngleRef.current,
        lightenColor,
        darkenColor
      );
    }
  }, [currentConfig, currentMaterial]);

  // Animation useEffect
  useEffect(() => {
    const animate = () => {
      if (currentConfig.view === "isometric" && canvas3DRef.current) {
        rotationAngleRef.current += 0.005; // Slower rotation
        const ctx3D = canvas3DRef.current.getContext("2d");
        if (ctx3D) {
          draw3DCanvas(
            ctx3D,
            canvas3DRef.current,
            currentConfig,
            currentMaterial,
            rotationAngleRef.current,
            lightenColor,
            darkenColor
          );
        }
      }
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animationIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [currentConfig.view, currentMaterial, currentConfig]); // Ensure all dependencies are listed

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMouseXRef.current = e.clientX;
    lastMouseYRef.current = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || currentConfig.view !== "isometric") return;

    const deltaX = e.clientX - lastMouseXRef.current;
    // const deltaY = e.clientY - lastMouseYRef.current; // For Y-axis rotation if needed

    rotationAngleRef.current += deltaX * 0.01;

    lastMouseXRef.current = e.clientX;
    lastMouseYRef.current = e.clientY;

    // Trigger a manual redraw for immediate feedback during drag
    const canvas3D = canvas3DRef.current;
    const ctx3D = canvas3D?.getContext("2d");
    if (ctx3D && canvas3D) {
      draw3DCanvas(
        ctx3D,
        canvas3D,
        currentConfig,
        currentMaterial,
        rotationAngleRef.current,
        lightenColor,
        darkenColor
      );
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleGenerateTechnicalDrawing = () => {
    const canvas2D = canvas2DRef.current;
    const ctx2D = canvas2D?.getContext("2d");
    if (ctx2D && canvas2D) {
      draw2DCanvas(
        ctx2D,
        canvas2D,
        currentConfig,
        currentMaterial,
        lightenColor,
        darkenColor
      ); // Pass necessary color functions
      updateStatus("Technical drawing generated successfully");
    }
  };

  const handleDownloadDrawing = () => {
    const canvas2D = canvas2DRef.current;
    if (canvas2D) {
      const link = document.createElement("a");
      link.href = canvas2D.toDataURL("image/png");
      link.download = "technical-drawing.png";
      link.click();
      updateStatus("Technical drawing downloaded!");
    }
  };

  const handleSaveProject = () => {
    const projectData = {
      config: currentConfig,
      timestamp: new Date().toISOString(),
      material: currentMaterial,
      calculations: calculations, // Use the calculated values
      costs: costs, // Use the calculated costs
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: "application/json",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "stone-cad-project.json";
    link.click();
    updateStatus("Project saved successfully!");
  };

  const handleExportPDF = () => {
    updateStatus("Exporting to PDF...");
    const pdfCanvas = document.createElement("canvas");
    pdfCanvas.width = 800;
    pdfCanvas.height = 600;
    const pdfCtx = pdfCanvas.getContext("2d");

    if (pdfCtx) {
      pdfCtx.fillStyle = "#ffffff";
      pdfCtx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);
      pdfCtx.fillStyle = "#333333";
      pdfCtx.font = "bold 24px Arial";
      pdfCtx.fillText("Stone CAD Project Export", 50, 50);

      pdfCtx.font = "16px Arial";
      pdfCtx.fillText(`Material: ${currentMaterial.name}`, 50, 100);
      pdfCtx.fillText(
        `Dimensions: ${currentConfig.dimensions.length} × ${currentConfig.dimensions.width} × ${currentConfig.dimensions.thickness} cm`,
        50,
        130
      );
      pdfCtx.fillText(
        `Quantity: ${currentConfig.dimensions.quantity}`,
        50,
        160
      );

      // Add more details if needed (costs, etc.)
      pdfCtx.fillText(`Total Cost: €${costs.totalCost.toFixed(2)}`, 50, 190);


      pdfCanvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "stone-cad-project-summary.png"; // More accurate filename
          link.click();
          updateStatus("Project summary image exported successfully!");
        } else {
          updateStatus("Failed to create blob for image export.", "error");
        }
      }, "image/png");
    } else {
      updateStatus("Failed to get canvas context for image export.", "error");
    }
  };


  return (
    <div className="app-container bg-background text-text font-base">
      {/* Header */}
      <header className="app-header bg-surface border-b border-border shadow-sm sticky top-0 z-[100]">
        <div className="container header-content flex items-center justify-between py-16 px-16"> {/* Added px-16 for container padding */}
          <div className="logo">
            <h1 className="text-primary text-2xl font-bold m-0">
              Stone CAD Pro
            </h1>
          </div>
          <nav className="main-nav flex gap-8">
            {["Dashboard", "New Project", "Material Library", "Export", "Tools", "Settings"].map((item) => (
              <button
                key={item}
                className={`nav-btn ${item === "New Project" ? "nav-btn--active" : ""}
                                bg-none border-none py-8 px-16 rounded-base text-md font-medium
                                text-text-secondary cursor-pointer transition-all duration-normal ease-standard
                                hover:bg-secondary hover:text-text`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main flex-1 py-24">
        <div className="container px-16"> {/* Added px-16 for container padding */}
          <div className="workspace grid grid-cols-[320px_1fr_300px] gap-24 min-h-[800px] lg:grid-cols-[280px_1fr_280px] lg:gap-16 md:grid-cols-1 md:gap-16">
            {/* Left Panel: Configuration */}
            <div className="left-panel bg-surface rounded-lg border border-card-border p-20 overflow-y-auto max-h-screen md:order-1 md:p-16 sm:p-12">
              {/* Project Type Selection */}
              <div className="config-section mb-24">
                <h3 className="text-text text-lg font-semibold mb-16 border-b-2 border-primary pb-8">
                  Project Type
                </h3>
                <div className="project-types grid grid-cols-2 gap-8 sm:grid-cols-1">
                  {[
                    { type: "kitchen", icon: "🍳", text: "Kitchen Countertop" },
                    { type: "bathroom", icon: "🚿", text: "Bathroom Vanity" },
                    { type: "stepeniste", icon: "🪜", text: "Stepeništa" },
                    { type: "pragovi", icon: "🚪", text: "Pragovi" },
                  ].map((pt) => (
                    <button
                      key={pt.type}
                      className={`project-type-btn bg-surface border border-border rounded-base p-12 cursor-pointer transition-all duration-normal ease-standard text-center flex flex-col items-center gap-4 hover:bg-secondary hover:border-primary ${currentConfig.projectType === pt.type ? "project-type-btn--active bg-primary text-btn-primary-text border-primary" : ""}`}
                      onClick={() => updateDimensionsForProjectType(pt.type)}
                    >
                      <span className="icon text-2xl">{pt.icon}</span>
                      <span className="text text-sm font-medium">{pt.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stone Material Selection */}
              <div className="config-section mb-24">
                <h3 className="text-text text-lg font-semibold mb-16 border-b-2 border-primary pb-8">
                  Stone Material
                </h3>
                <div className="material-grid grid grid-cols-2 gap-8 sm:grid-cols-1">
                  {Object.entries(stoneData).map(([key, mat]) => (
                    <div
                      key={key}
                      className={`material-card bg-surface border border-border rounded-base p-8 cursor-pointer transition-all duration-normal ease-standard hover:border-primary hover:shadow-md ${currentConfig.material === key ? "material-card--active border-primary shadow-md bg-primary text-btn-primary-text" : ""}`}
                      onClick={() => setCurrentConfig((prev) => ({ ...prev, material: key }))}
                    >
                      <div
                        className="material-preview w-full h-[40px] rounded-sm border border-border mb-8"
                        style={{ backgroundColor: mat.color }}
                      ></div>
                      <div className="material-info">
                        <h4 className="text-sm font-semibold m-0 mb-2">
                          {mat.name}
                        </h4>
                        <p className={`text-xs ${currentConfig.material === key ? 'text-btn-primary-text opacity-90' : 'text-text-secondary'} m-0`}>
                          €{mat.price}/m²
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Surface Finish */}
              <div className="config-section mb-24">
                <h3 className="text-text text-lg font-semibold mb-16 border-b-2 border-primary pb-8">
                  Surface Finish
                </h3>
                <select
                  className="form-control block w-full py-8 px-12 text-md leading-normal text-text bg-surface border border-border rounded-base transition-all duration-fast ease-standard focus:border-primary focus:outline focus:outline-primary focus:outline-2"
                  id="surfaceFinish"
                  value={currentConfig.surface}
                  onChange={(e) => setCurrentConfig((prev) => ({ ...prev, surface: e.target.value }))}
                >
                  {Object.entries(surfaceFinishes).map(([key, sf]) => (
                    <option key={key} value={key}>
                      {sf.name} - €{sf.price}/m²
                    </option>
                  ))}
                </select>
              </div>

              {/* Edge Processing */}
              <div className="config-section mb-24">
                <h3 className="text-text text-lg font-semibold mb-16 border-b-2 border-primary pb-8">
                  Edge Processing
                </h3>
                <select
                  className="form-control block w-full py-8 px-12 text-md leading-normal text-text bg-surface border border-border rounded-base transition-all duration-fast ease-standard focus:border-primary focus:outline focus:outline-primary focus:outline-2"
                  id="edgeProcessing"
                  value={currentConfig.edge}
                  onChange={(e) => setCurrentConfig((prev) => ({ ...prev, edge: e.target.value }))}
                >
                  {Object.entries(edgeProcessing).map(([key, ep]) => (
                    <option key={key} value={key}>
                      {ep.name} - €{ep.price}/m
                    </option>
                  ))}
                </select>
              </div>

              {/* Dimensions */}
              <div className="config-section">
                <h3 className="text-text text-lg font-semibold mb-16 border-b-2 border-primary pb-8">
                  Dimensions
                </h3>
                <div className="dimension-controls flex flex-col gap-16">
                  {(Object.keys(currentConfig.dimensions) as Array<keyof Dimensions>).map((dimKey) => (
                    <div className="dimension-group flex flex-col gap-4" key={dimKey}>
                      <label className="text-sm font-medium text-text">
                        {dimKey.charAt(0).toUpperCase() + dimKey.slice(1)}:{" "}
                        <span id={`${dimKey}Value`}>
                          {currentConfig.dimensions[dimKey]}
                        </span>{" "}
                        {dimKey === "quantity" ? "" : "cm"}
                      </label>
                      <input
                        type="range"
                        className="dimension-slider w-full h-[6px] bg-secondary rounded-sm outline-none cursor-pointer appearance-none"
                        id={`${dimKey}Slider`}
                        min={dimKey === "quantity" ? 1 : (dimKey === 'thickness' ? 1 : (dimKey === 'width' ? 20 : 50))}
                        max={dimKey === "quantity" ? 10 : (dimKey === 'thickness' ? 10 : (dimKey === 'width' ? 200 : 500))}
                        value={currentConfig.dimensions[dimKey]}
                        onChange={(e) => handleDimensionChange(dimKey, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center Panel: 3D Visualization & Technical Drawing */}
            <div className="center-panel flex flex-col gap-16 md:order-2">
              <div className="viewer-container bg-surface rounded-lg border border-card-border overflow-hidden">
                <div className="viewer-header flex justify-between items-center p-16 bg-secondary border-b border-border sm:flex-col sm:gap-8 sm:items-start">
                  <h3 className="text-text text-lg font-semibold m-0">
                    3D Preview
                  </h3>
                  <div className="view-controls flex gap-8 sm:w-full sm:justify-between">
                    {["isometric", "front", "top", "side"].map((view) => (
                      <button
                        key={view}
                        className={`view-btn bg-none border border-border py-4 px-8 rounded-sm text-sm text-text cursor-pointer transition-all duration-normal ease-standard hover:bg-secondary hover:border-primary ${currentConfig.view === view ? "view-btn--active bg-primary text-btn-primary-text border-primary" : ""}`}
                        onClick={() => setCurrentConfig((prev) => ({ ...prev, view }))}
                      >
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="viewer relative h-[400px] flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 sm:h-[300px]">
                  <canvas
                    id="canvas3D"
                    ref={canvas3DRef}
                    width="600"
                    height="400"
                    className="border border-border rounded-base bg-white shadow-lg sm:w-full sm:max-w-[400px] sm:h-[250px]"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp} // Stop dragging if mouse leaves canvas
                  ></canvas>
                  <div className="viewer-overlay absolute top-16 left-16 bg-black bg-opacity-80 text-white py-8 px-12 rounded-base text-sm font-medium">
                    <span id="displayLength">
                      {currentConfig.dimensions.length}cm
                    </span>{" "}
                    ×{" "}
                    <span id="displayWidth">
                      {currentConfig.dimensions.width}cm
                    </span>{" "}
                    ×{" "}
                    <span id="displayThickness">
                      {currentConfig.dimensions.thickness}cm
                    </span>
                  </div>
                </div>
              </div>

              <div className="drawing-container bg-surface rounded-lg border border-card-border overflow-hidden">
                <div className="drawing-header flex justify-between items-center p-16 bg-secondary border-b border-border sm:flex-col sm:gap-8 sm:items-start">
                  <h3 className="text-text text-lg font-semibold m-0">
                    Technical Drawing
                  </h3>
                  <div className="drawing-controls flex gap-8 sm:w-full sm:justify-between">
                    <button
                      className="btn btn--sm btn--secondary py-4 px-12 text-sm rounded-sm bg-secondary text-text hover:bg-secondary-hover active:bg-secondary-active"
                      id="generateDrawing"
                      onClick={handleGenerateTechnicalDrawing}
                    >
                      Generate Drawing
                    </button>
                    <button
                      className="btn btn--sm btn--secondary py-4 px-12 text-sm rounded-sm bg-secondary text-text hover:bg-secondary-hover active:bg-secondary-active"
                      id="downloadDrawing"
                      onClick={handleDownloadDrawing}
                    >
                      Download PNG
                    </button>
                  </div>
                </div>
                <div className="drawing-viewer h-[300px] flex items-center justify-center bg-surface sm:h-[200px]">
                  <canvas
                    id="canvas2D"
                    ref={canvas2DRef}
                    width="600"
                    height="300"
                    className="border border-border rounded-base bg-white shadow-lg sm:w-full sm:max-w-[400px] sm:h-[200px]"
                  ></canvas>
                </div>
              </div>
            </div>

            {/* Right Panel: Calculations & Properties */}
            <div className="right-panel flex flex-col gap-16 md:order-3 md:grid md:grid-cols-2 md:gap-16 sm:grid-cols-1">
              <div className="calc-section bg-surface rounded-lg border border-card-border p-16 sm:p-12">
                <h3 className="text-text text-lg font-semibold m-0 mb-12 border-b-2 border-primary pb-8">
                  Material Properties
                </h3>
                <div className="property-grid flex flex-col gap-8">
                  {[
                    { label: "Density:", value: `${currentMaterial.density} kg/m³`, id: "materialDensity" },
                    { label: "Strength:", value: `${currentMaterial.strength} MPa`, id: "materialStrength" },
                    { label: "Material:", value: currentMaterial.name, id: "materialName" },
                  ].map((item) => (
                    <div key={item.id} className="property-item flex justify-between items-center py-6 px-6 bg-secondary rounded-sm">
                      <span className="property-label text-sm text-text-secondary font-medium">{item.label}</span>
                      <span className="property-value text-sm text-text font-semibold" id={item.id}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="material-description mt-12 p-8 bg-secondary rounded-sm border-l-4 border-primary">
                  <p id="materialDescription" className="text-sm text-text-secondary m-0 leading-normal">
                    {currentMaterial.description}
                  </p>
                </div>
              </div>

              <div className="calc-section bg-surface rounded-lg border border-card-border p-16 sm:p-12">
                <h3 className="text-text text-lg font-semibold m-0 mb-12 border-b-2 border-primary pb-8">
                  Calculations
                </h3>
                <div className="calc-grid flex flex-col gap-8">
                  {[
                    { label: "Volume:", value: `${calculations.volume.toFixed(3)} m³`, id: "calcVolume" },
                    { label: "Surface Area:", value: `${calculations.surfaceArea.toFixed(2)} m²`, id: "calcSurfaceArea" },
                    { label: "Edge Length:", value: `${calculations.edgeLength.toFixed(2)} m`, id: "calcEdgeLength" },
                    { label: "Weight:", value: `${calculations.weight.toFixed(0)} kg`, id: "calcWeight" },
                  ].map((item) => (
                    <div key={item.id} className="calc-item flex justify-between items-center py-6 px-6 bg-secondary rounded-sm">
                      <span className="calc-label text-sm text-text-secondary font-medium">{item.label}</span>
                      <span className="calc-value text-sm text-text font-semibold" id={item.id}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="calc-section bg-surface rounded-lg border border-card-border p-16 sm:p-12">
                <h3 className="text-text text-lg font-semibold m-0 mb-12 border-b-2 border-primary pb-8">
                  Cost Breakdown
                </h3>
                <div className="cost-grid flex flex-col gap-8">
                  {[
                    { label: "Material Cost:", value: `€${costs.materialCost.toFixed(2)}`, id: "costMaterial" },
                    { label: "Surface Processing:", value: `€${costs.surfaceCost.toFixed(2)}`, id: "costSurface" },
                    { label: "Edge Processing:", value: `€${costs.edgeCost.toFixed(2)}`, id: "costEdge" },
                  ].map((item) => (
                    <div key={item.id} className="cost-item flex justify-between items-center py-6 px-6 bg-secondary rounded-sm">
                      <span className="cost-label text-sm text-text-secondary font-medium">{item.label}</span>
                      <span className="cost-value text-sm text-text font-semibold" id={item.id}>{item.value}</span>
                    </div>
                  ))}
                  <div className="cost-item cost-total flex justify-between items-center bg-primary text-btn-primary-text font-bold mt-8 p-10 rounded-sm">
                    <span className="cost-label text-btn-primary-text text-md">Total Cost:</span>
                    <span className="cost-value text-btn-primary-text text-md" id="costTotal">
                      €{costs.totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="calc-section bg-surface rounded-lg border border-card-border p-16 sm:p-12">
                <h3 className="text-text text-lg font-semibold m-0 mb-12 border-b-2 border-primary pb-8">
                  Export Options
                </h3>
                <div className="export-buttons flex flex-col gap-8">
                  <button
                    className="btn btn--primary btn--full-width py-8 px-16 rounded-base text-base font-medium cursor-pointer transition-all duration-normal ease-standard border-none w-full bg-primary text-btn-primary-text hover:bg-primary-hover active:bg-primary-active"
                    id="generate3D"
                    onClick={() => updateStatus("3D Model generation initiated (simulated).")}
                  >
                    Generate 3D Model (Simulated)
                  </button>
                  <button
                    className="btn btn--secondary btn--full-width py-8 px-16 rounded-base text-base font-medium cursor-pointer transition-all duration-normal ease-standard border-none w-full bg-secondary text-text hover:bg-secondary-hover active:bg-secondary-active"
                    id="generateTechnical"
                     onClick={handleGenerateTechnicalDrawing}
                  >
                    Generate Technical Drawing
                  </button>
                  <button
                    className="btn btn--secondary btn--full-width py-8 px-16 rounded-base text-base font-medium cursor-pointer transition-all duration-normal ease-standard border-none w-full bg-secondary text-text hover:bg-secondary-hover active:bg-secondary-active"
                    id="exportPDF"
                    onClick={handleExportPDF}
                  >
                    Export Project Summary (PNG)
                  </button>
                  <button
                    className="btn btn--outline btn--full-width py-8 px-16 rounded-base text-base font-medium cursor-pointer transition-all duration-normal ease-standard border bg-transparent border-border text-text hover:bg-secondary w-full"
                    id="saveProject"
                    onClick={handleSaveProject}
                  >
                    Save Project (JSON)
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="status-section mt-16 md:col-span-2 sm:col-span-1">
                <div
                  className={`status status--${statusType} inline-flex items-center py-6 px-12 rounded-full font-medium text-sm`}
                  id="statusIndicator"
                >
                  {status}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoneCadApp;
