import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

/**
 * Custom hook for managing brolay data from Firebase
 * Handles all CRUD operations and real-time updates
 */
export const useBrolays = (db) => {
  const [parlays, setParlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load brolays from Firebase with real-time listener
  useEffect(() => {
    if (!db) return;

    const brolaysRef = collection(db, 'parlays');

    // Set up real-time listener with better error handling
    const unsubscribe = onSnapshot(
      brolaysRef,
      {
        // Add options for better mobile/flaky connection handling
        includeMetadataChanges: false  // Only react to actual data changes, not metadata
      },
      (snapshot) => {
        const brolaysData = snapshot.docs.map(doc => {
          const data = doc.data();
          // Remove any 'id' field from the document data to prevent conflicts
          const { id: _, ...dataWithoutId } = data;
          return {
            ...dataWithoutId,
            id: doc.id  // Always use Firebase's document ID
          };
        });
        setParlays(brolaysData);
        setLoading(false);
        setError(null); // Clear any previous errors on successful update
      },
      (err) => {
        console.error('🔥 Firestore listener error:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);

        // Don't set loading to false - keep trying to reconnect
        // Firestore will automatically retry the connection
        setError(err);

        // Only show user-friendly error for certain cases
        if (err.code === 'permission-denied') {
          console.error('❌ Permission denied - check Firestore rules');
        } else if (err.code === 'unavailable') {
          console.warn('⚠️ Firestore temporarily unavailable - will retry automatically');
        }
      }
    );

    // Cleanup listener on unmount
    return () => {
      console.log('🧹 Cleaning up Firestore listener');
      unsubscribe();
    };
  }, [db]);

  // Add a new brolay
  const addBrolay = async (brolayData) => {
    try {
      const brolaysRef = collection(db, 'parlays');
      const docRef = await addDoc(brolaysRef, brolayData);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('Error adding brolay:', err);
      return { success: false, error: err };
    }
  };

  // Update an existing brolay
  const updateBrolay = async (brolayId, updates) => {
    try {
      // Ensure ID is a string
      const idString = String(brolayId);
      const brolayRef = doc(db, 'parlays', idString);
      await updateDoc(brolayRef, updates);
      return { success: true };
    } catch (err) {
      console.error('Error updating brolay:', err);
      return { success: false, error: err };
    }
  };

  // Delete a brolay
  const deleteBrolay = async (brolayId) => {
    try {
      // Ensure ID is a string
      const idString = String(brolayId);
      const brolayRef = doc(db, 'parlays', idString);
      await deleteDoc(brolayRef);
      return { success: true };
    } catch (err) {
      console.error('Error deleting brolay:', err);
      return { success: false, error: err };
    }
  };

  return {
    parlays,
    loading,
    error,
    addBrolay,
    updateBrolay,
    deleteBrolay,
  };
};
