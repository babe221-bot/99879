"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'; // Added useRef
import { PDFDocument, StandardFonts, rgb, PageSizes, PDFFont } from 'pdf-lib'; // Added PageSizes, PDFFont
import Scene, {
  HighlightedFaceGroup,
  ProcessingID,
  EdgeProcessableGroup
} from "@/components/3d/Scene";
import DrawingCanvas, { DrawingViewType } from '@/components/2d/DrawingCanvas';
import WorkOrderForm, { WorkOrderData } from '@/components/configurator/WorkOrderForm';
import { StoneComponentData, createNewComponent as createNewStoneComponent } from '@/components/configurator/StoneComponentConfig';
import WorkOrderList from '@/components/configurator/WorkOrderList';
import {
  sampleEdgeProcessingDefinitions,
  sampleFaceProcessingDefinitions,
  sampleStoneTypes,
  samplePalletTypes,
  PalletType,
} from '@/data/sampleData';
import {
  AppliedEdgeProcessingConfig,
  AppliedFaceProcessingConfig,
  BoxFaceName,
  LogisticsInfo,
} from '@/types/stoneData';
import { useAuth } from '@/context/AuthContext';
import {
  saveWorkOrder as saveWorkOrderToFirestore,
  updateWorkOrder as updateWorkOrderInFirestore,
  listUserWorkOrders as fetchUserWorkOrdersFromDb,
  getWorkOrder as getWorkOrderFromDb,
  deleteWorkOrder as deleteWorkOrderFromDb
} from '@/lib/firestoreService';
import { fabric } from 'fabric'; // For 2D canvas ref typing

const PIXELS_PER_UNIT = 100;

const calculateVolume = (w: number, h: number, d: number): number => w * h * d;
const calculateFaceAreas = (w: number, h: number, d: number): Record<BoxFaceName, number> => ({
  TOP: w * d, BOTTOM: w * d, FRONT: w * h, BACK: w * h, LEFT: d * h, RIGHT: d * h,
});
const calculateEdgeGroupLengths = (w: number, h: number, d: number): Record<EdgeProcessableGroup, number> => ({
  TOP: 2 * (w + d), BOTTOM: 2 * (w + d), SIDES_FRONT_BACK: 2 * (w + h), SIDES_LEFT_RIGHT: 2 * (d + h),
});

const btnBase = "px-3 py-1.5 text-xs rounded transition-colors duration-150 ease-in-out";
const btnPrimary = `${btnBase} bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed`;
const btnSecondary = `${btnBase} bg-gray-500 hover:bg-gray-600 text-white disabled:bg-gray-300`;
const btnDanger = `${btnBase} bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400`;
const btnGreen = `${btnBase} bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-400`;
const btnIndigo = `${btnBase} bg-indigo-500 hover:bg-indigo-600 text-white disabled:bg-gray-400`;
const btnPurple = `${btnBase} bg-purple-500 hover:bg-purple-600 text-white`;


