import { CutPiece } from '../components/EditableCutlistTable/types';

interface MaterialSection {
  material: string;
  dimensions: {
    width: number;
    length: number;
    quantity: number;
    text: string;
  }[];
}

export class VisionParser {
  private materialKeywords = ['melamine', 'messenger', 'material', 'stock'];

  constructor(private materialCategories: string[]) {}

  public parseVisionResponse(ocrText: string): MaterialSection[] {
    const lines = ocrText.split('\n').filter(line => line.trim());
    const sections = this.parseMaterialSections(lines);
    return sections;
  }

  private isMaterialHeader(line: string): boolean {
    const lowerLine = line.toLowerCase();
    return this.materialKeywords.some(keyword => 
      lowerLine.includes(keyword)
    );
  }

  private parseMaterialSections(lines: string[]): MaterialSection[] {
    const sections: MaterialSection[] = [];
    let currentSection: MaterialSection | null = null;

    for (const line of lines) {
      if (this.isMaterialHeader(line)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { material: line, dimensions: [] };
      } else if (currentSection) {
        const dimension = this.parseDimension(line);
        if (dimension) {
          currentSection.dimensions.push(dimension);
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private parseDimension(text: string): { width: number; length: number; quantity: number; text: string } | null {
    const dimensionRegex = /\b(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\b/;
    const match = dimensionRegex.exec(text);

    if (!match) {
      return null;
    }

    const [_, width, length, quantity] = match;
    return {
      width: parseFloat(width),
      length: parseFloat(length),
      quantity: parseFloat(quantity),
      text
    };
  }

  public static parseOcrText(text: string, materialCategories: string[]): CutPiece[] {
    const parser = new VisionParser(materialCategories);
    const sections = parser.parseVisionResponse(text);
    
    return sections.flatMap(section => 
      section.dimensions.map(dimension => ({
        material: section.material,
        width: dimension.width,
        length: dimension.length,
        quantity: dimension.quantity,
        originalText: dimension.text,
        category: materialCategories.find(cat => 
          section.material.toLowerCase().includes(cat.toLowerCase())
        ) || 'unknown'
      }))
    );
  }
}
