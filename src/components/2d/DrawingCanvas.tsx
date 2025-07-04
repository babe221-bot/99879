"use client";

import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { AppliedEdgeProcessingConfig } from '@/types/stoneData'; // Keep for fallback or future use
// sampleEdgeProcessingDefinitions is not needed if SVG contains processed shape
// import { sampleEdgeProcessingDefinitions } from '@/data/sampleData';

export type DrawingViewType = 'top' | 'front' | 'side';

interface DrawingCanvasProps {
  stoneWidth: number;  // Overall W of the 3D block (in original units, e.g., meters)
  stoneHeight: number; // Overall H of the 3D block
  stoneDepth: number;  // Overall D of the 3D block
  viewType: DrawingViewType;
  svgData: string | null; // New prop for SVG string
  edgeProcessingConfig?: AppliedEdgeProcessingConfig; // Kept for fallback or if SVG fails
  canvasWidth?: number;
  canvasHeight?: number;
  pixelsPerUnit?: number;
  onCanvasReady?: (canvas: fabric.Canvas | null) => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  stoneWidth,
  stoneHeight,
  stoneDepth,
  viewType,
  svgData,
  edgeProcessingConfig = {}, // Default to empty if not provided
  canvasWidth = 500,
  canvasHeight = 350,
  pixelsPerUnit = 100,
  onCanvasReady
}) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasEl.current) return;

    const newCanvas = new fabric.Canvas(canvasEl.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#FFFFFF', // Default to white for cleaner SVG export potentially
      selection: false,
    });
    fabricCanvas.current = newCanvas;
    if (onCanvasReady) {
      onCanvasReady(newCanvas);
    }

    const fc = newCanvas;
    fc.clear();

    const padding = 20;
    const strokeColor = '#333';
    const dimensionColor = '#555';
    const dimensionTextSize = 12;
    const dimensionOffset = 20;
    const tickSize = 5;


    if (svgData) {
      fabric.loadSVGFromString(svgData, (objects, options) => {
        if (!fc || fc.disposed) return; // Check if canvas is still alive
        if (!objects || objects.length === 0) {
          console.warn("SVG data resulted in no Fabric objects.");
          const text = new fabric.Text("Error loading 2D projection.", {
              left: canvasWidth / 2, top: canvasHeight / 2, fontSize: 16,
              originX: 'center', originY: 'center', fill: 'red'
          });
          fc.add(text);
          fc.renderAll();
          return;
        }

        const group = fabric.util.groupSVGElements(objects, options);

        const groupWidth = group.getScaledWidth();
        const groupHeight = group.getScaledHeight();

        if (groupWidth === 0 || groupHeight === 0) {
          console.warn("SVG group has zero width or height after initial load.");
          const text = new fabric.Text("Empty 2D projection.", {
              left: canvasWidth / 2, top: canvasHeight / 2, fontSize: 16,
              originX: 'center', originY: 'center', fill: dimensionColor
          });
          fc.add(text);
          fc.renderAll();
          return;
        }

        const availableWidth = canvasWidth - 2 * padding;
        const availableHeight = canvasHeight - 2 * padding - (dimensionTextSize * 3); // Extra space for title

        const scaleX = availableWidth / groupWidth;
        const scaleY = availableHeight / groupHeight;
        const finalScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1 initially

        group.scaleX = finalScale;
        group.scaleY = finalScale;

        // Center the group
        group.left = (canvasWidth - (groupWidth * finalScale)) / 2;
        group.top = (canvasHeight - (groupHeight * finalScale)) / 2 + (dimensionTextSize * 1.5); // Push down for title

        group.set({ borderColor: 'transparent', selectable: false, evented: false });

        group.forEachObject((obj: any) => {
            obj.set({
                selectable: false, evented: false,
                stroke: obj.stroke || strokeColor, // Preserve original stroke or default
                fill: obj.fill === 'none' || !obj.fill ? 'rgba(224,224,224,0.3)' : obj.fill, // Light fill if none
            });
            if (obj.type === 'path' || obj.type === 'line' || obj.type === 'polyline' || obj.type === 'polygon') {
                if (!obj.strokeWidth || obj.strokeWidth === 0) {
                    obj.strokeWidth = 0.5 / finalScale;
                } else {
                    obj.strokeWidth /= finalScale; // Adjust existing stroke width
                }
            }
        });

        fc.add(group);
        // TODO: Add dimensioning based on the group's bounding box
        // This is complex. For now, dimensions are omitted for SVG.
        fc.renderAll();
      });
    } else {
      // Fallback: No SVG data, draw simple bounding box (or message)
      // For now, display "No 2D projection data available."
      const text = new fabric.Text("Generating 2D View...", { // Or "Select component"
          left: canvasWidth / 2, top: canvasHeight / 2, fontSize: 16,
          originX: 'center', originY: 'center', fill: dimensionColor
      });
      fc.add(text);
      fc.renderAll();
    }

    // View Label (common for both SVG and fallback)
    let viewLabelText = "";
    if (viewType === 'top') viewLabelText = "TLOCRT (POGLED ODOZGO)";
    else if (viewType === 'front') viewLabelText = "NACRT (POGLED SPREDA)";
    else if (viewType === 'side') viewLabelText = "BOČNI NACRT";
    const viewLabel = new fabric.Text(viewLabelText, {
        left: canvasWidth / 2, top: padding / (svgData ? 1.5 : 1),
        fontSize: dimensionTextSize + 1, fontWeight: 'bold', fill: strokeColor,
        originX: 'center', originY: 'center', selectable: false, evented: false,
    });

    // Only add label if there's some content or SVG data was attempted
    if (svgData || fc.getObjects().length > 0) {
        fc.add(viewLabel);
        // fc.bringToFront(viewLabel); // Not always reliable with async SVG load
    }
    fc.renderAll(); // One final render

    return () => {
      if (onCanvasReady) onCanvasReady(null);
      if (fc) { fc.dispose(); fabricCanvas.current = null; }
    };
  }, [svgData, viewType, canvasWidth, canvasHeight, pixelsPerUnit, onCanvasReady]); // stoneWidth/Height/Depth and edgeConfig removed as direct deps for SVG path

  return (
    <div style={{ border: '1px solid #ccc', display: 'inline-block', margin: 'auto', backgroundColor: '#FFFFFF' }}>
      <canvas ref={canvasEl} />
    </div>
  );
};

export default DrawingCanvas;
