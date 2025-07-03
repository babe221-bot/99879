"use client";

import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { AppliedEdgeProcessingConfig, EdgeProcessableGroup } from '@/types/stoneData';
import { sampleEdgeProcessingDefinitions } from '@/data/sampleData';

export type DrawingViewType = 'top' | 'front' | 'side';

interface DrawingCanvasProps {
  stoneWidth: number;
  stoneHeight: number;
  stoneDepth: number;
  viewType: DrawingViewType;
  edgeProcessingConfig?: AppliedEdgeProcessingConfig; // Pass edge processing
  canvasWidth?: number;
  canvasHeight?: number;
  pixelsPerUnit?: number; // For scaling chamfer size
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  stoneWidth,
  stoneHeight,
  stoneDepth,
  viewType,
  edgeProcessingConfig = {},
  canvasWidth = 500,
  canvasHeight = 350,
  pixelsPerUnit = 100, // Default scaling for chamfers if needed
}) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasEl.current) return;

    fabricCanvas.current = new fabric.Canvas(canvasEl.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#f8f8f8',
      selection: false,
    });
    const fc = fabricCanvas.current;

    const padding = 50;
    const strokeColor = '#333';
    const dimensionColor = '#555';
    const chamferLineColor = '#FF5733'; // A distinct color for chamfer lines
    const dimensionTextSize = 14;
    const dimensionOffset = 20;
    const tickSize = 5;

    let dim1: number, dim2: number;
    let dim1Original: number, dim2Original: number;

    switch (viewType) {
      case 'top':
        dim1Original = stoneWidth; dim2Original = stoneDepth;
        break;
      case 'front':
        dim1Original = stoneWidth; dim2Original = stoneHeight;
        break;
      case 'side':
        dim1Original = stoneDepth; dim2Original = stoneHeight;
        break;
      default: return;
    }

    const availableWidth = canvasWidth - 2 * padding - 2 * dimensionOffset;
    const availableHeight = canvasHeight - 2 * padding - 2 * dimensionOffset;

    let scale = 1;
    if (dim1Original * pixelsPerUnit > availableWidth || dim2Original * pixelsPerUnit > availableHeight) {
      scale = Math.min(availableWidth / (dim1Original * pixelsPerUnit), availableHeight / (dim2Original * pixelsPerUnit));
    }

    dim1 = dim1Original * pixelsPerUnit * scale; // Drawn dimension 1 on canvas
    dim2 = dim2Original * pixelsPerUnit * scale; // Drawn dimension 2 on canvas

    const rectLeft = padding + dimensionOffset;
    const rectTop = padding + dimensionOffset;

    const rect = new fabric.Rect({
      left: rectLeft, top: rectTop, width: dim1, height: dim2,
      fill: '#e0e0e0', stroke: strokeColor, strokeWidth: 1,
      selectable: false, evented: false,
    });
    fc.add(rect);

    // Simplified Chamfer Drawing Logic
    const drawChamferLines = (chamferSize2D: number) => {
      if (chamferSize2D <= 0) return;
      const chamferLines: fabric.Line[] = [];
      // Top-left corner
      chamferLines.push(new fabric.Line([rectLeft, rectTop + chamferSize2D, rectLeft + chamferSize2D, rectTop], { stroke: chamferLineColor, strokeWidth: 1 }));
      // Top-right
      chamferLines.push(new fabric.Line([rectLeft + dim1 - chamferSize2D, rectTop, rectLeft + dim1, rectTop + chamferSize2D], { stroke: chamferLineColor, strokeWidth: 1 }));
      // Bottom-left
      chamferLines.push(new fabric.Line([rectLeft, rectTop + dim2 - chamferSize2D, rectLeft + chamferSize2D, rectTop + dim2], { stroke: chamferLineColor, strokeWidth: 1 }));
      // Bottom-right
      chamferLines.push(new fabric.Line([rectLeft + dim1 - chamferSize2D, rectTop + dim2, rectLeft + dim1, rectTop + dim2 - chamferSize2D], { stroke: chamferLineColor, strokeWidth: 1 }));
      chamferLines.forEach(line => fc.add(line));
    };

    let relevantEdgeGroup: EdgeProcessableGroup | null = null;
    if (viewType === 'front' || viewType === 'side') { // Top/Bottom edges are visible
        relevantEdgeGroup = 'TOP'; // Check TOP, then BOTTOM
    } else if (viewType === 'top') { // All 4 "horizontal" edge groups are relevant (TOP, BOTTOM)
        relevantEdgeGroup = 'TOP'; // Could also be 'BOTTOM', simplified for now
    }

    if (relevantEdgeGroup) {
        const procId = edgeProcessingConfig[relevantEdgeGroup] || edgeProcessingConfig.BOTTOM; // Check TOP then BOTTOM
        if (procId) {
            const procDef = sampleEdgeProcessingDefinitions.find(p => p.id === procId);
            if (procDef && procDef.type === 'CHAMFER' && procDef.parameters.width) {
                // Scale the 3D chamfer size (e.g., 0.1 units) to 2D pixels
                const chamferSize3D = procDef.parameters.width / 10; // From StoneBlock's scaling
                const chamferSize2D = chamferSize3D * pixelsPerUnit * scale;
                drawChamferLines(chamferSize2D);
            }
        }
    }


    // Dimension for dim1 (Horizontal on canvas)
    const dimLine1Arr = [
      new fabric.Line([rectLeft, rectTop + dim2 + dimensionOffset, rectLeft + dim1, rectTop + dim2 + dimensionOffset], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }),
      new fabric.Line([rectLeft, rectTop + dim2 + dimensionOffset - tickSize, rectLeft, rectTop + dim2 + dimensionOffset + tickSize], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }),
      new fabric.Line([rectLeft + dim1, rectTop + dim2 + dimensionOffset - tickSize, rectLeft + dim1, rectTop + dim2 + dimensionOffset + tickSize], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false })
    ];
    const text1 = new fabric.Text(dim1Original.toString(), {
      left: rectLeft + dim1 / 2, top: rectTop + dim2 + dimensionOffset + 5,
      fontSize: dimensionTextSize, fill: dimensionColor, originX: 'center', selectable: false, evented: false,
    });
    dimLine1Arr.forEach(line => fc.add(line));
    fc.add(text1);

    // Dimension for dim2 (Vertical on canvas)
    const dimLine2Arr = [
      new fabric.Line([rectLeft - dimensionOffset, rectTop, rectLeft - dimensionOffset, rectTop + dim2], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }),
      new fabric.Line([rectLeft - dimensionOffset - tickSize, rectTop, rectLeft - dimensionOffset + tickSize, rectTop], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }),
      new fabric.Line([rectLeft - dimensionOffset - tickSize, rectTop + dim2, rectLeft - dimensionOffset + tickSize, rectTop + dim2], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false })
    ];
    const text2 = new fabric.Text(dim2Original.toString(), {
      left: rectLeft - dimensionOffset - 5, top: rectTop + dim2 / 2,
      fontSize: dimensionTextSize, fill: dimensionColor, originX: 'right', originY: 'center', angle: -90,
      selectable: false, evented: false,
    });
    dimLine2Arr.forEach(line => fc.add(line));
    fc.add(text2);

    let viewLabelText = "";
    if (viewType === 'top') viewLabelText = "TLOCRT (POGLED ODOZGO)";
    else if (viewType === 'front') viewLabelText = "NACRT (POGLED SPREDA)";
    else if (viewType === 'side') viewLabelText = "BOČNI NACRT";

    const viewLabel = new fabric.Text(viewLabelText, {
        left: canvasWidth / 2, top: padding / 2, fontSize: dimensionTextSize + 2,
        fontWeight: 'bold', fill: strokeColor, originX: 'center', originY: 'center',
        selectable: false, evented: false,
    });
    fc.add(viewLabel);

    fc.renderAll();

    return () => {
      if (fc) { fc.dispose(); fabricCanvas.current = null; }
    };
  }, [stoneWidth, stoneHeight, stoneDepth, viewType, edgeProcessingConfig, canvasWidth, canvasHeight, pixelsPerUnit]);

  return (
    <div style={{ border: '1px solid #ccc', display: 'inline-block', margin: 'auto' }}>
      <canvas ref={canvasEl} />
    </div>
  );
};

export default DrawingCanvas;
