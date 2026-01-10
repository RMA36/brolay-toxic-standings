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
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      brolaysRef,
      (snapshot) => {
        const brolaysData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setParlays(brolaysData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching brolays:', err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
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
      const brolayRef = doc(db, 'brolays', brolayId);
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
      const brolayRef = doc(db, 'brolays', brolayId);
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
