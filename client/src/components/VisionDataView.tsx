import { MaterialSection } from '../services/visionParser';
import { CutPiece } from './EditableCutlistTable/types';

interface VisionDataViewProps {
  sections: MaterialSection[];
  onEdit: (index: number, changes: Partial<CutPiece>) => void;
  onDelete: (index: number) => void;
  onAdd: (section: string) => void;
}

export const VisionDataView = ({ sections, onEdit, onDelete, onAdd }: VisionDataViewProps) => {
  return (
    <div className="vision-data-view">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="material-section">
          <h3>{section.material}</h3>
          
          <div className="dimensions-table">
            <table>
              <thead>
                <tr>
                  <th>Width</th>
                  <th>Length</th>
                  <th>Quantity</th>
                  <th>Text</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {section.dimensions.map((dimension, index) => (
                  <tr key={index}>
                    <td>{dimension.width}</td>
                    <td>{dimension.length}</td>
                    <td>{dimension.quantity}</td>
                    <td>{dimension.text}</td>
                    <td>
                      <button onClick={() => onEdit(sectionIndex, {
                        width: dimension.width,
                        length: dimension.length,
                        quantity: dimension.quantity,
                        originalText: dimension.text
                      })}>Edit</button>
                      <button onClick={() => onDelete(sectionIndex)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={() => onAdd(section.material)}>Add New Dimension</button>
        </div>
      ))}

      <div className="raw-text">
        <h4>Raw Text</h4>
        <pre>{sections.map(s => s.dimensions.map(d => d.text).join('\n')).join('\n')}</pre>
      </div>
    </div>
  );
};

VisionDataView.displayName = 'VisionDataView';
