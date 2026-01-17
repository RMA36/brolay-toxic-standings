import React from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

/**
 * Import - Data import page (placeholder for future CSV import functionality)
 */
const Import = () => {
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-2xl font-bold mb-4">📥 Import Data</h2>
        <p className="text-gray-600 mb-4">
          Import brolay data from CSV or other sources.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Coming Soon:</strong> CSV import functionality will be added in a future update.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Import;
