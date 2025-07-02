"use client";

import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

interface DrawingCanvasProps {
  // Dimensions of the stone face to draw
  stoneWidth: number;
  stoneHeight: number;
  // Canvas dimensions (can be larger than stone face to accommodate padding and dimensions)
  canvasWidth?: number;
  canvasHeight?: number;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  stoneWidth,
  stoneHeight,
  canvasWidth = 500,
  canvasHeight = 400
}) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasEl.current) return;

    // Initialize canvas
    fabricCanvas.current = new fabric.Canvas(canvasEl.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#f8f8f8',
      selection: false, // Disable group selection for a static drawing
    });

    const fc = fabricCanvas.current;

    // Drawing parameters
    const padding = 50; // Padding around the stone rectangle
    const strokeColor = '#333';
    const dimensionColor = '#555';
    const dimensionTextSize = 14;
    const dimensionOffset = 20; // How far the dimension line is from the shape
    const tickSize = 5; // Size of dimension line ticks

    // Calculate scaled dimensions if stone is too large for canvas (simple fit)
    const availableWidth = canvasWidth - 2 * padding - 2 * dimensionOffset;
    const availableHeight = canvasHeight - 2 * padding - 2 * dimensionOffset;

    let drawWidth = stoneWidth;
    let drawHeight = stoneHeight;
    let scale = 1;

    if (stoneWidth > availableWidth || stoneHeight > availableHeight) {
      scale = Math.min(availableWidth / stoneWidth, availableHeight / stoneHeight);
      drawWidth = stoneWidth * scale;
      drawHeight = stoneHeight * scale;
    }

    const rectLeft = padding + dimensionOffset;
    const rectTop = padding + dimensionOffset;

    // Stone Rectangle
    const rect = new fabric.Rect({
      left: rectLeft,
      top: rectTop,
      width: drawWidth,
      height: drawHeight,
      fill: '#e0e0e0',
      stroke: strokeColor,
      strokeWidth: 1,
      selectable: false,
      evented: false,
    });
    fc.add(rect);

    // Dimension: Width
    const dimLineWidth = [
      new fabric.Line([rectLeft, rectTop + drawHeight + dimensionOffset, rectLeft + drawWidth, rectTop + drawHeight + dimensionOffset], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }), // Main line
      new fabric.Line([rectLeft, rectTop + drawHeight + dimensionOffset - tickSize, rectLeft, rectTop + drawHeight + dimensionOffset + tickSize], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }), // Left tick
      new fabric.Line([rectLeft + drawWidth, rectTop + drawHeight + dimensionOffset - tickSize, rectLeft + drawWidth, rectTop + drawHeight + dimensionOffset + tickSize], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }) // Right tick
    ];
    const dimTextWidth = new fabric.Text(stoneWidth.toString(), { // Display original stone width
      left: rectLeft + drawWidth / 2,
      top: rectTop + drawHeight + dimensionOffset + 5,
      fontSize: dimensionTextSize,
      fill: dimensionColor,
      originX: 'center',
      selectable: false, evented: false,
    });
    dimLineWidth.forEach(line => fc.add(line));
    fc.add(dimTextWidth);

    // Dimension: Height
    const dimLineHeight = [
      new fabric.Line([rectLeft - dimensionOffset, rectTop, rectLeft - dimensionOffset, rectTop + drawHeight], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }), // Main line
      new fabric.Line([rectLeft - dimensionOffset - tickSize, rectTop, rectLeft - dimensionOffset + tickSize, rectTop], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }), // Top tick
      new fabric.Line([rectLeft - dimensionOffset - tickSize, rectTop + drawHeight, rectLeft - dimensionOffset + tickSize, rectTop + drawHeight], { stroke: dimensionColor, strokeWidth: 1, selectable: false, evented: false }) // Bottom tick
    ];
    const dimTextHeight = new fabric.Text(stoneHeight.toString(), { // Display original stone height
      left: rectLeft - dimensionOffset - 5,
      top: rectTop + drawHeight / 2,
      fontSize: dimensionTextSize,
      fill: dimensionColor,
      originX: 'right',
      originY: 'center',
      angle: -90, // Rotate text for vertical dimension
      selectable: false, evented: false,
    });
    dimLineHeight.forEach(line => fc.add(line));
    fc.add(dimTextHeight);

    fc.renderAll();

    // Cleanup
    return () => {
      if (fc) {
        fc.dispose();
        fabricCanvas.current = null;
      }
    };
  }, [stoneWidth, stoneHeight, canvasWidth, canvasHeight]);

  return (
    <div style={{ border: '1px solid #ccc', display: 'inline-block' }}>
      <canvas ref={canvasEl} />
    </div>
  );
};

export default DrawingCanvas;
