"use client";

import React, { useState } from 'react';
import Scene, { AppliedProcessingConfig, HighlightedFaceGroup, ProcessingType, ProcessableGroup } from "@/components/3d/Scene";
import DrawingCanvas from '@/components/2d/DrawingCanvas'; // Import the 2D canvas

export default function HomePage() {
  const [processingConfig, setProcessingConfig] = useState<AppliedProcessingConfig>({});
  const [activeFaceGroup, setActiveFaceGroup] = useState<ProcessableGroup | 'NONE'>('NONE');

  // Example dimensions for the 2D drawing - these could be dynamic later
  const [stoneDrawnWidth, setStoneDrawnWidth] = useState(150); // e.g. 1.5m = 150 units
  const [stoneDrawnHeight, setStoneDrawnHeight] = useState(100); // e.g. 1.0m = 100 units


  const handleFaceClick = (groupClicked: HighlightedFaceGroup) => {
    if (groupClicked === 'TOP' || groupClicked === 'BOTTOM' || groupClicked === 'SIDES_FRONT_BACK' || groupClicked === 'SIDES_LEFT_RIGHT') {
      setActiveFaceGroup(groupClicked as ProcessableGroup);
      // Potentially update stoneDrawnWidth/Height based on the selected face group and 3D model dimensions
      // For now, keeping them static. Example:
      // const main3DBlockSize = [1.5, 1.5, 1]; // w,h,d from Scene.tsx StoneBlock
      // if (groupClicked === 'TOP' || groupClicked === 'BOTTOM') {
      //   setStoneDrawnWidth(main3DBlockSize[0] * 100); setStoneDrawnHeight(main3DBlockSize[2] * 100);
      // } else if (groupClicked === 'SIDES_FRONT_BACK') {
      //   setStoneDrawnWidth(main3DBlockSize[0] * 100); setStoneDrawnHeight(main3DBlockSize[1] * 100);
      // } else if (groupClicked === 'SIDES_LEFT_RIGHT') {
      //   setStoneDrawnWidth(main3DBlockSize[2] * 100); setStoneDrawnHeight(main3DBlockSize[1] * 100);
      // }
    } else {
      setActiveFaceGroup('NONE');
    }
  };

  const applyProcessing = (type: ProcessingType) => {
    if (activeFaceGroup === 'NONE') {
      alert("Please click on a face group on the stone to select it first.");
      return;
    }
    setProcessingConfig(prevConfig => {
      const newConfig = { ...prevConfig };
      if (prevConfig[activeFaceGroup] === type) {
        delete newConfig[activeFaceGroup];
      } else {
        newConfig[activeFaceGroup] = type;
      }
      return newConfig;
    });
  };

  const clearAllProcessing = () => {
    setProcessingConfig({});
    setActiveFaceGroup('NONE');
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 lg:p-12 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-7xl">
        <header className="py-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Stone Configurator</h1>
          <p className="text-md text-gray-600 dark:text-gray-300">
            Interactive 3D Stone Visualization & 2D Drawing
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 3D Scene takes more space */}
          <div className="lg:col-span-2 w-full min-h-[60vh] md:min-h-[70vh] rounded-lg shadow-xl overflow-hidden bg-gray-700">
            <Scene
              currentProcessingConfig={processingConfig}
              onFaceClickForSelection={handleFaceClick}
            />
          </div>

          {/* Controls and Processing Panel */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-200">Controls & Processing</h2>
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-1 text-gray-600 dark:text-gray-300">Selected Face Group:</h3>
              <p className="text-md text-blue-600 dark:text-blue-400 font-semibold">
                {activeFaceGroup === 'NONE' ? "None (click a face on the stone)" : activeFaceGroup}
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => applyProcessing('CHAMFER_C1')}
                disabled={activeFaceGroup === 'NONE'}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors"
              >
                Apply/Toggle Chamfer C1 (0.1)
              </button>
            </div>
            <div className="mt-6">
               <button
                onClick={clearAllProcessing}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              > Clear All Processing </button>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-300 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-1 text-gray-600 dark:text-gray-300">3D View Controls:</h3>
              <ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <li>**Orbit:** Click & drag (Left Mouse)</li>
                <li>**Zoom:** Mouse Wheel</li>
                <li>**Pan:** Click & drag (Right Mouse / Ctrl+Left)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 2D Drawing Section */}
        <section className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-200">2D Technical Drawing (Face View)</h2>
          <div className="flex justify-center items-center">
            <DrawingCanvas
              stoneWidth={stoneDrawnWidth}
              stoneHeight={stoneDrawnHeight}
              canvasWidth={500}
              canvasHeight={350}
            />
          </div>
          <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
            Displaying face dimensions. Units are nominal (e.g., mm or cm). Actual scale based on input.
          </p>
        </section>

        <div className="mt-4 p-2 text-xs text-center text-gray-500 dark:text-gray-400">
          Note: CSG operations for edge processing are experimental. Chamfer C1 is implemented for TOP edges.
          UVs and complex shapes might require further refinement.
        </div>
      </div>
    </main>
  );
}
