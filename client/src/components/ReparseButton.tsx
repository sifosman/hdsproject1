import React, { useState } from 'react';
import { reparseCutlist, shouldReparse, estimateHDSPieceCount } from '../utils/reparseUtils';

interface ReparseButtonProps {
  cutlistId: string;
  cutlist: any;
  onReparseComplete?: (result: any) => void;
  className?: string;
}

const ReparseButton: React.FC<ReparseButtonProps> = ({
  cutlistId,
  cutlist,
  onReparseComplete,
  className = ''
}) => {
  const [isReparsing, setIsReparsing] = useState(false);
  const [reparseResult, setReparseResult] = useState<any>(null);

  // Check if this cutlist should be re-parsed
  const needsReparse = shouldReparse(cutlist);
  const estimatedPieces = estimateHDSPieceCount(cutlist.ocrText || '');
  const currentPieces = cutlist.cutPieces?.length || 0;

  const handleReparse = async () => {
    setIsReparsing(true);
    setReparseResult(null);

    try {
      const result = await reparseCutlist(cutlistId);
      setReparseResult(result);
      
      if (result.success && onReparseComplete) {
        onReparseComplete(result);
      }
    } catch (error) {
      setReparseResult({
        success: false,
        message: 'Failed to re-parse cutlist',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsReparsing(false);
    }
  };

  // Don't show the button if this doesn't appear to need re-parsing
  if (!needsReparse) {
    return null;
  }

  return (
    <div className={`reparse-container ${className}`}>
      <div className="reparse-info">
        <p className="text-sm text-yellow-600 mb-2">
          ⚠️ This HDS cutting list may have parsing issues. 
          Found {currentPieces} pieces, expected ~{estimatedPieces} pieces.
        </p>
        
        <button
          onClick={handleReparse}
          disabled={isReparsing}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            isReparsing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isReparsing ? 'Re-parsing...' : 'Fix Parsing Issues'}
        </button>
      </div>

      {reparseResult && (
        <div className={`mt-3 p-3 rounded-md text-sm ${
          reparseResult.success 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <p className="font-medium">
            {reparseResult.success ? '✅ Success!' : '❌ Error'}
          </p>
          <p>{reparseResult.message}</p>
          
          {reparseResult.success && (
            <div className="mt-2">
              <p>
                Original pieces: {reparseResult.originalPieces} → 
                New pieces: {reparseResult.newPieces}
              </p>
              <p className="text-xs mt-1">
                Please refresh the page to see the updated data.
              </p>
            </div>
          )}
          
          {reparseResult.error && (
            <p className="text-xs mt-1">Error: {reparseResult.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReparseButton;
