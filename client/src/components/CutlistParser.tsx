import { useEffect, useState } from 'react';
import { VisionParser } from '../services/visionParser';
import { VisionDataView } from './VisionDataView';
import { DEFAULT_MATERIAL_CATEGORIES } from './EditableCutlistTable/utils';

interface CutlistParserProps {
  ocrResponse: string;
  phoneNumber: string;
  senderName: string;
  onParsedData: (data: any) => void; // TODO: Define proper type
}

export const CutlistParser = ({ ocrResponse, phoneNumber, senderName, onParsedData }: CutlistParserProps) => {
  const [sections, setSections] = useState<MaterialSection[]>([]);
  const [parsedData, setParsedData] = useState<any>(null);

  useEffect(() => {
    if (ocrResponse) {
      try {
        const parser = new VisionParser(DEFAULT_MATERIAL_CATEGORIES);
        const parsedSections = parser.parseVisionResponse(ocrResponse);
        setSections(parsedSections);
        
        // Convert to format expected by EditableCutlistTable
        const parsedPieces = VisionParser.parseOcrText(ocrResponse, DEFAULT_MATERIAL_CATEGORIES);
        setParsedData(parsedPieces);
        onParsedData(parsedPieces);
      } catch (error) {
        console.error('Error parsing OCR response:', error);
        setSections([]);
        setParsedData(null);
      }
    }
  }, [ocrResponse, onParsedData]);

  const handleEdit = (index: number, changes: any) => {
    const newSections = [...sections];
    newSections[index] = { ...sections[index], ...changes };
    setSections(newSections);
    
    // Update parsed data
    const parser = new VisionParser(DEFAULT_MATERIAL_CATEGORIES);
    const parsedPieces = VisionParser.parseOcrText(ocrResponse, DEFAULT_MATERIAL_CATEGORIES);
    onParsedData(parsedPieces);
  };

  const handleDelete = (index: number) => {
    const newSections = [...sections];
    newSections.splice(index, 1);
    setSections(newSections);
  };

  const handleAdd = (section: string) => {
    const newSections = [...sections];
    const newSection = newSections.find(s => s.material === section);
    if (newSection) {
      newSection.dimensions.push({
        width: 0,
        length: 0,
        quantity: 1,
        text: ''
      });
      setSections(newSections);
    }
  };

  return (
    <div className="cutlist-parser">
      <h2>OCR Parsed Data</h2>
      <p>Phone: {phoneNumber}</p>
      <p>Sender: {senderName}</p>
      
      <VisionDataView
        sections={sections}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={handleAdd}
      />
    </div>
  );
};

CutlistParser.displayName = 'CutlistParser';
