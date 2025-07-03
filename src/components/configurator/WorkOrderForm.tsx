"use client";

import React, { useState } from 'react';
import StoneComponentConfig, { StoneComponentData } from './StoneComponentConfig';
import { sampleStoneTypes } from '@/data/sampleData';

export interface WorkOrderData {
  id: string; // work order ID
  projectName: string;
  clientName: string;
  date: string;
  responsiblePerson?: string;
  components: StoneComponentData[];
}

interface WorkOrderFormProps {
  // Initial work order data if editing, or undefined for new
  initialData?: WorkOrderData;
  onSave: (workOrderData: WorkOrderData) => void;
  // This prop will be used to update the main 3D/2D views
  onActiveComponentChange: (component: StoneComponentData | null) => void;
}

const WorkOrderForm: React.FC<WorkOrderFormProps> = ({ initialData, onSave, onActiveComponentChange }) => {
  const defaultComponent: StoneComponentData = {
    id: `comp_${Date.now()}`,
    name: "Main Component",
    stoneTypeId: sampleStoneTypes[0]?.id || "",
    width: 1.5, height: 1.5, depth: 1.0, // Default dimensions
  };

  const [workOrder, setWorkOrder] = useState<WorkOrderData>(
    initialData || {
      id: `wo_${Date.now()}`,
      projectName: "",
      clientName: "",
      date: new Date().toISOString().split('T')[0],
      components: [defaultComponent],
    }
  );

  // Effect to update parent when the first component's data changes
  // This makes the first component implicitly the "active" one for 3D/2D views
  React.useEffect(() => {
    if (workOrder.components.length > 0) {
      onActiveComponentChange(workOrder.components[0]);
    } else {
      onActiveComponentChange(null);
    }
  }, [workOrder.components, onActiveComponentChange]);


  const handleWorkOrderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setWorkOrder(prev => ({ ...prev, [name]: value }));
  };

  const handleComponentUpdate = (updatedComponent: StoneComponentData, index: number) => {
    setWorkOrder(prev => {
      const newComponents = [...prev.components];
      newComponents[index] = updatedComponent;
      return { ...prev, components: newComponents };
    });
  };

  // TODO: Add functions for addComponent, removeComponent

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(workOrder);
    // console.log("Work Order Saved (simulated):", workOrder);
    // alert("Work Order Saved (simulated)!");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Work Order Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <label htmlFor="projectName" className="block text-xs font-medium text-gray-500 dark:text-gray-400">Project Name:</label>
          <input type="text" name="projectName" id="projectName" value={workOrder.projectName} onChange={handleWorkOrderInputChange}
            className="w-full p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white" required />
        </div>
        <div>
          <label htmlFor="clientName" className="block text-xs font-medium text-gray-500 dark:text-gray-400">Client Name:</label>
          <input type="text" name="clientName" id="clientName" value={workOrder.clientName} onChange={handleWorkOrderInputChange}
            className="w-full p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white" />
        </div>
        <div>
          <label htmlFor="date" className="block text-xs font-medium text-gray-500 dark:text-gray-400">Date:</label>
          <input type="date" name="date" id="date" value={workOrder.date} onChange={handleWorkOrderInputChange}
            className="w-full p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white" required />
        </div>
         <div>
          <label htmlFor="responsiblePerson" className="block text-xs font-medium text-gray-500 dark:text-gray-400">Responsible Person:</label>
          <input type="text" name="responsiblePerson" id="responsiblePerson" value={workOrder.responsiblePerson || ""} onChange={handleWorkOrderInputChange}
            className="w-full p-1.5 border border-gray-300 rounded dark:bg-gray-700 dark:text-white" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 pt-2 border-b pb-1">Stone Components</h3>
      {workOrder.components.map((comp, index) => (
        <StoneComponentConfig
          key={comp.id}
          component={comp}
          onUpdate={(updatedComp) => handleComponentUpdate(updatedComp, index)}
        />
      ))}
      {/* Button to add more components later */}
      {/* <button type="button" onClick={addComponent} className="text-sm text-blue-500 hover:text-blue-700">
        + Add Component
      </button> */}

      {/* <div className="pt-4">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          Save Work Order (Simulated)
        </button>
      </div> */}
    </form>
  );
};

export default WorkOrderForm;
