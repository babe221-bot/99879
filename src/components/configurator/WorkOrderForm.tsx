"use client";

import React, { useState, useEffect } from 'react';
import StoneComponentConfig, { StoneComponentData } from './StoneComponentConfig';
// import { sampleStoneTypes, samplePalletTypes } from '@/data/sampleData'; // No longer needed
import { StoneType, PalletType, AppliedEdgeProcessingConfig, AppliedFaceProcessingConfig, LogisticsInfo } from '@/types/stoneData';

export interface WorkOrderData {
  id: string;
  projectName: string;
  clientName: string;
  date: string;
  responsiblePerson?: string;
  components: StoneComponentData[];
  logistics: LogisticsInfo;
}

interface WorkOrderFormProps {
  initialData?: WorkOrderData;
  onSave: (workOrderData: WorkOrderData) => void;
  onActiveComponentChange: (component: StoneComponentData | null) => void;
  activeComponentEdgeProcessing?: AppliedEdgeProcessingConfig;
  activeComponentFaceProcessing?: AppliedFaceProcessingConfig;
  onActiveComponentProcessingUpdate: (
    edgeConfig: AppliedEdgeProcessingConfig,
    faceConfig: AppliedFaceProcessingConfig
  ) => void;
  isSaving?: boolean;
  stoneTypes: StoneType[];
  palletTypes: PalletType[];
}

const createNewComponent = (index: number, firstStoneTypeId?: string): StoneComponentData => ({
  id: `comp_${Date.now()}_${index}`,
  name: `Component ${index + 1}`,
  stoneTypeId: firstStoneTypeId || "",
  width: 1.0, height: 0.2, depth: 0.6,
  edgeProcessingConfig: {},
  faceProcessingConfig: {},
});

