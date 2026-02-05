/**
 * useBetSlipParser Hook
 * Manages Tesseract.js OCR worker, image processing, and bet slip parsing
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { processImageForOCR, validateImageFile } from '../utils/imageProcessing';
import { parseBetSlipText, detectSportFromESPN } from '../utils/betSlipParser';

/**
 * Hook for parsing bet slip images using OCR
 * @param {Object} options - Configuration options
 * @returns {Object} - Parser state and methods
 */
export const useBetSlipParser = (options = {}) => {
  const { learnedTeams = [], learnedPlayers = [] } = options;

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [parsedPicks, setParsedPicks] = useState([]);

  // Refs
  const workerRef = useRef(null);
  const abortRef = useRef(false);

  /**
   * Initialize Tesseract worker
   */
  const initWorker = useCallback(async () => {
    if (workerRef.current) {
      return workerRef.current;
    }

    try {
      console.log('[useBetSlipParser] Initializing Tesseract worker...');
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
            setProgressMessage('Recognizing text...');
          } else if (m.status === 'loading tesseract core') {
            setProgressMessage('Loading OCR engine...');
          } else if (m.status === 'initializing tesseract') {
            setProgressMessage('Initializing...');
          } else if (m.status === 'loading language traineddata') {
            setProgressMessage('Loading language data...');
          }
          console.log('[Tesseract]', m.status, m.progress);
        }
      });

      workerRef.current = worker;
      console.log('[useBetSlipParser] Worker initialized');
      return worker;
    } catch (err) {
      console.error('[useBetSlipParser] Failed to init worker:', err);
      throw new Error('Failed to initialize OCR engine');
    }
  }, []);

  /**
   * Cleanup worker on unmount
   */
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        console.log('[useBetSlipParser] Terminating worker on unmount');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  /**
   * Parse a bet slip image file
   * @param {File} file - Image file to parse
   * @returns {Promise<Object>} - { success: boolean, picks: Array, ocrText: string, error?: string }
   */
  const parseImage = useCallback(async (file) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setOcrText('');
    setParsedPicks([]);
    abortRef.current = false;

    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      setProgressMessage('Processing image...');
      setProgress(10);

      // Process image for OCR
      const processedImage = await processImageForOCR(file, {
        maxWidth: 2000,
        maxHeight: 2000,
        enhanceContrast: true
      });

      if (abortRef.current) {
        return { success: false, picks: [], ocrText: '', error: 'Cancelled' };
      }

      setProgress(20);
      setProgressMessage('Initializing OCR...');

      // Initialize worker
      const worker = await initWorker();

      if (abortRef.current) {
        return { success: false, picks: [], ocrText: '', error: 'Cancelled' };
      }

      setProgress(30);
      setProgressMessage('Recognizing text...');

      // Run OCR
      const { data } = await worker.recognize(processedImage);

      if (abortRef.current) {
        return { success: false, picks: [], ocrText: '', error: 'Cancelled' };
      }

      const text = data.text;
      setOcrText(text);

      console.log('[useBetSlipParser] OCR Result:', text);

      setProgress(85);
      setProgressMessage('Detecting sport from today\'s games...');

      // Try to detect sport by checking today's ESPN scoreboards
      let espnDetectedSport = null;
      try {
        espnDetectedSport = await detectSportFromESPN(text);
        console.log('[useBetSlipParser] ESPN detected sport:', espnDetectedSport);
      } catch (err) {
        console.warn('[useBetSlipParser] ESPN sport detection failed, falling back to keywords:', err.message);
      }

      if (abortRef.current) {
        return { success: false, picks: [], ocrText: '', error: 'Cancelled' };
      }

      setProgress(90);
      setProgressMessage('Parsing picks...');

      // Parse the OCR text, passing ESPN-detected sport if available
      const picks = parseBetSlipText(text, { learnedTeams, learnedPlayers, espnDetectedSport });

      setProgress(100);
      setProgressMessage('Complete!');
      setParsedPicks(picks);
      setIsProcessing(false);

      if (picks.length === 0) {
        return {
          success: false,
          picks: [],
          ocrText: text,
          error: 'No picks found in image. Try a clearer screenshot or enter picks manually.'
        };
      }

      return {
        success: true,
        picks,
        ocrText: text
      };

    } catch (err) {
      console.error('[useBetSlipParser] Error:', err);
      const errorMessage = err.message || 'Failed to parse bet slip';
      setError(errorMessage);
      setIsProcessing(false);
      return {
        success: false,
        picks: [],
        ocrText: '',
        error: errorMessage
      };
    }
  }, [initWorker, learnedTeams, learnedPlayers]);

  /**
   * Cancel ongoing processing
   */
  const cancelProcessing = useCallback(() => {
    abortRef.current = true;
    setIsProcessing(false);
    setProgress(0);
    setProgressMessage('');
    setError(null);
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setProgressMessage('');
    setError(null);
    setOcrText('');
    setParsedPicks([]);
    abortRef.current = false;
  }, []);

  /**
   * Update a parsed pick
   * @param {number} index - Index of pick to update
   * @param {Object} updates - Fields to update
   */
  const updateParsedPick = useCallback((index, updates) => {
    setParsedPicks(prev => {
      const newPicks = [...prev];
      if (newPicks[index]) {
        newPicks[index] = { ...newPicks[index], ...updates };
      }
      return newPicks;
    });
  }, []);

  /**
   * Remove a parsed pick
   * @param {number} index - Index of pick to remove
   */
  const removeParsedPick = useCallback((index) => {
    setParsedPicks(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    // State
    isProcessing,
    progress,
    progressMessage,
    error,
    ocrText,
    parsedPicks,

    // Methods
    parseImage,
    cancelProcessing,
    reset,
    updateParsedPick,
    removeParsedPick
  };
};

export default useBetSlipParser;
