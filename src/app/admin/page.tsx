// src/app/admin/page.tsx
"use client";

import React from 'react';
// import Link from 'next/link'; // Could add Link back to home

const AdminPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-200">
          Admin Dashboard
        </h1>
        <p className="text-md text-gray-600 dark:text-gray-400 mt-2">
          Management interface for application data.
        </p>
      </header>

      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Future Functionality
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-3">
          This section is intended for administrators to manage the core data of the application, such as:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 mb-6">
          <li>Stone Types (e.g., Kirmenjak, Kanfanar) - Add, Edit, Delete</li>
          <li>Edge Processing Definitions (e.g., Chamfer C1, Round R3) - Add, Edit, Delete</li>
          <li>Face Processing Definitions (e.g., Polishing, Bush Hammering) - Add, Edit, Delete</li>
          <li>Pallet Types and Specifications - Add, Edit, Delete</li>
          <li>User Management (Assigning roles like 'admin') - Potentially</li>
        </ul>

        <div className="border-t dark:border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Current Status:</h3>
          <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/[.3] p-3 rounded-md">
            This is a placeholder page. Full CRUD (Create, Read, Update, Delete) functionality for the items listed above needs to be implemented.
            Currently, shared data like stone types and processing definitions are populated in Firestore via a developer-run seeding script (`seedInitialData` in `src/lib/seedFirestore.ts`).
          </p>
        </div>

        {/*
        <div className="mt-8 text-center">
          <Link href="/" legacyBehavior>
            <a className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              &larr; Back to Main Application
            </a>
          </Link>
        </div>
        */}
      </div>
    </div>
  );
};

export default AdminPage;