const WorkOrderForm: React.FC<WorkOrderFormProps> = ({
  initialData,
  onSave,
  onActiveComponentChange,
  activeComponentEdgeProcessing,
  activeComponentFaceProcessing,
  onActiveComponentProcessingUpdate,
  isSaving = false,
  stoneTypes,
  palletTypes
}) => {
  const [workOrder, setWorkOrder] = useState<WorkOrderData>(() =>
    initialData || {
      id: `wo_${Date.now()}`,
      projectName: "", clientName: "", date: new Date().toISOString().split('T')[0],
      components: [createNewComponent(0, stoneTypes && stoneTypes.length > 0 ? stoneTypes[0].id : "")],
      logistics: { selectedPalletId: palletTypes && palletTypes.length > 0 ? palletTypes[0].id : "", packingNotes: "" },
    }
  );
  const [activeComponentId, setActiveComponentId] = useState<string | null>(
    workOrder.components[0]?.id || null
  );

  // Effect to update initial component/logistics if props (stoneTypes, palletTypes) load after initial state set
  useEffect(() => {
    setWorkOrder(prevWO => {
      const firstComponent = prevWO.components[0];
      const updatedFirstComponent = firstComponent && firstComponent.stoneTypeId === "" && stoneTypes.length > 0
        ? { ...firstComponent, stoneTypeId: stoneTypes[0].id }
        : firstComponent;

      const updatedLogistics = prevWO.logistics.selectedPalletId === "" && palletTypes.length > 0
        ? { ...prevWO.logistics, selectedPalletId: palletTypes[0].id }
        : prevWO.logistics;

      if (updatedFirstComponent !== firstComponent || updatedLogistics !== prevWO.logistics) {
        return {
          ...prevWO,
          components: updatedFirstComponent ? [updatedFirstComponent, ...prevWO.components.slice(1)] : prevWO.components,
          logistics: updatedLogistics
        };
      }
      return prevWO;
    });
  }, [stoneTypes, palletTypes]);


  useEffect(() => {
    if (activeComponentId && workOrder.components.length > 0) {
      const currentActive = workOrder.components.find(c => c.id === activeComponentId);
      onActiveComponentChange(currentActive || workOrder.components[0]);
    } else if (workOrder.components.length > 0) {
      setActiveComponentId(workOrder.components[0].id);
      onActiveComponentChange(workOrder.components[0]);
    }else {
      onActiveComponentChange(null);
    }
  }, [activeComponentId, workOrder.components, onActiveComponentChange]);

  useEffect(() => {
    if (activeComponentId && activeComponentEdgeProcessing && activeComponentFaceProcessing) {
      setWorkOrder(prevWO => ({
        ...prevWO,
        components: prevWO.components.map(comp =>
          comp.id === activeComponentId
          ? { ...comp, edgeProcessingConfig: activeComponentEdgeProcessing, faceProcessingConfig: activeComponentFaceProcessing }
          : comp
        )
      }));
    }
  }, [activeComponentId, activeComponentEdgeProcessing, activeComponentFaceProcessing]);

  const handleWorkOrderInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "selectedPalletId" || name === "packingNotes") {
        setWorkOrder(prev => ({ ...prev, logistics: { ...prev.logistics, [name]: value } }));
    } else {
        setWorkOrder(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleComponentUpdate = (updatedComponent: StoneComponentData, index: number) => {
    setWorkOrder(prev => {
      const newComponents = [...prev.components];
      newComponents[index] = updatedComponent;
      if (updatedComponent.id === activeComponentId) {
        onActiveComponentProcessingUpdate(updatedComponent.edgeProcessingConfig, updatedComponent.faceProcessingConfig);
      }
      return { ...prev, components: newComponents };
    });
  };

  const addComponent = () => {
    const firstStoneId = stoneTypes.length > 0 ? stoneTypes[0].id : "";
    setWorkOrder(prev => ({
      ...prev,
      components: [...prev.components, createNewComponent(prev.components.length, firstStoneId)]
    }));
  };
  const removeComponent = (componentId: string) => { /* ... */ };
  const setActive = (componentId: string) => { /* ... */ };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(workOrder); };

  const btnBase = "px-3 py-1.5 text-xs rounded transition-colors duration-150 ease-in-out";
  const btnPrimary = `${btnBase} bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed`;
  const btnGreenSubmit = "w-full px-4 py-2 text-sm rounded transition-colors duration-150 ease-in-out bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed";


  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-3 bg-white dark:bg-gray-800 rounded-lg shadow h-full flex flex-col">
      <div>
        {/* ... WorkOrderDetails inputs ... */}
      </div>

      <div className="flex-grow overflow-y-auto pr-1 space-y-2 border-t border-b py-2 my-1 dark:border-gray-700">
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200">Stone Components</h3>
        {workOrder.components.map((comp, index) => (
          <StoneComponentConfig key={comp.id} component={comp} isActive={comp.id === activeComponentId}
            onUpdate={(updatedComp) => handleComponentUpdate(updatedComp, index)}
            onRemove={() => removeComponent(comp.id)} onSetActive={() => setActive(comp.id)}
            availableStoneTypes={stoneTypes} // Pass down fetched stone types
          />
        ))}
        <button type="button" onClick={addComponent}
          className={`${btnPrimary} w-full mt-1.5`}>
          + Add Component
        </button>
      </div>

      <div>
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 pt-1.5 border-b pb-1">Logistics & Packing</h3>
        <div className="grid grid-cols-1 gap-2 mt-2 text-sm">
            <div>
                <label htmlFor="selectedPalletId" className="block text-xs font-medium">Pallet Type:</label>
                <select name="selectedPalletId" id="selectedPalletId" value={workOrder.logistics.selectedPalletId || ""} onChange={handleWorkOrderInputChange}
                    className="w-full p-1.5 border-gray-300 rounded dark:bg-gray-700 dark:text-white text-xs">
                    {palletTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                </select>
            </div>
            <div>
                {/* ... packingNotes textarea ... */}
            </div>
        </div>
      </div>

      <div className="pt-2">
        <button type="submit"
          disabled={isSaving}
          className={btnGreenSubmit}
        >
          {isSaving ? "Saving..." : "Save Work Order"}
        </button>
      </div>
    </form>
  );
};

export default WorkOrderForm;
