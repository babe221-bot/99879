"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { PDFDocument, StandardFonts, rgb, PageSizes, PDFFont } from 'pdf-lib';
import Scene, {
  HighlightedFaceGroup,
  ProcessingID,
  EdgeProcessableGroup
} from "@/components/3d/Scene";
import DrawingCanvas, { DrawingViewType } from '@/components/2d/DrawingCanvas';
import WorkOrderForm, { WorkOrderData } from '@/components/configurator/WorkOrderForm';
import { StoneComponentData, createNewComponent as createNewStoneComponent } from '@/components/configurator/StoneComponentConfig';
import WorkOrderList from '@/components/configurator/WorkOrderList';
// Sample data direct imports will be phased out for dropdowns etc.
// import {
//   sampleEdgeProcessingDefinitions,
//   sampleFaceProcessingDefinitions,
//   sampleStoneTypes,
//   samplePalletTypes,
// } from '@/data/sampleData';
import {
  StoneType,
  EdgeProcessingDefinition,
  FaceProcessingDefinition,
  PalletType,
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
  deleteWorkOrder as deleteWorkOrderFromDb,
  getStoneTypes, // New imports
  getEdgeProcessingDefinitions,
  getFaceProcessingDefinitions,
  getPalletTypes
} from '@/lib/firestoreService';
import { fabric } from 'fabric';

const PIXELS_PER_UNIT = 100;

const calculateVolume = (w: number, h: number, d: number): number => w * h * d;
const calculateFaceAreas = (w: number, h: number, d: number): Record<BoxFaceName, number> => ({
  TOP: w * d, BOTTOM: w * d, FRONT: w * h, BACK: w * h, LEFT: d * h, RIGHT: d * h,
});
const calculateEdgeGroupLengths = (w: number, h: number, d: number): Record<EdgeProcessableGroup, number> => ({
  TOP: 2 * (w + d), BOTTOM: 2 * (w + d), SIDES_FRONT_BACK: 2 * (w + h), SIDES_LEFT_RIGHT: 2 * (d + h),
});

