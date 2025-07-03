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
  Timestamp
} from 'firebase/firestore';
import { WorkOrderData } from '@/components/configurator/WorkOrderForm';
import { StoneType, EdgeProcessingDefinition, FaceProcessingDefinition, PalletType } from '@/types/stoneData';

const WORKORDERS_COLLECTION = 'workOrders';
const STONETYPES_COLLECTION = 'stoneTypes';
const EDGE_DEFINITIONS_COLLECTION = 'edgeDefinitions';
const FACE_DEFINITIONS_COLLECTION = 'faceDefinitions';
const PALLETTYPES_COLLECTION = 'palletTypes';


interface StorableWorkOrderData extends Omit<WorkOrderData, 'id'> {
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Work Order CRUD ---
export const saveWorkOrder = async (userId: string, workOrderData: Omit<WorkOrderData, 'id'>): Promise<string> => {
  try {
    const docData: StorableWorkOrderData = {
        ...workOrderData,
        userId: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, WORKORDERS_COLLECTION), docData);
    return docRef.id;
  } catch (error) { console.error("Error saving work order: ", error); throw error; }
};

export const updateWorkOrder = async (workOrderId: string, workOrderData: Partial<Omit<WorkOrderData, 'id' | 'userId' | 'createdAt'>>) : Promise<void> => {
  try {
    const workOrderRef = doc(db, WORKORDERS_COLLECTION, workOrderId);
    await updateDoc(workOrderRef, { ...workOrderData, updatedAt: Timestamp.now() });
  } catch (error) { console.error("Error updating work order: ", error); throw error; }
};

export const getWorkOrder = async (workOrderId: string): Promise<WorkOrderData | null> => {
  try {
    const docSnap = await getDoc(doc(db, WORKORDERS_COLLECTION, workOrderId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as WorkOrderData;
    }
    return null;
  } catch (error) { console.error("Error getting work order: ", error); throw error; }
};

export const listUserWorkOrders = async (userId: string): Promise<WorkOrderData[]> => {
  try {
    const q = query(collection(db, WORKORDERS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkOrderData));
  } catch (error) { console.error("Error listing work orders: ", error); throw error; }
};

export const deleteWorkOrder = async (workOrderId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, WORKORDERS_COLLECTION, workOrderId));
  } catch (error) { console.error("Error deleting work order: ", error); throw error; }
};


// --- Shared Data Fetching ---

// Generic fetch function for collections
async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    console.error(`Error fetching ${collectionName}: `, error);
    throw error;
  }
}

export const getStoneTypes = (): Promise<StoneType[]> => {
  return fetchCollection<StoneType>(STONETYPES_COLLECTION);
};

export const getEdgeProcessingDefinitions = (): Promise<EdgeProcessingDefinition[]> => {
  return fetchCollection<EdgeProcessingDefinition>(EDGE_DEFINITIONS_COLLECTION);
};

export const getFaceProcessingDefinitions = (): Promise<FaceProcessingDefinition[]> => {
  return fetchCollection<FaceProcessingDefinition>(FACE_DEFINITIONS_COLLECTION);
};

export const getPalletTypes = (): Promise<PalletType[]> => {
  return fetchCollection<PalletType>(PALLETTYPES_COLLECTION);
};
