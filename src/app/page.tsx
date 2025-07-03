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
import { fabric } from 'fabric';

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
  const threeJsCanvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const [captured3DViewImage, setCaptured3DViewImage] = useState<string | null>(null);

  const [selectedPalletForInfo, setSelectedPalletForInfo] = useState<PalletType | null>(
    samplePalletTypes[0] || null
  );

  const fetchUserWorkOrdersList = useCallback(async () => { /* ... */ }, [currentUser]);
  useEffect(() => { fetchUserWorkOrdersList(); }, [fetchUserWorkOrdersList]);

  const handleActiveComponentChange = useCallback((component: StoneComponentData | null) => { /* ... */
    setActiveVisualizedComponent(component);
    setEdgeProcessingConfig(component?.edgeProcessingConfig || {});
    setFaceProcessingConfig(component?.faceProcessingConfig || {});
    setActiveEdgeGroup('NONE');
    setActiveClickedFace('NONE');
    setCaptured3DViewImage(null);
  }, []);

  const handleActiveComponentProcessingUpdate = useCallback((edgeConfig: AppliedEdgeProcessingConfig, faceConfig: AppliedFaceProcessingConfig) => { /* ... */ }, []);
  const handle3DBlockClick = (group: HighlightedFaceGroup, faceName?: BoxFaceName) => { /* ... */ };
  const applyEdgeProc = () => { /* ... */ };
  const clearEdgeProc = () => { /* ... */ };
  const applyFaceProc = () => { /* ... */ };
  const clearFaceProc = () => { /* ... */ };

  const edgeProcessingOptions = sampleEdgeProcessingDefinitions.map(p => ({id: p.id, name: p.name, type: p.type}));
  const chamferOpts = edgeProcessingOptions.filter(p => p.type === 'CHAMFER');
  const roundOpts = edgeProcessingOptions.filter(p => p.type === 'ROUND');
  const deburrOpts = edgeProcessingOptions.filter(p => p.type === 'DEBURR');
  const faceOpts = sampleFaceProcessingDefinitions;

  const handleSaveWorkOrder = async (workOrderDataFromForm: WorkOrderData) => { /* ... */ };
  const handleLoadWorkOrder = async (workOrderId: string) => { /* ... */ };
  const handleNewWorkOrder = () => { /* ... */ };
  const calculatedCosts = useMemo(() => { /* ... */ return { material: 0, edge: 0, face: 0, total: 0 };}, [activeVisualizedComponent, edgeProcessingConfig, faceProcessingConfig]);
  const capture3DView = () => { /* ... */ };

  const workOrderLogisticsDisplay = useMemo(() => {
    let activeCompWeight = "N/A";
    let activeCompDimFits = "N/A";
    let totalWOWeightKg = 0;
    let totalWOWeightStr = "N/A";
    let palletLoadStatus = "N/A";
    const packingNotes = currentWorkOrder?.logistics.packingNotes || "";
    const currentSelectedPallet = samplePalletTypes.find(p => p.id === currentWorkOrder?.logistics.selectedPalletId) || selectedPalletForInfo;
    const componentLogistics: Array<{ name: string; id: string; weight: string; dimFits: string }> = [];

    if (activeVisualizedComponent && currentSelectedPallet) {
      const { width, height, depth, stoneTypeId } = activeVisualizedComponent;
      const stoneInfo = sampleStoneTypes.find(st => st.id === stoneTypeId);
      if (stoneInfo) {
        const volumeM3 = width * height * depth;
        const weightKg = volumeM3 * stoneInfo.densityKgM3;
        activeCompWeight = `${weightKg.toFixed(1)} kg`;
        const compWidthMM = width * 1000;
        const compDepthMM = depth * 1000;
        if ((compWidthMM <= currentSelectedPallet.lengthMM && compDepthMM <= currentSelectedPallet.widthMM) ||
            (compWidthMM <= currentSelectedPallet.widthMM && compDepthMM <= currentSelectedPallet.lengthMM)) {
          activeCompDimFits = "Yes";
        } else { activeCompDimFits = "No"; }
      }
    }

    if (currentWorkOrder && currentWorkOrder.components && currentSelectedPallet) {
      currentWorkOrder.components.forEach(comp => {
        const stoneInfo = sampleStoneTypes.find(st => st.id === comp.stoneTypeId);
        let compWeightKg = 0; let compDimFits = "N/A";
        if (stoneInfo) {
          const volume = calculateVolume(comp.width, comp.height, comp.depth);
          compWeightKg = volume * stoneInfo.densityKgM3;
          totalWOWeightKg += compWeightKg;
          const compW_mm = comp.width * 1000; const compD_mm = comp.depth * 1000;
          if ((compW_mm <= currentSelectedPallet.lengthMM && compD_mm <= currentSelectedPallet.widthMM) ||
              (compW_mm <= currentSelectedPallet.widthMM && compD_mm <= currentSelectedPallet.lengthMM)) {
            compDimFits = "Yes";
          } else { compDimFits = "No"; }
        }
        componentLogistics.push({ name: comp.name, id: comp.id, weight: `${compWeightKg.toFixed(1)}kg`, dimFits: compDimFits });
      });
      totalWOWeightStr = `${totalWOWeightKg.toFixed(1)} kg`;
      palletLoadStatus = `${totalWOWeightStr} / ${currentSelectedPallet.maxLoadKg} kg`;
    }
    return {
      activeComponentWeight: activeCompWeight, activeComponentFits: activeCompDimFits,
      totalWorkOrderWeight: totalWOWeightStr, palletLoadStatus: palletLoadStatus,
      selectedPalletName: currentSelectedPallet?.name || "N/A", packingNotes: packingNotes,
      componentDetails: componentLogistics,
    };
  }, [activeVisualizedComponent, currentWorkOrder, selectedPalletForInfo]);

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
        if (y < margin + size) { page = pdfDoc.addPage(PageSizes.A4); y = pageHeight - margin; }
        page.drawText(text, { x: margin + indent, y, size, font: isBold ? boldFont : font, color: rgb(0,0,0), lineHeight: size * 1.2 });
        y -= (size * 1.4);
      };

      drawLine(`Radni Nalog: ${currentWorkOrder.projectName}`, 14, true); y -= 5;
      drawLine(`Klijent: ${currentWorkOrder.clientName}`, 11);
      drawLine(`Datum: ${new Date(currentWorkOrder.date).toLocaleDateString('hr-HR')}`, 11);
      drawLine(`Odgovorna Osoba: ${currentWorkOrder.responsiblePerson || 'N/A'}`, 11);
      drawLine(`Izdao: ${currentUser.displayName || currentUser.email}`, 9);
      y -= 10;

      if (captured3DViewImage) { /* ... embed 3D image ... */ }

      let overallTotalCost = 0;
      let calculatedTotalWorkOrderWeight = 0; // For summing up in PDF

      currentWorkOrder.components.forEach((comp, index) => {
        if (index > 0) {y -= 10; page.drawLine({start:{x:margin,y:y+5}, end:{x:pageWidth-margin,y:y+5}, thickness:0.5, color:rgb(0.7,0.7,0.7)});y-=5;}

        const stone = sampleStoneTypes.find(s => s.id === comp.stoneTypeId);
        drawLine(`Komponenta ${index + 1}: ${comp.name}`, 12, true);
        line(`  Materijal: ${stone?.name || 'N/A'}`, 10, false, 10);
        line(`  Dimenzije (ŠxVxD): ${comp.width} x ${comp.height} x ${comp.depth} m`, 10, false, 10);

        let compMaterialCost = 0; let componentWeightKg = 0;
        if (stone) {
          const volume = calculateVolume(comp.width, comp.height, comp.depth);
          compMaterialCost = volume * stone.priceEURPerM3;
          componentWeightKg = volume * stone.densityKgM3;
          calculatedTotalWorkOrderWeight += componentWeightKg; // Sum for PDF total
          line(`  Procijenjena Težina: ${componentWeightKg.toFixed(2)} kg`, 10, false, 10);
        }

        const selectedPallet = samplePalletTypes.find(p => p.id === currentWorkOrder?.logistics.selectedPalletId);
        if (selectedPallet) {
          const compW_mm = comp.width * 1000; const compD_mm = comp.depth * 1000;
          let compFitsPallet = "No";
          if ((compW_mm <= selectedPallet.lengthMM && compD_mm <= selectedPallet.widthMM) ||
              (compW_mm <= selectedPallet.widthMM && compD_mm <= selectedPallet.lengthMM)) {
            compFitsPallet = "Yes";
          }
          line(`  Stane na paletu (dim.): ${compFitsPallet}`, 10, false, 10);
        }

        // ... (edge/face processing cost and details as before) ...
        const componentTotalCost = compMaterialCost; // Simplified for this snippet
        overallTotalCost += componentTotalCost;
        line(`  Trošak Komponente: ${componentTotalCost.toFixed(2)} €`, 10, true, 10);
        y -= 5;

        // Embed 2D drawing for THIS component (if it was the active one when PDF was generated)
        if (fabric2DCanvasRef.current && activeVisualizedComponent?.id === comp.id) {
            const currentFabricCanvas = fabric2DCanvasRef.current;
            const originalBg = currentFabricCanvas.backgroundColor;
            currentFabricCanvas.setBackgroundColor('white', currentFabricCanvas.renderAll.bind(currentFabricCanvas));
            const dataUrl = currentFabricCanvas.toDataURL({ format: 'png', quality: 0.8 });
            currentFabricCanvas.setBackgroundColor(originalBg || '#f8f8f8', currentFabricCanvas.renderAll.bind(currentFabricCanvas));
            try {
                const pngImage = await pdfDoc.embedPng(dataUrl);
                const pngDims = pngImage.scale(0.25); // Adjusted scale
                if (y < pngDims.height + 10) { page = pdfDoc.addPage(PageSizes.A4); y = pageHeight - margin; }
                page.drawImage(pngImage, { x: margin + 150, y: y - pngDims.height, width: pngDims.width, height: pngDims.height });
                y -= (pngDims.height + 5);
            } catch(e) { console.error("Error embedding 2D image for component:", comp.name, e); }
        }

      });

      y -= 10;
      line("Logistika i Pakovanje:", 12, true);
      const finalSelectedPallet = samplePalletTypes.find(p => p.id === currentWorkOrder?.logistics.selectedPalletId);
      line(`  Odabrana Paleta: ${finalSelectedPallet?.name || "Nije odabrana"}`, 10, false, 10);
      if (finalSelectedPallet) {
          line(`  Ukupna Težina Narudžbe: ${calculatedTotalWorkOrderWeight.toFixed(2)} kg`, 10, false, 10);
          line(`  Status Popunjenosti Palete: ${calculatedTotalWorkOrderWeight.toFixed(1)} kg / ${finalSelectedPallet.maxLoadKg} kg`, 10, false, 10);
      }
      line(`  Napomene za Pakovanje: ${currentWorkOrder?.logistics.packingNotes || "Nema napomena."}`, 10, false, 10);
      y -= 10;

      line(`UKUPNI TROŠAK RADNOG NALOGA: ${overallTotalCost.toFixed(2)} €`, 14, true);

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
        {/* ... Header ... */}
        {/* ... Grid Layout ... */}
          {/* Left Column */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* ... WorkOrderList, WorkOrderForm, Cost Section ... */}
            <section className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">Logistics Information</h2>
              <div className="space-y-1 text-sm">
                <p>Selected Pallet: <span className="font-medium float-right">{workOrderLogisticsDisplay.selectedPalletName}</span></p>
                <hr className="my-1 border-gray-200 dark:border-gray-600"/>
                <p className="font-semibold text-xs text-gray-500 dark:text-gray-400">Active Component ({activeVisualizedComponent?.name || ''}):</p>
                <p className="ml-2">  - Weight: <span className="font-medium float-right">{workOrderLogisticsDisplay.activeComponentWeight}</span></p>
                <p className="ml-2">  - Fits Pallet (dims): <span className="font-medium float-right">{workOrderLogisticsDisplay.activeComponentFits}</span></p>
                <hr className="my-1 border-gray-200 dark:border-gray-600"/>
                <p className="font-semibold text-xs text-gray-500 dark:text-gray-400">Entire Work Order:</p>
                <p className="ml-2">  - Total Weight: <span className="font-medium float-right">{workOrderLogisticsDisplay.totalWorkOrderWeight}</span></p>
                <p className="ml-2">  - Pallet Load: <span className="font-medium float-right">{workOrderLogisticsDisplay.palletLoadStatus}</span></p>

                {currentWorkOrder && currentWorkOrder.components && currentWorkOrder.components.length > 0 && (
                  <>
                    <p className="font-semibold text-xs text-gray-500 dark:text-gray-400 mt-2">Component Fit Details:</p>
                    <ul className="list-disc list-inside ml-2 text-xs max-h-20 overflow-y-auto"> {/* Added max-h and overflow */}
                      {workOrderLogisticsDisplay.componentDetails.map(comp => (
                        <li key={comp.id} title={`ID: ${comp.id}`}>
                          {comp.name}: {comp.weight}, Fits: <span className={comp.dimFits === "Yes" ? "text-green-500" : "text-red-500"}>{comp.dimFits}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <hr className="my-1 border-gray-200 dark:border-gray-600"/>
                <p className="mt-1">Packing Notes: <span className="font-light block whitespace-pre-wrap">{workOrderLogisticsDisplay.packingNotes || "N/A"}</span></p>
              </div>
            </section>
          </div>
          {/* ... Center and Right Columns ... */}
        {/* ... Footer Note ... */}
      </div>
    </main>
  );
}

[end of src/app/page.tsx]
