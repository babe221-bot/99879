"use client";

import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

export type DrawingViewType = 'top' | 'front' | 'side';

interface DrawingCanvasProps {
  stoneWidth: number;  // Overall W of the 3D block
  stoneHeight: number; // Overall H of the 3D block
  stoneDepth: number;  // Overall D of the 3D block
  viewType: DrawingViewType;
  canvasWidth?: number;
  canvasHeight?: number;
  // TODO: Add props for chamfer/round details to draw them if possible
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  stoneWidth,
  stoneHeight,
  stoneDepth,
  viewType,
  canvasWidth = 500,
  canvasHeight = 350 // Adjusted default height
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
    const dimensionTextSize = 14;
    const dimensionOffset = 20;
    const tickSize = 5;

    let dim1: number, dim2: number; // Dimension 1 (horizontal on canvas), Dimension 2 (vertical on canvas)
    let dim1Label: string, dim2Label: string;

    switch (viewType) {
      case 'top': // Tlocrt: Width x Depth
        dim1 = stoneWidth; dim1Label = `Širina: ${stoneWidth}`; // Horizontal on canvas
        dim2 = stoneDepth; dim2Label = `Dubina: ${stoneDepth}`; // Vertical on canvas
        break;
      case 'front': // Nacrt: Width x Height
        dim1 = stoneWidth; dim1Label = `Širina: ${stoneWidth}`;
        dim2 = stoneHeight; dim2Label = `Visina: ${stoneHeight}`;
        break;
      case 'side': // Side view: Depth x Height
        dim1 = stoneDepth; dim1Label = `Dubina: ${stoneDepth}`;
        dim2 = stoneHeight; dim2Label = `Visina: ${stoneHeight}`;
        break;
      default:
        return; // Should not happen
    }

    const availableWidth = canvasWidth - 2 * padding - 2 * dimensionOffset;
    const availableHeight = canvasHeight - 2 * padding - 2 * dimensionOffset;

    let drawDim1 = dim1;
    let drawDim2 = dim2;
    if (dim1 > availableWidth || dim2 > availableHeight) {
      const scale = Math.min(availableWidth / dim1, availableHeight / dim2);
      drawDim1 = dim1 * scale;
      drawDim2 = dim2 * scale;
    }

    const rectLeft = padding + dimensionOffset;
    const rectTop = padding + dimensionOffset;

    const rect = new fabric.Rect({
      left: rectLeft, top: rectTop, width: drawDim1, height: drawDim2,
      fill: '#e0e0e0', stroke: strokeColor, strokeWidth: 1,
      selectable: false, evented: false,
    });
    fc.add(rect);

    // Dimension for dim1 (Horizontal on canvas)
    const dimLine1 = [
      new fabric.Line([rectLeft, rectTop + drawDim2 + dimensionOffset, rectLeft + drawDim1, rectTop + drawDim2 + dimensionOffset], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }),
      new fabric.Line([rectLeft, rectTop + drawDim2 + dimensionOffset - tickSize, rectLeft, rectTop + drawDim2 + dimensionOffset + tickSize], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }),
      new fabric.Line([rectLeft + drawDim1, rectTop + drawDim2 + dimensionOffset - tickSize, rectLeft + drawDim1, rectTop + drawDim2 + dimensionOffset + tickSize], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false })
    ];
    const text1 = new fabric.Text(dim1.toString(), { // Use original dimension for text
      left: rectLeft + drawDim1 / 2, top: rectTop + drawDim2 + dimensionOffset + 5,
      fontSize: dimensionTextSize, fill: dimensionColor, originX: 'center', selectable: false, evented: false,
    });
    dimLine1.forEach(line => fc.add(line));
    fc.add(text1);

    // Dimension for dim2 (Vertical on canvas)
    const dimLine2 = [
      new fabric.Line([rectLeft - dimensionOffset, rectTop, rectLeft - dimensionOffset, rectTop + drawDim2], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }),
      new fabric.Line([rectLeft - dimensionOffset - tickSize, rectTop, rectLeft - dimensionOffset + tickSize, rectTop], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }),
      new fabric.Line([rectLeft - dimensionOffset - tickSize, rectTop + drawDim2, rectLeft - dimensionOffset + tickSize, rectTop + drawDim2], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false })
    ];
    const text2 = new fabric.Text(dim2.toString(), { // Use original dimension for text
      left: rectLeft - dimensionOffset - 5, top: rectTop + drawDim2 / 2,
      fontSize: dimensionTextSize, fill: dimensionColor, originX: 'right', originY: 'center', angle: -90,
      selectable: false, evented: false,
    });
    dimLine2.forEach(line => fc.add(line));
    fc.add(text2);

    // View Label (e.g., "Tlocrt (POGLED ODOZGO)")
    let viewLabelText = "";
    if (viewType === 'top') viewLabelText = "TLOCRT (POGLED ODOZGO)";
    else if (viewType === 'front') viewLabelText = "NACRT (POGLED SPREDA)";
    else if (viewType === 'side') viewLabelText = "BOČNI NACRT";

    const viewLabel = new fabric.Text(viewLabelText, {
        left: canvasWidth / 2,
        top: padding / 2,
        fontSize: dimensionTextSize + 2,
        fontWeight: 'bold',
        fill: strokeColor,
        originX: 'center',
        originY: 'center',
        selectable: false, evented: false,
    });
    fc.add(viewLabel);

    fc.renderAll();

    return () => {
      if (fc) { fc.dispose(); fabricCanvas.current = null; }
    };
  }, [stoneWidth, stoneHeight, stoneDepth, viewType, canvasWidth, canvasHeight]);

  return (
    <div style={{ border: '1px solid #ccc', display: 'inline-block', margin: 'auto' }}>
      <canvas ref={canvasEl} />
    </div>
  );
};

export default DrawingCanvas;
