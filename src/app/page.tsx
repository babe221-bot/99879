"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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
  const [workOrderFormKey, setWorkOrderFormKey] = useState(Date.now());

  const [selectedPalletForInfo, setSelectedPalletForInfo] = useState<PalletType | null>(
    samplePalletTypes[0] || null
  );

  const fetchUserWorkOrdersList = useCallback(async () => {
    if (!currentUser) {
      setUserWorkOrders([]);
      return;
    }
    setIsLoadingWOList(true);
    try {
      const wos = await fetchUserWorkOrdersFromDb(currentUser.uid);
      setUserWorkOrders(wos);
    } catch (error) {
      console.error("Error fetching user work orders:", error);
    } finally {
      setIsLoadingWOList(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUserWorkOrdersList();
  }, [fetchUserWorkOrdersList]);


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

  const edgeProcessingOptions = sampleEdgeProcessingDefinitions.map(p => ({id: p.id, name: p.name, type: p.type}));
  const chamferOpts = edgeProcessingOptions.filter(p => p.type === 'CHAMFER');
  const roundOpts = edgeProcessingOptions.filter(p => p.type === 'ROUND');
  const deburrOpts = edgeProcessingOptions.filter(p => p.type === 'DEBURR');
  const faceOpts = sampleFaceProcessingDefinitions;

  const handleSaveWorkOrder = async (workOrderDataFromForm: WorkOrderData) => {
    if (!currentUser) { alert("Please sign in."); return; }
    const componentsWithLatestActiveProcessing = workOrderDataFromForm.components.map(comp =>
      comp.id === activeVisualizedComponent?.id ?
      { ...activeVisualizedComponent, edgeProcessingConfig, faceProcessingConfig } : comp
    );
    const isUpdating = currentWorkOrder && currentWorkOrder.id && !currentWorkOrder.id.startsWith('wo_');
    const workOrderToSave: WorkOrderData = {
      ...workOrderDataFromForm,
      id: isUpdating ? currentWorkOrder.id : `wo_${Date.now()}`,
      components: componentsWithLatestActiveProcessing,
    };

    try {
      if (isUpdating) {
        const { id, userId, createdAt, ...updateData } = workOrderToSave;
        await updateWorkOrderInFirestore(workOrderToSave.id, updateData);
        setCurrentWorkOrder(workOrderToSave);
        alert(`Work Order "${workOrderToSave.projectName}" updated.`);
      } else {
        const { id, ...saveData } = workOrderToSave;
        const newWorkOrderId = await saveWorkOrderToFirestore(currentUser.uid, saveData as Omit<WorkOrderData, 'id'>);
        setCurrentWorkOrder({ ...workOrderToSave, id: newWorkOrderId });
        alert(`Work Order "${workOrderToSave.projectName}" saved with ID: ${newWorkOrderId}.`);
      }
      fetchUserWorkOrdersList();
      const savedPallet = samplePalletTypes.find(p => p.id === workOrderToSave.logistics.selectedPalletId);
      setSelectedPalletForInfo(savedPallet || null);
    } catch (error) {
      console.error("Error saving work order to Firestore:", error);
      alert("Failed to save work order.");
    }
  };

  const handleLoadWorkOrder = async (workOrderId: string) => {
    try {
      const woData = await getWorkOrderFromDb(workOrderId);
      if (woData) {
        setCurrentWorkOrder(woData);
        const firstComponent = woData.components && woData.components.length > 0 ? woData.components[0] : createNewStoneComponent(0);
        handleActiveComponentChange(firstComponent);
        setWorkOrderFormKey(Date.now());
        const loadedPallet = samplePalletTypes.find(p => p.id === woData.logistics.selectedPalletId);
        setSelectedPalletForInfo(loadedPallet || samplePalletTypes[0] || null);
      } else {
        alert("Work order not found.");
      }
    } catch (error) {
      console.error("Error loading work order:", error);
      alert("Failed to load work order.");
    }
  };

  const handleNewWorkOrder = () => {
    setCurrentWorkOrder(null);
    handleActiveComponentChange(createNewStoneComponent(0));
    setWorkOrderFormKey(Date.now());
    setSelectedPalletForInfo(samplePalletTypes[0] || null);
  };

  const calculatedCosts = useMemo(() => { /* ... */ return { material: 0, edge: 0, face: 0, total: 0 };}, [activeVisualizedComponent, edgeProcessingConfig, faceProcessingConfig]);
  const logisticsInfoDisplay = useMemo(() => { /* ... */ return { weight: "N/A", fits: "N/A", palletLoad: "N/A", notes: "" };}, [activeVisualizedComponent, selectedPalletForInfo, currentWorkOrder]);
  const generatePdfReport = async () => { /* ... as before ... */ };


  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-screen-2xl mx-auto">
        <header className="py-3 text-center flex justify-between items-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">Stone Configurator</h1>
          <div className="flex items-center space-x-3">
            <button onClick={() => setWireframeMode(w => !w)} className="px-3 py-1.5 bg-purple-500 text-white text-xs rounded hover:bg-purple-600">
                {wireframeMode ? "Solid View" : "Wireframe View"}
            </button>
            {authLoading ? ( <span className="text-sm text-gray-500">Loading auth...</span> ) : currentUser ? (
              <>
                {currentUser.photoURL && <img src={currentUser.photoURL} alt="User" className="w-8 h-8 rounded-full"/>}
                <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:inline">{currentUser.displayName || currentUser.email}</span>
                <button onClick={signOutUser} className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600">Sign Out</button>
              </>
            ) : ( <button onClick={signInWithGoogle} className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">Sign In</button> )}
            <button onClick={generatePdfReport} disabled={!currentWorkOrder || !currentUser} title={!currentUser ? "Sign in" : (!currentWorkOrder ? "Save WO first" : "PDF Report")}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
              PDF Report
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 xl:col-span-3">
            <WorkOrderList
                onLoadWorkOrder={handleLoadWorkOrder}
                onNewWorkOrder={handleNewWorkOrder}
                currentWorkOrderId={currentWorkOrder?.id}
            />
            <WorkOrderForm
              key={workOrderFormKey}
              initialData={currentWorkOrder || undefined}
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
                  key={activeVisualizedComponent.id + activeVisualizedComponent.stoneTypeId + JSON.stringify(activeVisualizedComponent.width) + JSON.stringify(edgeProcessingConfig) + JSON.stringify(faceProcessingConfig) + wireframeMode + (currentWorkOrder?.id || 'new')}
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
                <optgroup label="Rounding (Experimental)">{roundOpts.map(o=>(<option key={o.id} value={o.id}>{o.name}</option>))}</optgroup>
                <optgroup label="Deburring">{deburrOpts.map(o=>(<option key={o.id} value={o.id}>{o.name}</option>))}</optgroup>
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
