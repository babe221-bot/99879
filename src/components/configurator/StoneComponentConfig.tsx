"use client";

import React from 'react';
import { StoneType, sampleStoneTypes } from '@/data/sampleData';

export interface StoneComponentData {
  id: string; // unique ID for this component in a work order
  name: string; // e.g., "Gazište 1", "Čelo A"
  stoneTypeId: string; // ID of selected StoneType
  width: number;
  height: number;
  depth: number;
  // Later: edgeProcessing: AppliedEdgeProcessingConfig; faceProcessing: AppliedFaceProcessingConfig;
}

interface StoneComponentConfigProps {
  component: StoneComponentData;
  onUpdate: (updatedComponent: StoneComponentData) => void;
  onRemove?: () => void; // Optional: if we allow removing components
}

const StoneComponentConfig: React.FC<StoneComponentConfigProps> = ({ component, onUpdate }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let numericValue = ['width', 'height', 'depth'].includes(name) ? parseFloat(value) : value;
    if (['width', 'height', 'depth'].includes(name) && isNaN(numericValue as number)) {
        numericValue = 0; // Default to 0 if parsing fails
    }
    onUpdate({ ...component, [name]: numericValue });
  };

  return (
    <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-md mb-3 bg-gray-50 dark:bg-gray-750">
      <div className="flex justify-between items-center mb-2">
        <input
          type="text"
          name="name"
          value={component.name}
          onChange={handleInputChange}
          placeholder="Component Name (e.g., Gazište 1)"
          className="p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white text-sm flex-grow"
        />
        {/* Add remove button later if needed */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <div>
          <label htmlFor={`stoneTypeId-${component.id}`} className="block text-xs font-medium text-gray-500 dark:text-gray-400">Stone Type:</label>
          <select
            id={`stoneTypeId-${component.id}`}
            name="stoneTypeId"
            value={component.stoneTypeId}
            onChange={handleInputChange}
            className="w-full p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white"
          >
            {sampleStoneTypes.map(st => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`width-${component.id}`} className="block text-xs font-medium text-gray-500 dark:text-gray-400">Width (W):</label>
          <input
            id={`width-${component.id}`}
            type="number"
            name="width"
            value={component.width}
            onChange={handleInputChange}
            placeholder="Width"
            className="w-full p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white"
            step="0.01"
          />
        </div>
        <div>
          <label htmlFor={`height-${component.id}`} className="block text-xs font-medium text-gray-500 dark:text-gray-400">Height (H):</label>
          <input
            id={`height-${component.id}`}
            type="number"
            name="height"
            value={component.height}
            onChange={handleInputChange}
            placeholder="Height"
            className="w-full p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white"
            step="0.01"
          />
        </div>
        <div>
          <label htmlFor={`depth-${component.id}`} className="block text-xs font-medium text-gray-500 dark:text-gray-400">Depth (D):</label>
          <input
            id={`depth-${component.id}`}
            type="number"
            name="depth"
            value={component.depth}
            onChange={handleInputChange}
            placeholder="Depth"
            className="w-full p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white"
            step="0.01"
          />
        </div>
      </div>
    </div>
  );
};

export default StoneComponentConfig;
