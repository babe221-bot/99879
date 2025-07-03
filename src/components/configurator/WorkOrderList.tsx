"use client";

import React, { useEffect, useState } from 'react';
import { WorkOrderData } from './WorkOrderForm'; // Assuming WorkOrderData is exported
import { listUserWorkOrders, deleteWorkOrder as deleteWorkOrderFromDb } from '@/lib/firestoreService';
import { useAuth } from '@/context/AuthContext';

interface WorkOrderListProps {
  onLoadWorkOrder: (workOrderId: string) => void;
  onNewWorkOrder: () => void; // To clear the form for a new entry
  currentWorkOrderId?: string | null; // To highlight the active one
}

const WorkOrderList: React.FC<WorkOrderListProps> = ({ onLoadWorkOrder, onNewWorkOrder, currentWorkOrderId }) => {
  const { currentUser } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrderData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkOrders = async () => {
    if (!currentUser) {
      setWorkOrders([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const userWorkOrders = await listUserWorkOrders(currentUser.uid);
      setWorkOrders(userWorkOrders);
    } catch (err) {
      console.error("Error fetching work orders:", err);
      setError("Failed to load work orders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [currentUser]);

  const handleDelete = async (workOrderId: string) => {
    if (!window.confirm("Are you sure you want to delete this work order?")) return;
    try {
      await deleteWorkOrderFromDb(workOrderId);
      // Refresh list after delete
      fetchWorkOrders();
      // If the deleted one was active, tell parent to clear form
      if (currentWorkOrderId === workOrderId) {
        onNewWorkOrder();
      }
    } catch (err) {
      console.error("Error deleting work order:", err);
      alert("Failed to delete work order.");
    }
  };

  if (!currentUser) {
    return <div className="p-2 text-xs text-gray-500 dark:text-gray-400">Please sign in to view work orders.</div>;
  }

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg shadow mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200">My Work Orders</h3>
        <button
          onClick={onNewWorkOrder}
          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
        >
          + New
        </button>
      </div>
      {isLoading && <p className="text-xs text-gray-500">Loading work orders...</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!isLoading && !error && workOrders.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">No work orders found.</p>
      )}
      {!isLoading && !error && workOrders.length > 0 && (
        <ul className="space-y-1 max-h-60 overflow-y-auto text-xs">
          {workOrders.map(wo => (
            <li key={wo.id}
                className={`p-1.5 rounded flex justify-between items-center cursor-pointer
                            ${currentWorkOrderId === wo.id
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                onClick={() => onLoadWorkOrder(wo.id)}
            >
              <span className="truncate" title={wo.projectName}>
                {wo.projectName || `Work Order ${wo.id.substring(0,6)}`}
                <span className="text-gray-400 dark:text-gray-500 text-xxs ml-1"> ({new Date(wo.date).toLocaleDateString('hr-HR')})</span>
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(wo.id); }}
                className="ml-2 px-1.5 py-0.5 text-xxs bg-red-500 text-white rounded hover:bg-red-700"
                title="Delete"
              >
                X
              </button>
            </li>
          ))}
        </ul>
      )}
       <button
          onClick={fetchWorkOrders}
          className="mt-2 w-full px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
          title="Refresh Work Order List"
        >
          Refresh List
        </button>
    </div>
  );
};

export default WorkOrderList;
