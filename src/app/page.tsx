"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import Scene, {
  HighlightedFaceGroup,
  ProcessingID,
  EdgeProcessableGroup
} from "@/components/3d/Scene";
import DrawingCanvas, { DrawingViewType } from '@/components/2d/DrawingCanvas';
import WorkOrderForm, { WorkOrderData } from '@/components/configurator/WorkOrderForm';
import { StoneComponentData } from '@/components/configurator/StoneComponentConfig';
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

const PIXELS_PER_UNIT = 100;

const calculateVolume = (w: number, h: number, d: number): number => w * h * d;
const calculateFaceAreas = (w: number, h: number, d: number): Record<BoxFaceName, number> => ({
  TOP: w * d, BOTTOM: w * d, FRONT: w * h, BACK: w * h, LEFT: d * h, RIGHT: d * h,
});
const calculateEdgeGroupLengths = (w: number, h: number, d: number): Record<EdgeProcessableGroup, number> => ({
  TOP: 2 * (w + d), BOTTOM: 2 * (w + d), SIDES_FRONT_BACK: 2 * (w + h), SIDES_LEFT_RIGHT: 2 * (d + h),
});


export default function HomePage() {
  const { currentUser, signInWithGoogle, signOutUser, loading: authLoading } = useAuth();
  const [wireframeMode, setWireframeMode] = useState(false);

  const [activeVisualizedComponent, setActiveVisualizedComponent] = useState<StoneComponentData | null>(() => ({
    id: `comp_initial_${Date.now()}`, name: "Main Component",
    stoneTypeId: sampleStoneTypes[0]?.id || "",
    width: 1.5, height: 1.5, depth: 1.0,
    edgeProcessingConfig: {},
    faceProcessingConfig: {},
  }));

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

  const [selectedPalletForInfo, setSelectedPalletForInfo] = useState<PalletType | null>(
    samplePalletTypes[0] || null
  );

  const handleActiveComponentChange = useCallback((component: StoneComponentData | null) => {
    setActiveVisualizedComponent(component);
    setEdgeProcessingConfig(component?.edgeProcessingConfig || {});
    setFaceProcessingConfig(component?.faceProcessingConfig || {});
    setActiveEdgeGroup('NONE');
    setActiveClickedFace('NONE');
  }, []);

  const handleActiveComponentProcessingUpdate = useCallback((edgeConfig: AppliedEdgeProcessingConfig, faceConfig: AppliedFaceProcessingConfig) => {
      setEdgeProcessingConfig(edgeConfig);
      setFaceProcessingConfig(faceConfig);
  }, []);

  const handle3DBlockClick = (group: HighlightedFaceGroup, faceName?: BoxFaceName) => {
    setActiveEdgeGroup( (group !== 'ALL' && group !== 'NONE') ? group as EdgeProcessableGroup : 'NONE');
    setActiveClickedFace(faceName || 'NONE');
  };

  const applyEdgeProc = () => {
    if (activeEdgeGroup === 'NONE' || !selectedEdgeProcId || !activeVisualizedComponent) return;
    const newEdgeConfig = {
      ...(activeVisualizedComponent.edgeProcessingConfig || {}),
      [activeEdgeGroup]: edgeProcessingConfig[activeEdgeGroup] === selectedEdgeProcId
                         ? undefined : selectedEdgeProcId
    };
    setEdgeProcessingConfig(newEdgeConfig);
    setActiveVisualizedComponent(prev => prev ? {...prev, edgeProcessingConfig: newEdgeConfig} : null);
  };
  const clearEdgeProc = () => {
    setEdgeProcessingConfig({});
    setActiveVisualizedComponent(prev => prev ? {...prev, edgeProcessingConfig: {}} : null);
  };

  const applyFaceProc = () => {
    if (activeClickedFace === 'NONE' || !selectedFaceProcId || !activeVisualizedComponent) return;
    const newFaceConfig = {
      ...(activeVisualizedComponent.faceProcessingConfig || {}),
      [activeClickedFace]: faceProcessingConfig[activeClickedFace] === selectedFaceProcId
                           ? undefined : selectedFaceProcId
    };
    setFaceProcessingConfig(newFaceConfig);
    setActiveVisualizedComponent(prev => prev ? {...prev, faceProcessingConfig: newFaceConfig} : null);
  };
  const clearFaceProc = () => {
    setFaceProcessingConfig({});
    setActiveVisualizedComponent(prev => prev ? {...prev, faceProcessingConfig: {}} : null);
  };

  const chamferOpts = sampleEdgeProcessingDefinitions.filter(p => p.type === 'CHAMFER');
  const faceOpts = sampleFaceProcessingDefinitions;

  const handleSaveWorkOrder = (workOrderData: WorkOrderData) => {
    if (!currentUser) { alert("Please sign in to save work orders."); return; }
    const finalComponents = workOrderData.components.map(comp =>
      comp.id === activeVisualizedComponent?.id ?
      { ...activeVisualizedComponent, edgeProcessingConfig, faceProcessingConfig } : comp
    );
    const finalWorkOrderData = { ...workOrderData, components: finalComponents };
    console.log("Work Order to Save (user: " + currentUser.displayName + "):", finalWorkOrderData);
    setCurrentWorkOrder(finalWorkOrderData);
    const savedPallet = samplePalletTypes.find(p => p.id === finalWorkOrderData.logistics.selectedPalletId);
    setSelectedPalletForInfo(savedPallet || null);
    alert(`Work Order "${finalWorkOrderData.projectName}" (simulated save). Ready for PDF.`);
  };

  const calculatedCosts = useMemo(() => {
    if (!activeVisualizedComponent) return { material: 0, edge: 0, face: 0, total: 0 };
    const { width: w, height: h, depth: d, stoneTypeId } = activeVisualizedComponent;
    const stoneInfo = sampleStoneTypes.find(st => st.id === stoneTypeId);
    const volume = calculateVolume(w, h, d);
    const materialCost = stoneInfo ? volume * stoneInfo.priceEURPerM3 : 0;
    let edgeCost = 0;
    const currentEdgeConfig = edgeProcessingConfig;
    const edgeGroupLengths = calculateEdgeGroupLengths(w,h,d);
    for (const groupKey in currentEdgeConfig) {
      const groupId = groupKey as EdgeProcessableGroup;
      const procId = currentEdgeConfig[groupId];
      if (procId) {
        const procInfo = sampleEdgeProcessingDefinitions.find(p => p.id === procId);
        const length = groupId === 'TOP' ? (2*w + 2*d) : (groupId === 'BOTTOM' ? (2*w + 2*d) : 0);
        if (procInfo && length > 0) edgeCost += length * procInfo.priceEURPerMeter;
      }
    }
    let faceCost = 0;
    const currentFaceConfig = faceProcessingConfig;
    const faceAreas = calculateFaceAreas(w, h, d);
    for (const faceKey in currentFaceConfig) {
      const faceName = faceKey as BoxFaceName;
      const procId = currentFaceConfig[faceName];
      if (procId) {
        const procInfo = sampleFaceProcessingDefinitions.find(p => p.id === procId);
        const area = faceAreas[faceName];
        if (procInfo && area > 0) faceCost += area * procInfo.priceEURPerM2;
      }
    }
    return { material: materialCost, edge: edgeCost, face: faceCost, total: materialCost + edgeCost + faceCost };
  }, [activeVisualizedComponent, edgeProcessingConfig, faceProcessingConfig]);

  const logisticsInfoDisplay = useMemo(() => {
    if (!activeVisualizedComponent || !selectedPalletForInfo) {
      return { weight: "N/A", fits: "N/A", palletLoad: "N/A", notes: currentWorkOrder?.logistics.packingNotes || "" };
    }
    const { width, height, depth, stoneTypeId } = activeVisualizedComponent;
    const stoneInfo = sampleStoneTypes.find(st => st.id === stoneTypeId);
    if (!stoneInfo) return { weight: "N/A", fits: "N/A", palletLoad: "N/A", notes: currentWorkOrder?.logistics.packingNotes || "" };
    const volumeM3 = width * height * depth;
    const weightKg = volumeM3 * stoneInfo.densityKgM3;
    const compWidthMM = width * 1000;
    const compDepthMM = depth * 1000;
    let fits = "No";
    if ((compWidthMM <= selectedPalletForInfo.lengthMM && compDepthMM <= selectedPalletForInfo.widthMM) ||
        (compWidthMM <= selectedPalletForInfo.widthMM && compDepthMM <= selectedPalletForInfo.lengthMM)) {
      fits = "Yes";
    }
    const palletLoadInfo = `${weightKg.toFixed(1)} kg / ${selectedPalletForInfo.maxLoadKg} kg`;
    return {
      weight: `${weightKg.toFixed(1)} kg`, fits: fits, palletLoad: palletLoadInfo,
      notes: currentWorkOrder?.logistics.packingNotes || ""
    };
  }, [activeVisualizedComponent, selectedPalletForInfo, currentWorkOrder]);

  const generatePdfReport = async () => {
    if (!currentWorkOrder) {
      alert("Please 'Save Work Order' first to capture all component data for the PDF.");
      return;
    }
    if (!currentUser) {
        alert("Please sign in to download reports.");
        return;
    }
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let y = pageHeight - 40;
    const line = (text: string, size = 10, isBold = false, indent = 0) => {
      if (y < 40) {
          page = pdfDoc.addPage([595, 842]);
          y = pageHeight - 40;
      }
      page.drawText(text, { x: 50 + indent, y, size, font: isBold ? boldFont : font, color: rgb(0,0,0) });
      y -= (size * 1.4);
    };

    line(`Radni Nalog: ${currentWorkOrder.projectName}`, 14, true); y -= 5;
    line(`Klijent: ${currentWorkOrder.clientName}`, 11);
    line(`Datum: ${new Date(currentWorkOrder.date).toLocaleDateString('hr-HR')}`, 11);
    line(`Odgovorna Osoba: ${currentWorkOrder.responsiblePerson || 'N/A'}`, 11);
    line(`Izdao: ${currentUser.displayName || currentUser.email}`, 9);
    y -= 10;

    let overallTotalCost = 0;

    currentWorkOrder.components.forEach((comp, index) => {
      if (index > 0) {y -= 10; page.drawLine({start:{x:50,y:y+5}, end:{x:pageWidth-50,y:y+5}, thickness:0.5, color:rgb(0.7,0.7,0.7)});y-=5;}
      const stone = sampleStoneTypes.find(s => s.id === comp.stoneTypeId);
      line(`Komponenta ${index + 1}: ${comp.name}`, 12, true);
      line(`  Materijal: ${stone?.name || 'N/A'}`, 10, false, 10);
      line(`  Dimenzije (ŠxVxD): ${comp.width} x ${comp.height} x ${comp.depth} m`, 10, false, 10);

      let compMaterialCost = 0;
      let componentWeightKg = 0;
      if (stone) {
        const volume = calculateVolume(comp.width, comp.height, comp.depth);
        compMaterialCost = volume * stone.priceEURPerM3;
        componentWeightKg = volume * stone.densityKgM3;
        line(`  Procijenjena Težina: ${componentWeightKg.toFixed(2)} kg`, 10, false, 10); // Added weight here
      }

      let compEdgeCost = 0;
      const compEdgeLengths = calculateEdgeGroupLengths(comp.width, comp.height, comp.depth);
      if (comp.edgeProcessingConfig && Object.keys(comp.edgeProcessingConfig).length > 0) {
        line("  Obrada Ivica:", 10, true, 10);
        for (const group in comp.edgeProcessingConfig) {
          const procId = comp.edgeProcessingConfig[group as EdgeProcessableGroup];
          if (procId) {
            const procDef = sampleEdgeProcessingDefinitions.find(p => p.id === procId);
            line(`    - ${group}: ${procDef?.name || procId}`, 9, false, 20);
            const length = (group === 'TOP' || group === 'BOTTOM') ? compEdgeLengths[group as EdgeProcessableGroup] : 0;
            if (procDef && length > 0) compEdgeCost += length * procDef.priceEURPerMeter;
          }
        }
      } else { line("  Nema obrade ivica.", 9, false, 10); }

      let compFaceCost = 0;
      const compFaceAreas = calculateFaceAreas(comp.width, comp.height, comp.depth);
      if (comp.faceProcessingConfig && Object.keys(comp.faceProcessingConfig).length > 0) {
        line("  Obrada Lica:", 10, true, 10);
        for (const face in comp.faceProcessingConfig) {
          const procId = comp.faceProcessingConfig[face as BoxFaceName];
          if (procId) {
            const procDef = sampleFaceProcessingDefinitions.find(p => p.id === procId);
            line(`    - Lice ${face}: ${procDef?.name || procId}`, 9, false, 20);
            const area = compFaceAreas[face as BoxFaceName];
            if (procDef && area > 0) compFaceCost += area * procDef.priceEURPerM2;
          }
        }
      } else { line("  Nema obrade lica.", 9, false, 10); }

      const componentTotalCost = compMaterialCost + compEdgeCost + compFaceCost;
      overallTotalCost += componentTotalCost;
      line(`  Trošak Komponente: ${componentTotalCost.toFixed(2)} €`, 10, true, 10);
      y -= 5;
    });

    y -= 10;
    line("Logistika i Pakovanje:", 12, true);
    const selectedPallet = samplePalletTypes.find(p => p.id === currentWorkOrder?.logistics.selectedPalletId);
    line(`  Odabrana Paleta: ${selectedPallet?.name || "Nije odabrana"}`, 10, false, 10);
    line(`  Napomene za Pakovanje: ${currentWorkOrder?.logistics.packingNotes || "Nema napomena."}`, 10, false, 10);
    y -= 10;

    line(`UKUPNI TROŠAK RADNOG NALOGA: ${overallTotalCost.toFixed(2)} €`, 14, true);

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `RadniNalog_${currentWorkOrder.projectName.replace(/\s+/g, '_') || 'izvjestaj'}.pdf`;
    link.click(); URL.revokeObjectURL(link.href);
  };


  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-screen-2xl mx-auto">
        <header className="py-3 text-center flex justify-between items-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">Stone Configurator</h1>
          <div className="flex items-center space-x-3">
            <button
                onClick={() => setWireframeMode(w => !w)}
                className="px-3 py-1.5 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
            >
                {wireframeMode ? "Solid View" : "Wireframe View"}
            </button>
            {authLoading ? (
              <span className="text-sm text-gray-500">Loading auth...</span>
            ) : currentUser ? (
              <>
                {currentUser.photoURL && <img src={currentUser.photoURL} alt="User" className="w-8 h-8 rounded-full"/>}
                <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:inline">{currentUser.displayName || currentUser.email}</span>
                <button onClick={signOutUser} className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600">Sign Out</button>
              </>
            ) : (
              <button onClick={signInWithGoogle} className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                Sign In with Google
              </button>
            )}
            <button
              onClick={generatePdfReport}
              disabled={!currentWorkOrder || !currentUser}
              title={!currentUser ? "Please sign in" : (!currentWorkOrder ? "Please save work order first" : "Download PDF Report")}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              PDF Report
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 xl:col-span-3">
            <WorkOrderForm
              onSave={handleSaveWorkOrder}
              onActiveComponentChange={handleActiveComponentChange}
              activeComponentEdgeProcessing={edgeProcessingConfig}
              activeComponentFaceProcessing={faceProcessingConfig}
              onActiveComponentProcessingUpdate={handleActiveComponentProcessingUpdate}
            />
            <section className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">Cost Estimation (Active Comp. €)</h2>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p>Material Cost: <span className="font-medium float-right">{calculatedCosts.material.toFixed(2)}</span></p>
                <p>Edge Proc. Cost: <span className="font-medium float-right">{calculatedCosts.edge.toFixed(2)}</span></p>
                <p>Face Proc. Cost: <span className="font-medium float-right">{calculatedCosts.face.toFixed(2)}</span></p>
                <hr className="my-1 border-gray-300 dark:border-gray-600"/>
                <p className="text-md font-bold">Total (Active Comp.): <span className="float-right">{calculatedCosts.total.toFixed(2)}</span></p>
              </div>
            </section>

            <section className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">Logistics Info (Active Component)</h2>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p>Selected Pallet: <span className="font-medium float-right">{selectedPalletForInfo?.name || "N/A"}</span></p>
                <p>Component Weight: <span className="font-medium float-right">{logisticsInfoDisplay.weight}</span></p>
                <p>Fits on Pallet (dims): <span className="font-medium float-right">{logisticsInfoDisplay.fits}</span></p>
                <p>Pallet Load Status: <span className="font-medium float-right">{logisticsInfoDisplay.palletLoad}</span></p>
                <p className="mt-1">Packing Notes: <span className="font-light block whitespace-pre-wrap">{logisticsInfoDisplay.notes || "N/A"}</span></p>
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 xl:col-span-6 flex flex-col gap-4">
            <div className="w-full min-h-[60vh] md:min-h-[50vh] rounded-lg shadow-xl overflow-hidden bg-gray-700">
              {activeVisualizedComponent && (
                <Scene
                  key={activeVisualizedComponent.id + activeVisualizedComponent.stoneTypeId + JSON.stringify(activeVisualizedComponent.width) + JSON.stringify(edgeProcessingConfig) + JSON.stringify(faceProcessingConfig) + wireframeMode}
                  componentSize={[activeVisualizedComponent.width, activeVisualizedComponent.height, activeVisualizedComponent.depth]}
                  componentStoneType={activeVisualizedComponent.stoneTypeId}
                  currentEdgeProcessingConfig={edgeProcessingConfig}
                  currentFaceProcessingConfig={faceProcessingConfig}
                  onFaceClickForSelection={handle3DBlockClick}
                  wireframeMode={wireframeMode}
                />
              )}
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
                  />
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-3 xl:col-span-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-300 dark:divide-gray-700">
            <section className="py-2">
              <h2 className="text-md font-semibold mb-1 text-gray-700 dark:text-gray-200">Edge Processing</h2>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Active Group: <span className="text-blue-500">{activeEdgeGroup}</span></label>
              <select value={selectedEdgeProcId} onChange={(e) => setSelectedEdgeProcId(e.target.value)}
                className="mt-1 w-full p-1.5 border border-gray-300 rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <optgroup label="Chamfers">{chamferOpts.map(o=>(<option key={o.id} value={o.id}>{o.name}</option>))}</optgroup>
              </select>
              <button onClick={applyEdgeProc} disabled={activeEdgeGroup==='NONE'} className="w-full mt-1.5 px-3 py-1 text-xs bg-green-500 text-white rounded h-8 hover:bg-green-600 disabled:bg-gray-400">Apply Edge</button>
              <button onClick={clearEdgeProc} className="w-full mt-1 px-3 py-1 text-xs bg-red-600 text-white rounded h-8 hover:bg-red-700">Clear Edges</button>
            </section>

            <section className="py-2">
              <h2 className="text-md font-semibold mt-2 mb-1 text-gray-700 dark:text-gray-200">Face Processing</h2>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Active Face: <span className="text-purple-500">{activeClickedFace}</span></label>
              <select value={selectedFaceProcId} onChange={(e) => setSelectedFaceProcId(e.target.value)}
                className="mt-1 w-full p-1.5 border border-gray-300 rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                {faceOpts.map(o=>(<option key={o.id} value={o.id}>{o.name}</option>))}
              </select>
              <button onClick={applyFaceProc} disabled={activeClickedFace==='NONE'} className="w-full mt-1.5 px-3 py-1 text-xs bg-indigo-500 text-white rounded h-8 hover:bg-indigo-600 disabled:bg-gray-400">Apply Face</button>
              <button onClick={clearFaceProc} className="w-full mt-1 px-3 py-1 text-xs bg-red-600 text-white rounded h-8 hover:bg-red-700">Clear Faces</button>
            </section>

            <section className="py-2">
              <h3 className="text-xs font-semibold mt-2 text-gray-700 dark:text-gray-200">3D Controls:</h3>
              <ul className="list-none text-xs text-gray-500 dark:text-gray-400">
                <li>Orbit: L-Click+Drag</li><li>Zoom: Scroll</li><li>Pan: R-Click+Drag</li>
              </ul>
            </section>
          </div>
        </div>

        <div className="mt-2 p-1 text-xs text-center text-gray-500 dark:text-gray-400">
          Note: CSG for edges & multi-material for faces are experimental. Save is simulated. Cost calc for edges is simplified.
        </div>
      </div>
    </main>
  );
}

[end of src/app/page.tsx]
