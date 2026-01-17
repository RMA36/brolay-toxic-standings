import React from 'react';
import { useBrolayContext } from '../contexts/BrolayContext';
import Button from '../components/common/Button';
import { saveLearnedData, extractTeamsFromParlays } from '../utils/actionHandlers';

/**
 * Settings - Application settings page
 * Allows managing learned teams and prop types
 */
const Settings = () => {
  const {
    learnedTeams,
    setLearnedTeams,
    learnedPropTypes,
    setLearnedPropTypes,
    parlays,
    updateBrolay,
    saving,
    setSaving,
    isMobile
  } = useBrolayContext();

  const getDayOfWeek = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const handleRemovePropType = (propType) => {
    if (window.confirm(`Remove "${propType}" from learned prop types?`)) {
      const updatedPropTypes = learnedPropTypes.filter(p => p !== propType);
      setLearnedPropTypes(updatedPropTypes);
      saveLearnedData(learnedTeams, updatedPropTypes);
      alert(`"${propType}" removed successfully!`);
    }
  };

  const handleRemoveTeam = (team) => {
    if (window.confirm(`Remove "${team}" from learned teams?`)) {
      const updatedTeams = learnedTeams.filter(t => t !== team);
      setLearnedTeams(updatedTeams);
      saveLearnedData(updatedTeams, learnedPropTypes);
      alert(`"${team}" removed successfully!`);
    }
  };

  const handleClearAllLearnedData = () => {
    if (window.confirm('Clear ALL learned teams and prop types? This cannot be undone.')) {
      setLearnedTeams([]);
      setLearnedPropTypes([]);
      saveLearnedData([], []);
      alert('All learned data cleared!');
    }
  };

  const handleExtractTeamsFromExistingParlays = () => {
    const result = extractTeamsFromParlays(parlays, learnedTeams, learnedPropTypes);
    setLearnedTeams(result.newTeams);
    setLearnedPropTypes(result.newPropTypes);
    saveLearnedData(result.newTeams, result.newPropTypes);
    alert(`Extracted ${result.teamsAdded} new teams and ${result.propTypesAdded} new prop types from existing parlays!`);
  };

  const handleBackfillDayOfWeek = async () => {
    if (window.confirm('Add day of week to all existing brolays? This will update all records in the database.')) {
      setSaving(true);
      try {
        let updatedCount = 0;
        for (const parlay of parlays) {
          if (!parlay.dayOfWeek && parlay.date) {
            const dayOfWeek = getDayOfWeek(parlay.date);
            if (parlay.id) {
              await updateBrolay(parlay.id, { dayOfWeek });
              updatedCount++;
            }
          }
        }
        alert(`Successfully added day of week to ${updatedCount} brolay(s)!`);
      } catch (error) {
        console.error('Error backfilling day of week:', error);
        alert('Error updating brolays. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">⚙️ Settings</h2>

      {/* Learned Prop Types */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4">Learned Prop Types ({learnedPropTypes.length})</h3>
        <p className="text-sm text-gray-600 mb-4">
          These are prop types that have been learned from your betting history. You can remove any that were entered incorrectly.
        </p>

        {learnedPropTypes.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No learned prop types yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {learnedPropTypes.sort().map((propType, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <span className="text-sm">{propType}</span>
                <Button
                  onClick={() => handleRemovePropType(propType)}
                  variant="danger"
                  size="small"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learned Teams */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4">Learned Teams ({learnedTeams.length})</h3>
        <p className="text-sm text-gray-600 mb-4">
          These are teams that have been learned from your betting history. You can remove any that were entered incorrectly.
        </p>

        {learnedTeams.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No learned teams yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {learnedTeams.sort().map((team, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <span className="text-sm">{team}</span>
                <Button
                  onClick={() => handleRemoveTeam(team)}
                  variant="danger"
                  size="small"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6">
        <h3 className="text-lg font-bold text-red-900 mb-4">⚠️ Danger Zone</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <Button
            onClick={handleClearAllLearnedData}
            variant="danger"
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            Clear All Learned Data
          </Button>
          <Button
            onClick={handleExtractTeamsFromExistingParlays}
            disabled={parlays.length === 0}
            variant="blue"
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            Extract Teams
          </Button>
          <Button
            onClick={handleBackfillDayOfWeek}
            disabled={parlays.length === 0 || saving}
            variant="success"
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            Backfill Day of Week
          </Button>
        </div>
        <p className="text-sm text-red-800 mt-3">
          Clear all will remove all learned teams and prop types. Re-extract will scan all your brolays and rebuild the learned data.
        </p>
      </div>
    </div>
  );
};

export default Settings;
