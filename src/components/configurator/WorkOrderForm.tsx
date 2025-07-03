"use client";

import React, { useState, useEffect } from 'react';
import StoneComponentConfig, { StoneComponentData } from './StoneComponentConfig';
import { sampleStoneTypes, samplePalletTypes } from '@/data/sampleData';
import { AppliedEdgeProcessingConfig, AppliedFaceProcessingConfig, LogisticsInfo, PalletType } from '@/types/stoneData';

export interface WorkOrderData {
  id: string;
  projectName: string;
  clientName: string;
  date: string;
  responsiblePerson?: string;
  components: StoneComponentData[];
  logistics: LogisticsInfo; // Added logistics info
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
}

const createNewComponent = (index: number): StoneComponentData => ({
  id: `comp_${Date.now()}_${index}`,
  name: `Component ${index + 1}`,
  stoneTypeId: sampleStoneTypes[0]?.id || "",
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
  onActiveComponentProcessingUpdate
}) => {
  const [workOrder, setWorkOrder] = useState<WorkOrderData>(
    initialData || {
      id: `wo_${Date.now()}`,
      projectName: "", clientName: "", date: new Date().toISOString().split('T')[0],
      components: [createNewComponent(0)],
      logistics: { selectedPalletId: samplePalletTypes[0]?.id || "", packingNotes: "" }, // Initialize logistics
    }
  );
  const [activeComponentId, setActiveComponentId] = useState<string | null>(
    workOrder.components[0]?.id || null
  );

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

  const addComponent = () => { /* ... as before ... */
    setWorkOrder(prev => ({
      ...prev,
      components: [...prev.components, createNewComponent(prev.components.length)]
    }));
  };
  const removeComponent = (componentId: string) => { /* ... as before ... */
    setWorkOrder(prev => {
      const newComponents = prev.components.filter(c => c.id !== componentId);
      if (componentId === activeComponentId) {
        const newActiveComp = newComponents[0] || null;
        setActiveComponentId(newActiveComp?.id || null);
        onActiveComponentChange(newActiveComp);
      }
      return { ...prev, components: newComponents };
    });
  };
  const setActive = (componentId: string) => { /* ... as before ... */
    const newActiveComp = workOrder.components.find(c => c.id === componentId);
    if (newActiveComp) {
      setActiveComponentId(componentId);
      onActiveComponentChange(newActiveComp);
      onActiveComponentProcessingUpdate(newActiveComp.edgeProcessingConfig, newActiveComp.faceProcessingConfig);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(workOrder); };

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-3 bg-white dark:bg-gray-800 rounded-lg shadow h-full flex flex-col">
      <div> {/* Work Order Details Section */}
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-1.5">Work Order Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm">
          <div>
            <label htmlFor="projectName" className="block text-xs font-medium">Project Name:</label>
            <input type="text" name="projectName" id="projectName" value={workOrder.projectName} onChange={handleWorkOrderInputChange}
              className="w-full p-1.5 border-gray-300 rounded dark:bg-gray-700 dark:text-white text-xs" required />
          </div>
          {/* ... other WO fields ... */}
          <div>
            <label htmlFor="clientName" className="block text-xs font-medium">Client Name:</label>
            <input type="text" name="clientName" id="clientName" value={workOrder.clientName} onChange={handleWorkOrderInputChange}
              className="w-full p-1.5 border-gray-300 rounded dark:bg-gray-700 dark:text-white text-xs" />
          </div>
          <div>
            <label htmlFor="date" className="block text-xs font-medium">Date:</label>
            <input type="date" name="date" id="date" value={workOrder.date} onChange={handleWorkOrderInputChange}
              className="w-full p-1.5 border-gray-300 rounded dark:bg-gray-700 dark:text-white text-xs" required />
          </div>
          <div>
            <label htmlFor="responsiblePerson" className="block text-xs font-medium">Responsible Person:</label>
            <input type="text" name="responsiblePerson" id="responsiblePerson" value={workOrder.responsiblePerson || ""} onChange={handleWorkOrderInputChange}
              className="w-full p-1.5 border-gray-300 rounded dark:bg-gray-700 dark:text-white text-xs" />
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-1 space-y-2 border-t border-b py-2 my-1 dark:border-gray-700"> {/* Components Section */}
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200">Stone Components</h3>
        {workOrder.components.map((comp, index) => (
          <StoneComponentConfig key={comp.id} component={comp} isActive={comp.id === activeComponentId}
            onUpdate={(updatedComp) => handleComponentUpdate(updatedComp, index)}
            onRemove={() => removeComponent(comp.id)} onSetActive={() => setActive(comp.id)} />
        ))}
        <button type="button" onClick={addComponent}
          className="w-full mt-1.5 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
          + Add Component
        </button>
      </div>

      <div> {/* Logistics Section */}
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 pt-1.5 border-b pb-1">Logistics & Packing</h3>
        <div className="grid grid-cols-1 gap-2 mt-2 text-sm">
            <div>
                <label htmlFor="selectedPalletId" className="block text-xs font-medium">Pallet Type:</label>
                <select name="selectedPalletId" id="selectedPalletId" value={workOrder.logistics.selectedPalletId || ""} onChange={handleWorkOrderInputChange}
                    className="w-full p-1.5 border-gray-300 rounded dark:bg-gray-700 dark:text-white text-xs">
                    {samplePalletTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="packingNotes" className="block text-xs font-medium">Packing Notes:</label>
                <textarea name="packingNotes" id="packingNotes" value={workOrder.logistics.packingNotes || ""} onChange={handleWorkOrderInputChange}
                    rows={2} className="w-full p-1.5 border-gray-300 rounded dark:bg-gray-700 dark:text-white text-xs" />
            </div>
        </div>
      </div>

      <div className="pt-2"> {/* Save Button */}
        <button type="submit"
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
          title="Simulates saving; actual Firestore save not yet implemented for full WO.">
          Save Work Order (Simulated)
        </button>
      </div>
    </form>
  );
};

export default WorkOrderForm;
