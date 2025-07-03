import { db } from './firebase'; // Your initialized Firestore instance
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import {
  sampleStoneTypes,
  sampleEdgeProcessingDefinitions,
  sampleFaceProcessingDefinitions,
  samplePalletTypes
} from '@/data/sampleData'; // Adjust path as necessary

// Collection names (should match those in firestoreService.ts)
const STONETYPES_COLLECTION = 'stoneTypes';
const EDGE_DEFINITIONS_COLLECTION = 'edgeDefinitions';
const FACE_DEFINITIONS_COLLECTION = 'faceDefinitions';
const PALLETTYPES_COLLECTION = 'palletTypes';

// Generic function to seed a collection
async function seedCollection<T extends { id: string }>(
  collectionName: string,
  data: T[],
  overwriteExisting: boolean = false // Set to true to overwrite if document exists
) {
  console.log(`Seeding collection: ${collectionName}...`);
  let count = 0;
  for (const item of data) {
    if (!item.id) {
      console.warn(`  Skipping item in ${collectionName} due to missing ID:`, item);
      continue;
    }
    const docRef = doc(db, collectionName, item.id);

    if (!overwriteExisting) {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        // console.log(`  Document ${item.id} already exists in ${collectionName}. Skipping.`);
        continue; // Skip if document exists and not overwriting
      }
    }

    // Firestore cannot store 'undefined' values directly in a document.
    // We need to strip them or convert them to null if that's intended.
    // For simplicity, we'll strip top-level undefined properties.
    const dataToSet: any = { ...item };
    Object.keys(dataToSet).forEach(key => {
      if (dataToSet[key] === undefined) {
        delete dataToSet[key];
      }
    });

    try {
      await setDoc(docRef, dataToSet);
      // console.log(`  Added/Updated document ${item.id} in ${collectionName}.`);
      count++;
    } catch (error) {
      console.error(`  Error adding/updating document ${item.id} in ${collectionName}:`, error);
    }
  }
  console.log(`Seeding for ${collectionName} complete. ${count} documents processed/added.`);
}

// Main seeding function
export const seedInitialData = async (overwrite: boolean = false) => {
  console.log("Starting Firestore data seeding...");

  await seedCollection(STONETYPES_COLLECTION, sampleStoneTypes, overwrite);
  await seedCollection(EDGE_DEFINITIONS_COLLECTION, sampleEdgeProcessingDefinitions, overwrite);
  await seedCollection(FACE_DEFINITIONS_COLLECTION, sampleFaceProcessingDefinitions, overwrite);
  await seedCollection(PALLETTYPES_COLLECTION, samplePalletTypes, overwrite);

  console.log("Firestore data seeding finished.");
  alert("Firestore data seeding process finished. Check console for details.");
};

// How a developer might run this (e.g., in a useEffect in a dev-only admin page, or a separate script):
/*
1. Import seedInitialData:
   import { seedInitialData } from '@/lib/seedFirestore';

2. Call it (e.g., on a button click or automatically in a dev environment):
   const handleSeed = async () => {
     if (process.env.NODE_ENV === 'development') { // Safety check
       if (window.confirm("This will seed/overwrite initial data in Firestore. Continue?")) {
         await seedInitialData(true); // Pass true to overwrite existing documents with same ID
       }
     } else {
       alert("Seeding is only allowed in development environment.");
     }
   };
   // <button onClick={handleSeed}>Seed Database</button>
*/