// --- Button Style Constants ---
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

  // --- Shared Data State ---
  const [stoneTypes, setStoneTypes] = useState<StoneType[]>([]);
  const [edgeDefinitions, setEdgeDefinitions] = useState<EdgeProcessingDefinition[]>([]);
  const [faceDefinitions, setFaceDefinitions] = useState<FaceProcessingDefinition[]>([]);
  const [palletTypes, setPalletTypes] = useState<PalletType[]>([]);
  const [isSharedDataLoading, setIsSharedDataLoading] = useState(true);

  const [activeVisualizedComponent, setActiveVisualizedComponent] = useState<StoneComponentData | null>(() => createNewStoneComponent(0, stoneTypes[0]?.id));

  const [edgeProcessingConfig, setEdgeProcessingConfig] = useState<AppliedEdgeProcessingConfig>({});
  const [activeEdgeGroup, setActiveEdgeGroup] = useState<EdgeProcessableGroup | 'NONE'>('NONE');
  const [selectedEdgeProcId, setSelectedEdgeProcId] = useState<ProcessingID>("");

  const [faceProcessingConfig, setFaceProcessingConfig] = useState<AppliedFaceProcessingConfig>({});
  const [activeClickedFace, setActiveClickedFace] = useState<BoxFaceName | 'NONE'>('NONE');
  const [selectedFaceProcId, setSelectedFaceProcId] = useState<ProcessingID>("");

  const [current2DView, setCurrent2DView] = useState<DrawingViewType>('front');
  const [currentWorkOrder, setCurrentWorkOrder] = useState<WorkOrderData | null>(null);
  const [userWorkOrders, setUserWorkOrders] = useState<WorkOrderData[]>([]);
  const [isLoadingWOList, setIsLoadingWOList] = useState(false);
  const [isLoadingSpecificWO, setIsLoadingSpecificWO] = useState(false);
  const [isSavingWO, setIsSavingWO] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [workOrderFormKey, setWorkOrderFormKey] = useState(Date.now());

  const fabric2DCanvasRef = useRef<fabric.Canvas | null>(null);
  const threeJsCanvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const [captured3DViewImage, setCaptured3DViewImage] = useState<string | null>(null);

  const [selectedPalletForInfo, setSelectedPalletForInfo] = useState<PalletType | null>(null);

  // Fetch Shared Data
  useEffect(() => {
    const fetchAllSharedData = async () => {
      setIsSharedDataLoading(true);
      try {
        const [stones, edges, faces, pallets] = await Promise.all([
          getStoneTypes(),
          getEdgeProcessingDefinitions(),
          getFaceProcessingDefinitions(),
          getPalletTypes()
        ]);
        setStoneTypes(stones);
        setEdgeDefinitions(edges);
        setFaceDefinitions(faces);
        setPalletTypes(pallets);

        // Initialize defaults based on fetched data
        if (stones.length > 0 && !activeVisualizedComponent?.stoneTypeId) {
            setActiveVisualizedComponent(prev => prev ? {...prev, stoneTypeId: stones[0].id} : createNewStoneComponent(0, stones[0].id));
        }
        if (edges.length > 0 && !selectedEdgeProcId) {
            setSelectedEdgeProcId(edges.find(p => p.type === 'CHAMFER')?.id || edges[0].id);
        }
        if (faces.length > 0 && !selectedFaceProcId) {
            setSelectedFaceProcId(faces[0].id);
        }
        if (pallets.length > 0 && !selectedPalletForInfo) {
            setSelectedPalletForInfo(pallets[0]);
        }
         // Update initial component in WorkOrderForm if it hasn't been set with fetched data
        if (!currentWorkOrder && activeVisualizedComponent && stones.length > 0 && !activeVisualizedComponent.stoneTypeId) {
            setActiveVisualizedComponent(createNewStoneComponent(0, stones[0].id));
        }


      } catch (error) {
        console.error("Error fetching shared data:", error);
        alert("Failed to load essential configuration data. Please try refreshing.");
      } finally {
        setIsSharedDataLoading(false);
      }
    };
    fetchAllSharedData();
  }, []); // Run once on mount

  // Update activeVisualizedComponent when stoneTypes are loaded if it's still default
  useEffect(() => {
    if (stoneTypes.length > 0 && activeVisualizedComponent && activeVisualizedComponent.stoneTypeId === "") {
      setActiveVisualizedComponent(prev => prev ? { ...prev, stoneTypeId: stoneTypes[0].id } : createNewStoneComponent(0, stoneTypes[0].id));
    }
  }, [stoneTypes, activeVisualizedComponent]);


  const fetchUserWorkOrdersList = useCallback(async () => { /* ... */ }, [currentUser]);
  useEffect(() => { fetchUserWorkOrdersList(); }, [fetchUserWorkOrdersList]);

  const handleActiveComponentChange = useCallback((component: StoneComponentData | null) => {
    setActiveVisualizedComponent(component);
    setEdgeProcessingConfig(component?.edgeProcessingConfig || {});
    setFaceProcessingConfig(component?.faceProcessingConfig || {});
    setActiveEdgeGroup('NONE');
    setActiveClickedFace('NONE');
    setCaptured3DViewImage(null);
  }, []);

  const handleActiveComponentProcessingUpdate = useCallback((edgeConfig: AppliedEdgeProcessingConfig, faceConfig: AppliedFaceProcessingConfig) => {
      setEdgeProcessingConfig(edgeConfig);
      setFaceProcessingConfig(faceConfig);
  }, []);

  const handle3DBlockClick = (group: HighlightedFaceGroup, faceName?: BoxFaceName) => { /* ... */ };
  const applyEdgeProc = () => { /* ... */ };
  const clearEdgeProc = () => { /* ... */ };
  const applyFaceProc = () => { /* ... */ };
  const clearFaceProc = () => { /* ... */ };

  const chamferOpts = edgeDefinitions.filter(p => p.type === 'CHAMFER');
  const roundOpts = edgeDefinitions.filter(p => p.type === 'ROUND');
  const deburrOpts = edgeDefinitions.filter(p => p.type === 'DEBURR');
  const faceOpts = faceDefinitions; // Use state

  const handleSaveWorkOrder = async (workOrderDataFromForm: WorkOrderData) => { /* ... */ };
  const handleLoadWorkOrder = async (workOrderId: string) => { /* ... */ };
  const handleNewWorkOrder = () => { /* ... */
     setCurrentWorkOrder(null);
     const defaultStoneId = stoneTypes.length > 0 ? stoneTypes[0].id : "";
     handleActiveComponentChange(createNewStoneComponent(0, defaultStoneId));
     setWorkOrderFormKey(Date.now());
     setSelectedPalletForInfo(palletTypes.length > 0 ? palletTypes[0] : null);
     setCaptured3DViewImage(null);
  };

  const calculatedCosts = useMemo(() => {
    if (!activeVisualizedComponent) return { material: 0, edge: 0, face: 0, total: 0 };
    const { width: w, height: h, depth: d, stoneTypeId } = activeVisualizedComponent;
    const stoneInfo = stoneTypes.find(st => st.id === stoneTypeId); // Use state
    const volume = calculateVolume(w, h, d);
    const materialCost = stoneInfo ? volume * stoneInfo.priceEURPerM3 : 0;
    let edgeCost = 0;
    const currentEdgeConfig = edgeProcessingConfig;
    const edgeGroupLengths = calculateEdgeGroupLengths(w,h,d);
    for (const groupKey in currentEdgeConfig) {
      const groupId = groupKey as EdgeProcessableGroup;
      const procId = currentEdgeConfig[groupId];
      if (procId) {
        const procInfo = edgeDefinitions.find(p => p.id === procId); // Use state
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
        const procInfo = faceDefinitions.find(p => p.id === procId); // Use state
        const area = faceAreas[faceName];
        if (procInfo && area > 0) faceCost += area * procInfo.priceEURPerM2;
      }
    }
    return { material: materialCost, edge: edgeCost, face: faceCost, total: materialCost + edgeCost + faceCost };
  }, [activeVisualizedComponent, edgeProcessingConfig, faceProcessingConfig, stoneTypes, edgeDefinitions, faceDefinitions]);

  const workOrderLogisticsDisplay = useMemo(() => { /* ... */
    // This also needs to use `stoneTypes` and `palletTypes` from state
    const currentSelectedPallet = palletTypes.find(p => p.id === currentWorkOrder?.logistics.selectedPalletId) || selectedPalletForInfo;
    // ... rest of the logic using `stoneTypes` from state ...
    return { activeComponentWeight: "N/A", activeComponentFits: "N/A", totalWorkOrderWeight: "N/A", palletLoadStatus: "N/A", selectedPalletName: "N/A", packingNotes: "", componentDetails: []};
  }, [activeVisualizedComponent, currentWorkOrder, selectedPalletForInfo, stoneTypes, palletTypes]);

  const capture3DView = () => { /* ... */ };
  const generatePdfReport = async () => { /* ... PDF generation to use stoneTypes, edgeDefinitions etc from state ... */ };


  if (isSharedDataLoading) {
    return <div className="flex justify-center items-center min-h-screen"><p>Loading essential configuration data...</p></div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <div className="w-full max-w-screen-2xl mx-auto">
        {/* ... Header ... */}
        <header className="py-3 mb-4 text-center flex justify-between items-center">
          {/* ... content ... */}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
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
              // Pass fetched shared data for dropdowns
              stoneTypes={stoneTypes}
              palletTypes={palletTypes}
            />
            {/* ... Cost and Logistics Sections (will also need fetched data for lookups) ... */}
          </div>

          {/* Center Column */}
          <div className="lg:col-span-5 xl:col-span-6 flex flex-col gap-4">
            <div className="w-full min-h-[50vh] rounded-lg shadow-xl overflow-hidden bg-gray-700 relative">
              {activeVisualizedComponent && stoneTypes.length > 0 && ( // Ensure stoneTypes loaded before rendering Scene
                <Scene
                  key={activeVisualizedComponent.id + activeVisualizedComponent.stoneTypeId + JSON.stringify(activeVisualizedComponent.width) + JSON.stringify(edgeProcessingConfig) + JSON.stringify(faceProcessingConfig) + wireframeMode + (currentWorkOrder?.id || 'new')}
                  componentSize={[activeVisualizedComponent.width, activeVisualizedComponent.height, activeVisualizedComponent.depth]}
                  componentStoneType={activeVisualizedComponent.stoneTypeId}
                  currentEdgeProcessingConfig={edgeProcessingConfig}
                  currentFaceProcessingConfig={faceProcessingConfig}
                  onFaceClickForSelection={handle3DBlockClick}
                  wireframeMode={wireframeMode}
                  onCanvasRef={(canvasElem) => threeJsCanvasElementRef.current = canvasElem}
                />
              )}
            </div>
            {/* ... 2D Drawing Section (will also need edgeDefinitions from state) ... */}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3 xl:col-span-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-300 dark:divide-gray-700">
            <section className="py-2">
              <h2 className="text-base font-semibold mb-1">Edge Processing</h2>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Active Group: <span className="text-blue-500 font-semibold">{activeEdgeGroup}</span></label>
              <select value={selectedEdgeProcId} onChange={(e) => setSelectedEdgeProcId(e.target.value)}
                className="mt-1 w-full p-1.5 border-gray-300 rounded text-xs dark:bg-gray-700 dark:border-gray-600">
                <optgroup label="Chamfers">{chamferOpts.map(o=>(<option key={o.id} value={o.id}>{o.name}</option>))}</optgroup>
                <optgroup label="Rounding (Experimental)">{roundOpts.map(o=>(<option key={o.id} value={o.id}>{o.name}</option>))}</optgroup>
                <optgroup label="Deburring">{deburrOpts.map(o=>(<option key={o.id} value={o.id}>{o.name}</option>))}</optgroup>
              </select>
              {/* ... buttons ... */}
            </section>
            <section className="py-2">
              <h2 className="text-base font-semibold mt-2 mb-1">Face Processing</h2>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Active Face: <span className="text-purple-500 font-semibold">{activeClickedFace}</span></label>
              <select value={selectedFaceProcId} onChange={(e) => setSelectedFaceProcId(e.target.value)}
                className="mt-1 w-full p-1.5 border-gray-300 rounded text-xs dark:bg-gray-700 dark:border-gray-600">
                {faceOpts.map(o=>(<option key={o.id} value={o.id}>{o.name}</option>))}
              </select>
              {/* ... buttons ... */}
            </section>
            {/* ... 3D Controls Info ... */}
          </div>
        </div>
        <div className="mt-2 p-1 text-xs text-center text-gray-500 dark:text-gray-400">
          {/* ... Footer Note ... */}
        </div>
      </div>
    </main>
  );
}
