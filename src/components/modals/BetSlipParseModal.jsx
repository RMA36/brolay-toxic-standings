/**
 * BetSlipParseModal Component
 * Modal for displaying OCR parsing progress and results from bet slip images
 */

import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../common/Button';
import { SPORTS, PICK_TYPES, PLAYERS } from '../../constants/sports';
import { formatParsedPick } from '../../utils/betSlipParser';
import { createImagePreview, revokeImagePreview } from '../../utils/imageProcessing';

const BetSlipParseModal = ({
  isOpen,
  onClose,
  imageFile,
  isProcessing,
  progress,
  progressMessage,
  error,
  ocrText,
  parsedPicks,
  onUpdatePick,
  onRemovePick,
  onConfirm,
  isMobile = false
}) => {
  const [showRawText, setShowRawText] = useState(false);
  const [editingPick, setEditingPick] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  // Create image preview when file changes
  React.useEffect(() => {
    if (imageFile) {
      const url = createImagePreview(imageFile);
      setImagePreviewUrl(url);
      return () => revokeImagePreview(url);
    }
  }, [imageFile]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (parsedPicks.length > 0) {
      onConfirm(parsedPicks);
    }
    onClose();
  };

  const handleEditPick = (index) => {
    setEditingPick(editingPick === index ? null : index);
  };

  const handleUpdateField = (index, field, value) => {
    onUpdatePick(index, { [field]: value });
  };

  const getConfidenceBadge = (confidence) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-green-900/50 text-green-400">
            <CheckCircle size={12} />
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-yellow-900/50 text-yellow-400">
            <AlertTriangle size={12} />
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-red-900/50 text-red-400">
            <AlertTriangle size={12} />
            Low
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div
        className="bg-gray-900 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto border border-yellow-500/20"
        style={{ maxWidth: isMobile ? '100%' : '800px' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-yellow-400">Parse Bet Slip</h2>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        <div className="p-4 md:p-6">
          {/* Image Preview */}
          {imagePreviewUrl && (
            <div className="mb-4">
              <div className="bg-gray-800 rounded-lg p-2 flex justify-center">
                <img
                  src={imagePreviewUrl}
                  alt="Bet slip preview"
                  className="max-h-48 object-contain rounded"
                />
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">{progressMessage || 'Processing...'}</span>
                <span className="text-sm text-yellow-400">{progress}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5">
                <div
                  className="bg-yellow-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isProcessing && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={20} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Raw OCR Text (collapsible) */}
          {ocrText && !isProcessing && (
            <div className="mb-4">
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 mb-2"
              >
                {showRawText ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span>Raw OCR Text {showRawText ? '(tap to hide)' : '(tap to expand)'}</span>
              </button>
              {showRawText && (
                <div className="bg-gray-800 rounded p-3 text-xs font-mono text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {ocrText}
                </div>
              )}
            </div>
          )}

          {/* Parsed Picks */}
          {!isProcessing && parsedPicks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300">
                Parsed Picks ({parsedPicks.length})
              </h3>

              {parsedPicks.map((pick, index) => (
                <div
                  key={index}
                  className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                >
                  {/* Pick Header */}
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-400">
                          {pick.sport}
                        </span>
                        <span className="text-xs text-gray-600">|</span>
                        <span className="text-xs text-gray-400">
                          {pick.betType}
                        </span>
                        {getConfidenceBadge(pick.confidence)}
                      </div>
                      <div className="text-white font-medium">
                        {formatParsedPick(pick)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditPick(index)}
                        className="p-1.5 text-gray-400 hover:text-yellow-400 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onRemovePick(index)}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Edit Form (expandable) */}
                  {editingPick === index && (
                    <div className="border-t border-gray-700 p-3 bg-gray-850">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Sport */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Sport</label>
                          <select
                            value={pick.sport}
                            onChange={(e) => handleUpdateField(index, 'sport', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:border-yellow-500 focus:outline-none"
                          >
                            {SPORTS.map(sport => (
                              <option key={sport} value={sport}>{sport}</option>
                            ))}
                          </select>
                        </div>

                        {/* Bet Type */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Bet Type</label>
                          <select
                            value={pick.betType}
                            onChange={(e) => handleUpdateField(index, 'betType', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:border-yellow-500 focus:outline-none"
                          >
                            {PICK_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        {/* Team/Player */}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">
                            {pick.betType === 'Player Prop' ? 'Player' : 'Team'}
                          </label>
                          <input
                            type="text"
                            value={pick.team}
                            onChange={(e) => handleUpdateField(index, 'team', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:border-yellow-500 focus:outline-none"
                          />
                        </div>

                        {/* Spread (for Spread bets) */}
                        {pick.betType === 'Spread' && (
                          <>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Spread</label>
                              <input
                                type="text"
                                value={pick.spread}
                                onChange={(e) => handleUpdateField(index, 'spread', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:border-yellow-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Favorite/Dog</label>
                              <select
                                value={pick.favorite}
                                onChange={(e) => handleUpdateField(index, 'favorite', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:border-yellow-500 focus:outline-none"
                              >
                                <option value="Favorite">Favorite</option>
                                <option value="Dog">Dog</option>
                              </select>
                            </div>
                          </>
                        )}

                        {/* Total (for Total bets) */}
                        {pick.betType === 'Total' && (
                          <>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Total</label>
                              <input
                                type="text"
                                value={pick.total}
                                onChange={(e) => handleUpdateField(index, 'total', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:border-yellow-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Over/Under</label>
                              <select
                                value={pick.overUnder}
                                onChange={(e) => handleUpdateField(index, 'overUnder', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:border-yellow-500 focus:outline-none"
                              >
                                <option value="Over">Over</option>
                                <option value="Under">Under</option>
                              </select>
                            </div>
                          </>
                        )}

                        {/* Player Prop fields */}
                        {pick.betType === 'Player Prop' && (
                          <>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Line</label>
                              <input
                                type="text"
                                value={pick.line}
                                onChange={(e) => handleUpdateField(index, 'line', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:border-yellow-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Over/Under</label>
                              <select
                                value={pick.overUnder}
                                onChange={(e) => handleUpdateField(index, 'overUnder', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:border-yellow-500 focus:outline-none"
                              >
                                <option value="Over">Over</option>
                                <option value="Under">Under</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-400 mb-1">Prop Type</label>
                              <input
                                type="text"
                                value={pick.propType}
                                onChange={(e) => handleUpdateField(index, 'propType', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:border-yellow-500 focus:outline-none"
                              />
                            </div>
                          </>
                        )}

                        {/* Odds */}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Odds</label>
                          <input
                            type="text"
                            value={pick.odds}
                            onChange={(e) => handleUpdateField(index, 'odds', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:border-yellow-500 focus:outline-none"
                            placeholder="e.g., -110"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Warning message */}
              <div className="flex items-center gap-2 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                <AlertTriangle size={16} />
                <span>Please review picks before adding - OCR may have errors</span>
              </div>
            </div>
          )}

          {/* No picks found */}
          {!isProcessing && !error && parsedPicks.length === 0 && ocrText && (
            <div className="text-center py-8 text-gray-400">
              <p>No picks could be parsed from this image.</p>
              <p className="text-sm mt-2">Try a clearer screenshot or enter picks manually.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="success"
            disabled={isProcessing || parsedPicks.length === 0}
          >
            Add {parsedPicks.length} Pick{parsedPicks.length !== 1 ? 's' : ''} to Form
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BetSlipParseModal;
