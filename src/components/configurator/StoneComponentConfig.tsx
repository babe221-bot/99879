"use client";

import React from 'react';
import { StoneType } from '@/types/stoneData'; // Use the main StoneType
import { AppliedEdgeProcessingConfig, AppliedFaceProcessingConfig } from '@/types/stoneData';

export interface StoneComponentData {
  id: string;
  name: string;
  stoneTypeId: string;
  width: number;
  height: number;
  depth: number;
  edgeProcessingConfig: AppliedEdgeProcessingConfig;
  faceProcessingConfig: AppliedFaceProcessingConfig;
  // quantity: number; // Might add later
}

interface StoneComponentConfigProps {
  component: StoneComponentData;
  isActive: boolean;
  onUpdate: (updatedComponent: StoneComponentData) => void;
  onRemove: () => void;
  onSetActive: () => void;
  availableStoneTypes: StoneType[]; // New prop
}

const StoneComponentConfig: React.FC<StoneComponentConfigProps> = ({
  component,
  isActive,
  onUpdate,
  onRemove,
  onSetActive,
  availableStoneTypes // Destructure new prop
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let numericValue = ['width', 'height', 'depth'].includes(name) ? parseFloat(value) : value;
    if (['width', 'height', 'depth'].includes(name) && isNaN(numericValue as number)) {
        numericValue = 0;
    }
    onUpdate({ ...component, [name]: numericValue });
  };

  return (
    <div className={`p-3 border rounded-md mb-3 ${isActive ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50 dark:bg-blue-900/[.15]' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-750'}`}>
      <div className="flex justify-between items-center mb-2">
        <input
          type="text"
          name="name"
          value={component.name}
          onChange={handleInputChange}
          placeholder="Component Name (e.g., Gazište 1)"
          className="p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white text-sm flex-grow mr-2"
        />
        <button
          type="button"
          onClick={onSetActive}
          className={`text-xs px-2 py-1 rounded mr-2 ${isActive ? 'bg-blue-500 text-white cursor-default' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500'}`}
          disabled={isActive}
          title={isActive ? "Currently Active" : "Set as Active for 3D/2D View"}
        >
          {isActive ? "Active" : "Set Active"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          title="Remove Component"
        >
          X
        </button>
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
            {availableStoneTypes.map(st => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`width-${component.id}`} className="block text-xs font-medium text-gray-500 dark:text-gray-400">Width (W):</label>
          <input
            id={`width-${component.id}`} type="number" name="width" value={component.width}
            onChange={handleInputChange} placeholder="Width" step="0.01"
            className="w-full p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor={`height-${component.id}`} className="block text-xs font-medium text-gray-500 dark:text-gray-400">Height (H):</label>
          <input
            id={`height-${component.id}`} type="number" name="height" value={component.height}
            onChange={handleInputChange} placeholder="Height" step="0.01"
            className="w-full p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor={`depth-${component.id}`} className="block text-xs font-medium text-gray-500 dark:text-gray-400">Depth (D):</label>
          <input
            id={`depth-${component.id}`} type="number" name="depth" value={component.depth}
            onChange={handleInputChange} placeholder="Depth" step="0.01"
            className="w-full p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
      {/* Placeholder for showing/editing edge/face processing for this specific component */}
      {/* <div className="mt-2 text-xs text-gray-400">
        Edge Proc: {Object.keys(component.edgeProcessingConfig || {}).length} groups |
        Face Proc: {Object.keys(component.faceProcessingConfig || {}).length} faces
      </div> */}
    </div>
  );
};

export default StoneComponentConfig;