export default function HomePage() {
  const { currentUser, signInWithGoogle, signOutUser, loading: authLoading } = useAuth();
  const [wireframeMode, setWireframeMode] = useState(false);

  const [activeVisualizedComponent, setActiveVisualizedComponent] = useState<StoneComponentData | null>(() => createNewStoneComponent(0));

  const [edgeProcessingConfig, setEdgeProcessingConfig] = useState<AppliedEdgeProcessingConfig>({});
  const [activeEdgeGroup, setActiveEdgeGroup] = useState<EdgeProcessableGroup | 'NONE'>('NONE');
  const [selectedEdgeProcId, setSelectedEdgeProcId] = useState<ProcessingID>(
    sampleEdgeProcessingDefinitions.find(p => p.type === 'CHAMFER')?.id || sampleEdgeProcessingDefinitions[0].id
  );

  const [faceProcessingConfig, setFaceProcessingConfig] = useState<AppliedFaceProcessingConfig>({});
  const [activeClickedFace, setActiveClickedFace] = useState<BoxFaceName | 'NONE'>('NONE');
  const [selectedFaceProcId, setSelectedFaceProcId] = useState<ProcessingID>(
    sampleFaceProcessingDefinitions[0]?.id || ''
  );
  const [current2DView, setCurrent2DView] = useState<DrawingViewType>('front');

  const [currentWorkOrder, setCurrentWorkOrder] = useState<WorkOrderData | null>(null);
  const [userWorkOrders, setUserWorkOrders] = useState<WorkOrderData[]>([]);
  const [isLoadingWOList, setIsLoadingWOList] = useState(false);
  const [isLoadingSpecificWO, setIsLoadingSpecificWO] = useState(false);
  const [isSavingWO, setIsSavingWO] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [workOrderFormKey, setWorkOrderFormKey] = useState(Date.now());

  const fabric2DCanvasRef = useRef<fabric.Canvas | null>(null);
  const threeJsCanvasElementRef = useRef<HTMLCanvasElement | null>(null); // Ref for Three.js <canvas> DOM element
  const [captured3DViewImage, setCaptured3DViewImage] = useState<string | null>(null);

  const [selectedPalletForInfo, setSelectedPalletForInfo] = useState<PalletType | null>(
    samplePalletTypes[0] || null
  );

  const fetchUserWorkOrdersList = useCallback(async () => { /* ... as before ... */ }, [currentUser]);
  useEffect(() => { fetchUserWorkOrdersList(); }, [fetchUserWorkOrdersList]);

  const handleActiveComponentChange = useCallback((component: StoneComponentData | null) => { /* ... as before ... */
    setActiveVisualizedComponent(component);
    setEdgeProcessingConfig(component?.edgeProcessingConfig || {});
    setFaceProcessingConfig(component?.faceProcessingConfig || {});
    setActiveEdgeGroup('NONE');
    setActiveClickedFace('NONE');
    setCaptured3DViewImage(null); // Clear 3D capture when component changes
  }, []);

  const handleActiveComponentProcessingUpdate = useCallback((edgeConfig: AppliedEdgeProcessingConfig, faceConfig: AppliedFaceProcessingConfig) => { /* ... as before ... */ }, []);
  const handle3DBlockClick = (group: HighlightedFaceGroup, faceName?: BoxFaceName) => { /* ... as before ... */ };
  const applyEdgeProc = () => { /* ... as before ... */ };
  const clearEdgeProc = () => { /* ... */ };
  const applyFaceProc = () => { /* ... */ };
  const clearFaceProc = () => { /* ... */ };

  const edgeProcessingOptions = sampleEdgeProcessingDefinitions.map(p => ({id: p.id, name: p.name, type: p.type}));
  const chamferOpts = edgeProcessingOptions.filter(p => p.type === 'CHAMFER');
  const roundOpts = edgeProcessingOptions.filter(p => p.type === 'ROUND');
  const deburrOpts = edgeProcessingOptions.filter(p => p.type === 'DEBURR');
  const faceOpts = sampleFaceProcessingDefinitions;

  const handleSaveWorkOrder = async (workOrderDataFromForm: WorkOrderData) => { /* ... as before ... */ };
  const handleLoadWorkOrder = async (workOrderId: string) => { /* ... as before ... */ };
  const handleNewWorkOrder = () => { /* ... as before ... */
    setCurrentWorkOrder(null);
    handleActiveComponentChange(createNewStoneComponent(0));
    setWorkOrderFormKey(Date.now());
    setSelectedPalletForInfo(samplePalletTypes[0] || null);
    setCaptured3DViewImage(null); // Clear 3D capture
  };

  const calculatedCosts = useMemo(() => { /* ... as before ... */ return { material: 0, edge: 0, face: 0, total: 0 };}, [activeVisualizedComponent, edgeProcessingConfig, faceProcessingConfig]);
  const logisticsInfoDisplay = useMemo(() => { /* ... as before ... */ return { weight: "N/A", fits: "N/A", palletLoad: "N/A", notes: "" };}, [activeVisualizedComponent, selectedPalletForInfo, currentWorkOrder]);

  const capture3DView = () => {
    if (threeJsCanvasElementRef.current) {
      // Ensure the scene has rendered any recent changes
      // This might need a slight delay or a callback after render if using r3f's render loop manually
      // For now, assume it's rendered.
      const dataUrl = threeJsCanvasElementRef.current.toDataURL('image/png');
      setCaptured3DViewImage(dataUrl);
      alert("3D View captured for PDF report.");
    } else {
      alert("3D Scene canvas not available yet.");
    }
  };

  const generatePdfReport = async () => {
    if (!currentWorkOrder) { alert("Please 'Save Work Order' first..."); return; }
    if (!currentUser) { alert("Please sign in to download reports."); return; }
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);
    try {
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage(PageSizes.A4);
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      let y = pageHeight - 40;
      const margin = 40;
      const contentWidth = pageWidth - 2 * margin;

      const drawLine = (text: string, size = 10, isBold = false, indent = 0) => {
        if (y < margin + size) {
            page = pdfDoc.addPage(PageSizes.A4); y = pageHeight - margin;
        }
        page.drawText(text, { x: margin + indent, y, size, font: isBold ? boldFont : font, color: rgb(0,0,0), lineHeight: size * 1.2 });
        y -= (size * 1.4);
      };

      // --- PDF Content ---
      drawLine(`Radni Nalog: ${currentWorkOrder.projectName}`, 14, true); y -= 5;
      // ... (Work order details as before) ...

      // Add captured 3D view if available
      if (captured3DViewImage) {
        try {
          const pngImage = await pdfDoc.embedPng(captured3DViewImage);
          const pngDims = pngImage.scale(0.20); // Scale to 20%
          if (y < pngDims.height + 20) { page = pdfDoc.addPage(PageSizes.A4); y = pageHeight - margin; }
          page.drawImage(pngImage, {
            x: margin,
            y: y - pngDims.height,
            width: pngDims.width,
            height: pngDims.height,
          });
          y -= (pngDims.height + 10);
          drawLine("3D Prikaz (snimak)", 8, false);
          y -= 5;
        } catch(e) { console.error("Error embedding 3D image:", e); drawLine("Greška pri dodavanju 3D slike.", 8, false); }
      }


      let overallTotalCost = 0;
      for (const [index, comp] of currentWorkOrder.components.entries()) {
        if (index > 0) {y -= 10; page.drawLine({start:{x:margin,y:y+5}, end:{x:pageWidth-margin,y:y+5}, thickness:0.5, color:rgb(0.7,0.7,0.7)});y-=5;}

        // Add 2D Drawing for this component
        if (fabric2DCanvasRef.current && activeVisualizedComponent?.id === comp.id) { // Only for active one for now
            // Ensure this canvas shows the 'front' view for the PDF, or make it configurable
            // For simplicity, using current2DView
            const currentFabricCanvas = fabric2DCanvasRef.current;
            const originalBg = currentFabricCanvas.backgroundColor;
            currentFabricCanvas.setBackgroundColor('white', currentFabricCanvas.renderAll.bind(currentFabricCanvas));
            const dataUrl = currentFabricCanvas.toDataURL({ format: 'png', quality: 0.8 });
            currentFabricCanvas.setBackgroundColor(originalBg || '#f8f8f8', currentFabricCanvas.renderAll.bind(currentFabricCanvas));

            try {
                const pngImage = await pdfDoc.embedPng(dataUrl);
                const pngDims = pngImage.scale(0.35); // Scale to fit
                if (y < pngDims.height + 20) { page = pdfDoc.addPage(PageSizes.A4); y = pageHeight - margin; }
                page.drawImage(pngImage, {
                    x: pageWidth - margin - pngDims.width, // Align right
                    y: y - pngDims.height,
                    width: pngDims.width,
                    height: pngDims.height,
                });
                y -= (pngDims.height + 10); // Adjust y after drawing image
                drawLine(`2D Tehnički Crtež (${current2DView} pogled)`, 8, false, pageWidth - margin - pngDims.width - 50);
            } catch(e) { console.error("Error embedding 2D image:", e); drawLine("Greška pri dodavanju 2D slike.", 8, false);}
        }


        const stone = sampleStoneTypes.find(s => s.id === comp.stoneTypeId);
        drawLine(`Komponenta ${index + 1}: ${comp.name}`, 12, true);
        // ... (rest of component details, processing, costs as before) ...
        let compMaterialCost = 0; let componentWeightKg = 0;
        if (stone) { /* ... */ }
        drawLine(`  Procijenjena Težina: ${componentWeightKg.toFixed(2)} kg`, 10, false, 10);
        // ... (edge/face processing details) ...
        const componentTotalCost = compMaterialCost + 0 + 0; // Replace with actual edge/face cost calc for this comp
        overallTotalCost += componentTotalCost;
        drawLine(`  Trošak Komponente: ${componentTotalCost.toFixed(2)} €`, 10, true, 10);
        y -= 5;
      }
      // ... (Logistics and Total WO Cost as before) ...
      // ... (PDF save logic as before) ...
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `RadniNalog_${currentWorkOrder.projectName.replace(/\s+/g, '_') || 'izvjestaj'}.pdf`;
      link.click(); URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert(`Failed to generate PDF report: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setIsGeneratingPDF(false);
    }
  };


  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <div className="w-full max-w-screen-2xl mx-auto">
        <header className="py-3 mb-4 text-center flex justify-between items-center">
          <h1 className="text-3xl md:text-4xl font-bold">Stone Configurator</h1>
          <div className="flex items-center space-x-2">
            <button onClick={() => setWireframeMode(w => !w)} className={`${btnPurple} text-xs`}>
                {wireframeMode ? "Solid View" : "Wireframe View"}
            </button>
            <button onClick={capture3DView} className={`${btnSecondary} text-xs`} title="Capture current 3D view for PDF">
                Prepare 3D for PDF
            </button>
            {authLoading ? ( <span className="text-xs text-gray-500">Auth...</span> )
              : currentUser ? ( /* ... auth UI ... */ )
              : ( <button onClick={signInWithGoogle} className={`${btnPrimary} text-xs`}>Sign In</button> )}
            <button
              onClick={generatePdfReport}
              disabled={!currentWorkOrder || !currentUser || isGeneratingPDF }
              title={!currentUser ? "Sign in" : (!currentWorkOrder ? "Save WO first" : "PDF Report")}
              className={`${btnPrimary} text-sm px-4 py-2`}
            >
              {isGeneratingPDF ? "Generating..." : "PDF Report"}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* ... WorkOrderList and WorkOrderForm ... */}
            <WorkOrderList
                onLoadWorkOrder={handleLoadWorkOrder}
                onNewWorkOrder={handleNewWorkOrder}
                currentWorkOrderId={currentWorkOrder?.id}
                isLoading={isLoadingWOList || isLoadingSpecificWO}
            />
            <WorkOrderForm
              key={workOrderFormKey}
              initialData={currentWorkOrder || undefined}
              onSave={handleSaveWorkOrder}
              onActiveComponentChange={handleActiveComponentChange}
              activeComponentEdgeProcessing={edgeProcessingConfig}
              activeComponentFaceProcessing={faceProcessingConfig}
              onActiveComponentProcessingUpdate={handleActiveComponentProcessingUpdate}
              isSaving={isSavingWO}
            />
            {/* ... Cost and Logistics Sections ... */}
          </div>

          <div className="lg:col-span-5 xl:col-span-6 flex flex-col gap-4">
             <div className="w-full min-h-[50vh] rounded-lg shadow-xl overflow-hidden bg-gray-700 relative">
              {activeVisualizedComponent && (
                <Scene
                  key={activeVisualizedComponent.id + /* ... */ + (currentWorkOrder?.id || 'new')}
                  componentSize={[activeVisualizedComponent.width, activeVisualizedComponent.height, activeVisualizedComponent.depth]}
                  componentStoneType={activeVisualizedComponent.stoneTypeId}
                  currentEdgeProcessingConfig={edgeProcessingConfig}
                  currentFaceProcessingConfig={faceProcessingConfig}
                  onFaceClickForSelection={handle3DBlockClick}
                  wireframeMode={wireframeMode}
                  onCanvasRef={(canvasElem) => threeJsCanvasElementRef.current = canvasElem} // Pass ref setter
                />
              )}
               {isLoadingSpecificWO && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white z-10">Loading 3D View...</div>}
            </div>
            <section className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">2D Technical Drawing</h2>
                <div className="space-x-1">
                  {(['front', 'top', 'side'] as DrawingViewType[]).map(vType => (
                    <button key={vType} onClick={() => setCurrent2DView(vType)}
                      className={`px-2 py-1 text-xs rounded ${current2DView === vType ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>
                      {vType.charAt(0).toUpperCase() + vType.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-center items-center border border-gray-200 dark:border-gray-700 p-1 rounded min-h-[300px]">
                {activeVisualizedComponent && (
                  <DrawingCanvas
                    stoneWidth={activeVisualizedComponent.width}
                    stoneHeight={activeVisualizedComponent.height}
                    stoneDepth={activeVisualizedComponent.depth}
                    edgeProcessingConfig={edgeProcessingConfig}
                    pixelsPerUnit={PIXELS_PER_UNIT}
                    viewType={current2DView}
                    canvasWidth={450} canvasHeight={300}
                    onCanvasReady={(canvasInstance) => fabric2DCanvasRef.current = canvasInstance} // Set ref
                  />
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-3 xl:col-span-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-300 dark:divide-gray-700">
            {/* ... Edge & Face Processing sections ... */}
          </div>
        </div>

        <div className="mt-2 p-1 text-xs text-center text-gray-500 dark:text-gray-400">
          Note: CSG for edges & multi-material for faces are experimental. Save is simulated. Cost calc for edges is simplified. PDF visuals are basic.
        </div>
      </div>
    </main>
  );
}
