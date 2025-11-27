import type { Medicine } from '../types';
import './MedicineList.css';

interface MedicineListProps {
  medicines: Medicine[];
  onEdit: (medicine: Medicine) => void;
  onDelete: (id: string) => void;
}

export function MedicineList({ medicines, onEdit, onDelete }: MedicineListProps) {
  // expiry tracking removed from medicines

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Sem estoque', color: '#ef4444' };
    if (quantity <= 10) return { label: 'Estoque baixo', color: '#f59e0b' };
    return { label: 'Em estoque', color: '#10b981' };
  };

  if (medicines.length === 0) {
    return (
      <div className="medicine-list-container empty">
        <p>Nenhum medicamento cadastrado. Comece adicionando um novo medicamento!</p>
      </div>
    );
  }

  return (
    <div className="medicine-list-container">
      <h2>Medicamentos Cadastrados</h2>
      <div className="medicine-list">
        {medicines.map(medicine => {
          const stockInfo = getStockStatus(medicine.quantity);

          return (
            <div key={medicine.id} className="medicine-card">
              <div className="medicine-header">
                <div className="medicine-title">
                  <h3>{medicine.name}</h3>
                  <span className="medicine-dosage">{medicine.dosage}</span>
                </div>
                <div className="medicine-badges">
                  <span className="category-badge">{medicine.category}</span>
                </div>
              </div>

                  <div className="medicine-details">
                    <div className="detail-row">
                      <span className="detail-label">Quantidade:</span>
                      <span className="detail-value" style={{ color: stockInfo.color }}>
                        {medicine.quantity} unidades
                      </span>
                    </div>
                    {medicine.notes && (
                      <div className="detail-row">
                        <span className="detail-label">Observações:</span>
                        <span className="detail-value">{medicine.notes}</span>
                      </div>
                    )}
              
              
              
              </div>

              <div className="medicine-footer">
                <div className="stock-indicator">
                  <div className="status-dot" style={{ backgroundColor: stockInfo.color }}></div>
                  <span>{stockInfo.label}</span>
                </div>
                <div className="medicine-actions">
                  <button className="btn-edit" onClick={() => onEdit(medicine)}>
                    ✏️ Editar
                  </button>
                  <button className="btn-delete" onClick={() => {
                    if (confirm(`Tem certeza que deseja deletar ${medicine.name}?`)) {
                      onDelete(medicine.id);
                    }
                  }}>
                    🗑️ Deletar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
