import api from './api';

/**
 * Export data to IQ software format
 */
export const exportToIQ = async (solution: any, unit: number, width: number, layout: number): Promise<any> => {
  const response = await api.post('/optimizer/export-iq', { solution, unit, width, layout });
  return response.data;
};

/**
 * Import data from IQ software and run optimization
 */
export const importFromIQ = async (iqData: any): Promise<any> => {
  const response = await api.post('/optimizer/import-iq', iqData);
  return response.data;
};

/**
 * Download IQ export file
 */
export const downloadIQExport = (iqData: any): void => {
  // Create a blob from the JSON data
  const blob = new Blob([JSON.stringify(iqData, null, 2)], { type: 'application/json' });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.download = 'iq_export.json';
  
  // Append the link to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Release the URL object
  URL.revokeObjectURL(url);
};

export default {
  exportToIQ,
  importFromIQ,
  downloadIQExport
};
