"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { PDFDocument, StandardFonts, rgb, PageSizes, PDFFont } from 'pdf-lib';

// JSCAD Imports for HomePage
import { primitives, booleans, extrusions } from '@jscad/modeling';
import { geom2, geom3 } from '@jscad/modeling/src/geometries';
import { translate, rotateX, rotateY, rotateZ } from '@jscad/modeling/src/operations/transforms';
import { project } from '@jscad/modeling/src/operations/extrusions'; // For 2D projection
import { serialize } from '@jscad/svg-serializer'; // For SVG output

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
  PalletType, StoneType, EdgeProcessingDefinition, FaceProcessingDefinition
} from '@/types/stoneData'; // Only import types from here
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
  deleteWorkOrder as deleteWorkOrderFromDb,
  getStoneTypes as fetchStoneTypesFromDb,
  getEdgeProcessingDefinitions as fetchEdgeDefinitionsFromDb,
  getFaceProcessingDefinitions as fetchFaceDefinitionsFromDb,
  getPalletTypes as fetchPalletTypesFromDb
} from '@/lib/firestoreService';
import { fabric } from 'fabric';

const PIXELS_PER_UNIT = 100;

const calculateVolume = (w: number, h: number, d: number): number => w * h * d;
const calculateFaceAreas = (w: number, h: number, d: number): Record<BoxFaceName, number> => ({ /* ... */ });
const calculateEdgeGroupLengths = (w: number, h: number, d: number): Record<EdgeProcessableGroup, number> => ({ /* ... */ });

const btnBase = "px-3 py-1.5 text-xs rounded transition-colors duration-150 ease-in-out";
// ... other button styles ...

