import { db } from './firebase'; // Your initialized Firestore instance
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp // Import Timestamp
} from 'firebase/firestore';
import { WorkOrderData } from '@/components/configurator/WorkOrderForm'; // Assuming this is the correct path

const WORKORDERS_COLLECTION = 'workOrders';

// Firestore typically stores its own server timestamp.
// If WorkOrderData has a 'date' field that's a string, it's fine.
// If it needs to be a Firestore Timestamp, the interface and data handling need adjustment.
// For now, assuming 'date' in WorkOrderData is a string (e.g., from <input type="date">).

// We need to ensure the WorkOrderData being saved is compatible with Firestore (e.g., no undefined values for top-level fields if not desired)
// For simplicity, we assume WorkOrderData is directly serializable.
// Firestore does not store 'undefined'. If a field is undefined, it's omitted.

interface StorableWorkOrderData extends Omit<WorkOrderData, 'id'> {
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // id is handled by Firestore document ID
}


// Create/Save a new Work Order
export const saveWorkOrder = async (userId: string, workOrderData: WorkOrderData): Promise<string> => {
  try {
    const dataToSave: Omit<StorableWorkOrderData, 'createdAt' | 'updatedAt'> & { createdAt?: Timestamp, updatedAt?: Timestamp } = {
      ...workOrderData,
      userId,
      // Firestore will add server timestamps if configured with serverTimestamp() placeholder,
      // or we can add client-side timestamps. For this example, client-side for simplicity.
      // However, it's better practice to use serverTimestamp() via FieldValue.serverTimestamp().
      // For this basic setup, let's use client-side Timestamps.
    };

    // Remove 'id' from components if it's the Firestore ID, or ensure it's a client-generated unique ID
    // The current WorkOrderData has id for the WO itself, and components have their own ids.
    // The main WO id will be the Firestore document id.
    const docData: StorableWorkOrderData = {
        projectName: workOrderData.projectName,
        clientName: workOrderData.clientName,
        date: workOrderData.date, // Assuming string date is fine
        responsiblePerson: workOrderData.responsiblePerson,
        components: workOrderData.components, // Array of objects, Firestore handles this
        logistics: workOrderData.logistics,   // Nested object, Firestore handles this
        userId: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, WORKORDERS_COLLECTION), docData);
    return docRef.id;
  } catch (error) {
    console.error("Error saving work order: ", error);
    throw error; // Re-throw to be handled by caller
  }
};

// Update an existing Work Order
export const updateWorkOrder = async (workOrderId: string, workOrderData: Partial<Omit<WorkOrderData, 'id' | 'userId' | 'createdAt'>>) : Promise<void> => {
  try {
    const workOrderRef = doc(db, WORKORDERS_COLLECTION, workOrderId);
    const dataToUpdate = {
        ...workOrderData,
        updatedAt: Timestamp.now()
    };
    await updateDoc(workOrderRef, dataToUpdate);
  } catch (error) {
    console.error("Error updating work order: ", error);
    throw error;
  }
};

// Get a single Work Order by ID
export const getWorkOrder = async (workOrderId: string): Promise<WorkOrderData | null> => {
  try {
    const workOrderRef = doc(db, WORKORDERS_COLLECTION, workOrderId);
    const docSnap = await getDoc(workOrderRef);

    if (docSnap.exists()) {
      // Combine Firestore doc ID with data
      return { id: docSnap.id, ...docSnap.data() } as WorkOrderData;
      // Casting needed as docSnap.data() doesn't know specific types like `components` array structure
      // or the exact type of `date` (string vs Timestamp).
      // If date is stored as Timestamp, it needs conversion back to string for the form.
    } else {
      console.log("No such document!");
      return null;
    }
  } catch (error) {
    console.error("Error getting work order: ", error);
    throw error;
  }
};

// List all Work Orders for a specific user
export const listUserWorkOrders = async (userId: string): Promise<WorkOrderData[]> => {
  try {
    const q = query(collection(db, WORKORDERS_COLLECTION), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const workOrders: WorkOrderData[] = [];
    querySnapshot.forEach((doc) => {
      workOrders.push({ id: doc.id, ...doc.data() } as WorkOrderData);
    });
    return workOrders;
  } catch (error) {
    console.error("Error listing work orders: ", error);
    throw error;
  }
};

// Delete a Work Order
export const deleteWorkOrder = async (workOrderId: string): Promise<void> => {
  try {
    const workOrderRef = doc(db, WORKORDERS_COLLECTION, workOrderId);
    await deleteDoc(workOrderRef);
  } catch (error) {
    console.error("Error deleting work order: ", error);
    throw error;
  }
};
