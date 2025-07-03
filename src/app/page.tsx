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
} from '@/data/sampleData';
import {
  AppliedEdgeProcessingConfig,
  AppliedFaceProcessingConfig,
  BoxFaceName,
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
  const [wireframeMode, setWireframeMode] = useState(false); // State for wireframe toggle

  const [activeVisualizedComponent, setActiveVisualizedComponent] = useState<StoneComponentData | null>(() => ({
    id: `comp_initial_${Date.now()}`, name: "Main Component",
    stoneTypeId: sampleStoneTypes[0]?.id || "",
    width: 1.5, height: 1.5, depth: 1.0,
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


  const handleActiveComponentChange = useCallback((component: StoneComponentData | null) => {
    setActiveVisualizedComponent(component);
    setEdgeProcessingConfig({}); setFaceProcessingConfig({});
    setActiveEdgeGroup('NONE'); setActiveClickedFace('NONE');
  }, []);

  const handle3DBlockClick = (group: HighlightedFaceGroup, faceName?: BoxFaceName) => {
    setActiveEdgeGroup( (group !== 'ALL' && group !== 'NONE') ? group as EdgeProcessableGroup : 'NONE');
    setActiveClickedFace(faceName || 'NONE');
  };

  const applyEdgeProc = () => {
    if (activeEdgeGroup === 'NONE' || !selectedEdgeProcId) return;
    setEdgeProcessingConfig(prev => ({ ...prev,
      [activeEdgeGroup]: prev[activeEdgeGroup] === selectedEdgeProcId ? undefined : selectedEdgeProcId
    }));
  };
  const clearEdgeProc = () => setEdgeProcessingConfig({});

  const applyFaceProc = () => {
    if (activeClickedFace === 'NONE' || !selectedFaceProcId) return;
    setFaceProcessingConfig(prev => ({ ...prev,
      [activeClickedFace]: prev[activeClickedFace] === selectedFaceProcId ? undefined : selectedFaceProcId
    }));
  };
  const clearFaceProc = () => setFaceProcessingConfig({});

  const chamferOpts = sampleEdgeProcessingDefinitions.filter(p => p.type === 'CHAMFER');
  const faceOpts = sampleFaceProcessingDefinitions;

  const handleSaveWorkOrder = (workOrderData: WorkOrderData) => {
    if (!currentUser) {
      alert("Please sign in to save work orders.");
      return;
    }
    console.log("Work Order to Save (user: " + currentUser.displayName + "):", workOrderData);
    setCurrentWorkOrder(workOrderData);
    alert(`Work Order "${workOrderData.projectName}" (simulated save). Ready for PDF.`);
  };

  const calculatedCosts = useMemo(() => {
    if (!activeVisualizedComponent) return { material: 0, edge: 0, face: 0, total: 0 };
    const { width: w, height: h, depth: d, stoneTypeId } = activeVisualizedComponent;
    const stoneInfo = sampleStoneTypes.find(st => st.id === stoneTypeId);
    const volume = calculateVolume(w, h, d);
    const materialCost = stoneInfo ? volume * stoneInfo.priceEURPerM3 : 0;
    let edgeCost = 0;
    const edgeGroupLengths = calculateEdgeGroupLengths(w,h,d);
    for (const groupKey in edgeProcessingConfig) {
      const groupId = groupKey as EdgeProcessableGroup;
      const procId = edgeProcessingConfig[groupId];
      if (procId) {
        const procInfo = sampleEdgeProcessingDefinitions.find(p => p.id === procId);
        const length = groupId === 'TOP' ? (2*w + 2*d) : (groupId === 'BOTTOM' ? (2*w + 2*d) : 0);
        if (procInfo && length > 0) edgeCost += length * procInfo.priceEURPerMeter;
      }
    }
    let faceCost = 0;
    const faceAreas = calculateFaceAreas(w, h, d);
    for (const faceKey in faceProcessingConfig) {
      const faceName = faceKey as BoxFaceName;
      const procId = faceProcessingConfig[faceName];
      if (procId) {
        const procInfo = sampleFaceProcessingDefinitions.find(p => p.id === procId);
        const area = faceAreas[faceName];
        if (procInfo && area > 0) faceCost += area * procInfo.priceEURPerM2;
      }
    }
    return { material: materialCost, edge: edgeCost, face: faceCost, total: materialCost + edgeCost + faceCost };
  }, [activeVisualizedComponent, edgeProcessingConfig, faceProcessingConfig]);

  const generatePdfReport = async () => {
        if (!activeVisualizedComponent || !currentWorkOrder) {
      alert("No active component or work order data to generate PDF.");
      return;
    }
    if (!currentUser) {
        alert("Please sign in to download reports.");
        return;
    }
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let y = pageHeight - 50;
    const line = (text: string, size = 12, isBold = false) => {
      page.drawText(text, { x: 50, y, size, font: isBold ? boldFont : font, color: rgb(0,0,0) });
      y -= (size * 1.5);
    };
    line(`Radni Nalog: ${currentWorkOrder.projectName}`, 16, true); y -= 10;
    line(`Klijent: ${currentWorkOrder.clientName}`);
    line(`Datum: ${new Date(currentWorkOrder.date).toLocaleDateString('hr-HR')}`);
    line(`Odgovorna Osoba: ${currentWorkOrder.responsiblePerson || 'N/A'}`);
    line(`Izdao: ${currentUser.displayName || currentUser.email}`, 10);
    y -= 10;
    const comp = activeVisualizedComponent;
    const stone = sampleStoneTypes.find(s => s.id === comp.stoneTypeId);
    line(`Komponenta: ${comp.name}`, 14, true);
    line(`Materijal: ${stone?.name || 'N/A'}`);
    line(`Dimenzije (ŠxVxD): ${comp.width} x ${comp.height} x ${comp.depth} m`); y -= 5;
    line("Obrada Ivica:", 12, true); let hasEdgeProc = false;
    for (const group in edgeProcessingConfig) { const procId = edgeProcessingConfig[group as EdgeProcessableGroup]; if (procId) { const procDef = sampleEdgeProcessingDefinitions.find(p => p.id === procId); line(`  - ${group}: ${procDef?.name || procId}`); hasEdgeProc = true; }}
    if (!hasEdgeProc) line("  Nema obrade ivica."); y -= 5;
    line("Obrada Lica:", 12, true); let hasFaceProc = false;
    for (const face in faceProcessingConfig) { const procId = faceProcessingConfig[face as BoxFaceName]; if (procId) { const procDef = sampleFaceProcessingDefinitions.find(p => p.id === procId); line(`  - Lice ${face}: ${procDef?.name || procId}`); hasFaceProc = true; }}
    if (!hasFaceProc) line("  Nema obrade lica."); y -= 10;
    line("Kalkulacija Troškova (€):", 14, true);
    line(`  Cijena Materijala: ${calculatedCosts.material.toFixed(2)}`);
    line(`  Cijena Obrade Ivica: ${calculatedCosts.edge.toFixed(2)}`);
    line(`  Cijena Obrade Lica: ${calculatedCosts.face.toFixed(2)}`);
    page.drawLine({start: {x:50, y:y+5}, end: {x:250, y:y+5}, thickness:0.5, color:rgb(0.7,0.7,0.7)}); y-=5;
    line(`  UKUPNO: ${calculatedCosts.total.toFixed(2)}`, 12, true);
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
              disabled={!activeVisualizedComponent || !currentWorkOrder || !currentUser}
              title={!currentUser ? "Please sign in to download reports" : "Download PDF Report"}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              PDF Report
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 xl:col-span-3">
            <WorkOrderForm onSave={handleSaveWorkOrder} onActiveComponentChange={handleActiveComponentChange} />
            <section className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">Cost Estimation (€)</h2>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p>Material Cost: <span className="font-medium float-right">{calculatedCosts.material.toFixed(2)}</span></p>
                <p>Edge Proc. Cost: <span className="font-medium float-right">{calculatedCosts.edge.toFixed(2)}</span></p>
                <p>Face Proc. Cost: <span className="font-medium float-right">{calculatedCosts.face.toFixed(2)}</span></p>
                <hr className="my-1 border-gray-300 dark:border-gray-600"/>
                <p className="text-md font-bold">Total Cost: <span className="float-right">{calculatedCosts.total.toFixed(2)}</span></p>
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 xl:col-span-6 flex flex-col gap-4">
            <div className="w-full min-h-[60vh] md:min-h-[50vh] rounded-lg shadow-xl overflow-hidden bg-gray-700">
              {activeVisualizedComponent && (
                <Scene
                  key={activeVisualizedComponent.id}
                  componentSize={[activeVisualizedComponent.width, activeVisualizedComponent.height, activeVisualizedComponent.depth]}
                  componentStoneType={activeVisualizedComponent.stoneTypeId}
                  currentEdgeProcessingConfig={edgeProcessingConfig}
                  currentFaceProcessingConfig={faceProcessingConfig}
                  onFaceClickForSelection={handle3DBlockClick}
                  wireframeMode={wireframeMode} // Pass wireframe state
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
                    stoneWidth={activeVisualizedComponent.width * PIXELS_PER_UNIT}
                    stoneHeight={activeVisualizedComponent.height * PIXELS_PER_UNIT}
                    stoneDepth={activeVisualizedComponent.depth * PIXELS_PER_UNIT}
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