export default function HomePage() {
  const { currentUser, signInWithGoogle, signOutUser, loading: authLoading } = useAuth();
  const [wireframeMode, setWireframeMode] = useState(false);

  const [stoneTypes, setStoneTypes] = useState<StoneType[]>([]);
  const [edgeDefinitions, setEdgeDefinitions] = useState<EdgeProcessingDefinition[]>([]);
  const [faceDefinitions, setFaceDefinitions] = useState<FaceProcessingDefinition[]>([]);
  const [palletTypes, setPalletTypes] = useState<PalletType[]>([]);
  const [isSharedDataLoading, setIsSharedDataLoading] = useState(true);

  const defaultInitialStoneTypeId = useMemo(() => stoneTypes.length > 0 ? stoneTypes[0].id : "", [stoneTypes]);

  const [activeVisualizedComponent, setActiveVisualizedComponent] = useState<StoneComponentData | null>(
    () => createNewStoneComponent(0, defaultInitialStoneTypeId)
  );

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

  useEffect(() => { /* Fetch Shared Data ... */ }, []);
  useEffect(() => { /* Update activeVisualizedComponent if stoneTypes load ... */ }, [stoneTypes, activeVisualizedComponent]);
  useEffect(() => { /* fetchUserWorkOrdersList ... */ }, [currentUser]); // Corrected dependency
  const handleActiveComponentChange = useCallback((component: StoneComponentData | null) => { /* ... */ }, []);
  const handleActiveComponentProcessingUpdate = useCallback((edgeConfig: AppliedEdgeProcessingConfig, faceConfig: AppliedFaceProcessingConfig) => { /* ... */ }, []);
  const handle3DBlockClick = (group: HighlightedFaceGroup, faceName?: BoxFaceName) => { /* ... */ };
  const applyEdgeProc = () => { /* ... */ }; const clearEdgeProc = () => { /* ... */ };
  const applyFaceProc = () => { /* ... */ }; const clearFaceProc = () => { /* ... */ };

  const chamferOptsFromState = useMemo(() => edgeDefinitions.filter(p => p.type === 'CHAMFER'), [edgeDefinitions]);
  const roundOptsFromState = useMemo(() => edgeDefinitions.filter(p => p.type === 'ROUND'), [edgeDefinitions]);
  const deburrOptsFromState = useMemo(() => edgeDefinitions.filter(p => p.type === 'DEBURR'), [edgeDefinitions]);
  const faceOptsFromState = useMemo(() => faceDefinitions, [faceDefinitions]);

  const processedJscadGeom = useMemo((): geom3 | null => {
    if (!activeVisualizedComponent || !activeVisualizedComponent.width || !activeVisualizedComponent.height || !activeVisualizedComponent.depth) {
      return null;
    }
    const { width: w, height: h, depth: d } = activeVisualizedComponent;
    let jscadGeom: geom3 = primitives.cuboid({ size: [w, h, d], center: [0,0,0] });
    const getParams = (id: ProcessingID): EdgeProcessingDefinition | undefined => edgeDefinitions.find(p=>p.id === id);
    const createWedge = (length: number, chamferVal: number): geom3 => {
        if (chamferVal <= 1e-6 || length <= 1e-6) return primitives.cuboid({size:[0,0,0]});
        const profile = primitives.polygon({ points: [[0,0], [chamferVal,0], [0,chamferVal]] });
        return extrusions.extrudeLinear({ height: length }, profile);
    };
    let hasAppliedSpecificRound = false;
    // ... (Full CSG logic for chamfers and rounds as implemented before) ...
    return jscadGeom;
  }, [activeVisualizedComponent, edgeProcessingConfig, edgeDefinitions]);

  const current2DSvgData = useMemo((): string | null => {
    if (!processedJscadGeom) return null;

    let projectionNormal: [number, number, number];
    // Assuming default JSCAD coordinates: Z is up for 2D X-Y plane projection
    // For our 3D view: Y is up, X is right, Z is towards camera (depth)
    // Front view (project onto XY plane, view along +Z or -Z): normal [0,0,1] or [0,0,-1]
    // Top view (project onto XZ plane, view along +Y or -Y): normal [0,1,0] or [0,-1,0]
    // Side view (project onto YZ plane, view along +X or -X): normal [1,0,0] or [-1,0,0]
    switch (current2DView) {
      case 'top':    projectionNormal = [0, 1, 0]; break; // View from +Y, project onto XZ
      case 'side':   projectionNormal = [1, 0, 0]; break; // View from +X, project onto YZ
      case 'front':
      default:       projectionNormal = [0, 0, -1]; break; // View from -Z, project onto XY
    }

    try {
      // Project returns a geom2 or an array of geom2s if the result is disjoint
      const projected = project({ normal: projectionNormal }, processedJscadGeom);
      const geomsToSerialize: geom2[] = Array.isArray(projected) ? projected : [projected];

      if (geomsToSerialize.every(g => geom2.toPoints(g).length === 0 && geom2.toSides(g).length === 0 && geom2.toOutlines(g).length === 0)) {
          console.warn(`JSCAD project() resulted in empty geom2 for view ${current2DView}`);
          return null;
      }
      // Serialize options: { unit: 'mm' } might be useful if JSCAD units are mm.
      // Our 3D units are meters. SVG is unitless, but serializer might take it.
      // For now, default options.
      const svgString = serialize({}, ...geomsToSerialize); // Spread if it's an array
      return svgString;
    } catch (error) {
      console.error(`Error generating SVG for ${current2DView} view:`, error);
      return null;
    }
  }, [processedJscadGeom, current2DView]);


  const handleSaveWorkOrder = async (workOrderDataFromForm: WorkOrderData) => { /* ... */ };
  const handleLoadWorkOrder = async (workOrderId: string) => { /* ... */ };
  const handleNewWorkOrder = () => { /* ... */ };
  const calculatedCosts = useMemo(() => { /* ... */ }, [activeVisualizedComponent, edgeProcessingConfig, faceProcessingConfig, stoneTypes, edgeDefinitions, faceDefinitions]);
  const workOrderLogisticsDisplay = useMemo(() => { /* ... */ }, [activeVisualizedComponent, currentWorkOrder, selectedPalletForInfo, stoneTypes, palletTypes]);
  const capture3DView = () => { /* ... */ };
  const generatePdfReport = async () => { /* ... */ };

  if (isSharedDataLoading) { return <div className="flex justify-center items-center min-h-screen"><p>Loading configuration data...</p></div>; }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-6 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <div className="w-full max-w-screen-2xl mx-auto">
        <header className="py-3 mb-4 text-center flex justify-between items-center">
          {/* ... Header content from previous state ... */}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* ... WorkOrderList, WorkOrderForm, Cost, Logistics ... */}
            <WorkOrderList onLoadWorkOrder={handleLoadWorkOrder} onNewWorkOrder={handleNewWorkOrder} currentWorkOrderId={currentWorkOrder?.id} isLoading={isLoadingWOList || isLoadingSpecificWO} />
            <WorkOrderForm
              key={workOrderFormKey} initialData={currentWorkOrder || undefined} onSave={handleSaveWorkOrder}
              onActiveComponentChange={handleActiveComponentChange}
              activeComponentEdgeProcessing={edgeProcessingConfig} activeComponentFaceProcessing={faceProcessingConfig}
              onActiveComponentProcessingUpdate={handleActiveComponentProcessingUpdate}
              isSaving={isSavingWO} stoneTypes={stoneTypes} palletTypes={palletTypes}
            />
            {/* Cost and Logistics sections */}
          </div>

          <div className="lg:col-span-5 xl:col-span-6 flex flex-col gap-4">
            <div className="w-full min-h-[50vh] rounded-lg shadow-xl overflow-hidden bg-gray-700 relative">
              {activeVisualizedComponent && stoneTypes.length > 0 && (
                <Scene
                  key={activeVisualizedComponent.id + activeVisualizedComponent.stoneTypeId + JSON.stringify(activeVisualizedComponent.width) + JSON.stringify(edgeProcessingConfig) + JSON.stringify(faceProcessingConfig) + wireframeMode + (currentWorkOrder?.id || 'new')}
                  componentStoneType={activeVisualizedComponent.stoneTypeId}
                  currentFaceProcessingConfig={faceProcessingConfig}
                  onFaceClickForSelection={handle3DBlockClick}
                  wireframeMode={wireframeMode}
                  onCanvasRef={(canvasElem) => threeJsCanvasElementRef.current = canvasElem}
                  processedJscadGeom={processedJscadGeom}
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
                {activeVisualizedComponent && ( // DrawingCanvas will now receive svgData
                  <DrawingCanvas
                    stoneWidth={activeVisualizedComponent.width}
                    stoneHeight={activeVisualizedComponent.height}
                    stoneDepth={activeVisualizedComponent.depth}
                    // edgeProcessingConfig={edgeProcessingConfig} // No longer needed if SVG handles processed shape
                    pixelsPerUnit={PIXELS_PER_UNIT}
                    viewType={current2DView} // Still useful for context if SVG fails
                    svgData={current2DSvgData} // New prop
                    canvasWidth={450} canvasHeight={300}
                    onCanvasReady={(canvasInstance) => fabric2DCanvasRef.current = canvasInstance}
                  />
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-3 xl:col-span-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-300 dark:divide-gray-700">
            {/* ... Edge & Face Processing controls using optsFromState ... */}
          </div>
        </div>
        {/* ... Footer Note ... */}
      </div>
    </main>
  );
}
