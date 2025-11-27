import { useState } from 'react';
import type { MedicineFormData, Medicine } from '../types';
import './MedicineForm.css';

interface MedicineFormProps {
  onSubmit: (data: MedicineFormData, schedules: Array<{ time: string; daysOfWeek: number[] }>) => void;
  isLoading?: boolean;
  editingMedicine?: Medicine | null;
  onCancel?: () => void;
}

const categories = ['Analgésico', 'Antibiótico', 'Vitamina', 'Antinflamatório', 'Anti-histamínico', 'Outro'];
const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function MedicineForm({ onSubmit, isLoading = false, editingMedicine, onCancel }: MedicineFormProps) {
  const getInitialFormData = (): MedicineFormData => {
    if (editingMedicine) {
      return {
        name: editingMedicine.name,
        dosage: editingMedicine.dosage,
        quantity: editingMedicine.quantity,
        category: editingMedicine.category,
        notes: editingMedicine.notes || '',
      };
    }
    return {
      name: '',
      dosage: '',
      quantity: 0,
      category: 'Outro',
      notes: '',
    };
  };

  const getInitialSchedules = (): Array<{ time: string; daysOfWeek: number[] }> => {
    if (editingMedicine?.schedule) {
      return editingMedicine.schedule.map(s => ({
        time: s.time,
        daysOfWeek: s.daysOfWeek,
      }));
    }
    return [];
  };

  const [formData, setFormData] = useState<MedicineFormData>(getInitialFormData());
  const [schedules, setSchedules] = useState<Array<{ time: string; daysOfWeek: number[] }>>(getInitialSchedules());
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleAddSchedule = () => {
    if (!newScheduleTime || selectedDays.length === 0) {
      alert('Por favor, selecione um horário e pelo menos um dia da semana');
      return;
    }

    const newSchedule = {
      time: newScheduleTime,
      daysOfWeek: [...selectedDays].sort((a, b) => a - b),
    };

    setSchedules([...schedules, newSchedule]);
    setNewScheduleTime('');
    setSelectedDays([]);
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleToggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.dosage) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    onSubmit(formData, schedules);
    setFormData({
      name: '',
      dosage: '',
      quantity: 0,
      category: 'Outro',
      notes: '',
    });
    setSchedules([]);
    setNewScheduleTime('');
    setSelectedDays([]);
  };

  return (
    <div className="medicine-form-container">
      <div className="form-header">
        <h2>{editingMedicine ? '✏️ Editar Medicamento' : 'Cadastrar Medicamento'}</h2>
        {editingMedicine && onCancel && (
          <button type="button" className="btn-cancel-edit" onClick={onCancel}>
            Cancelar Edição
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="medicine-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Nome do Medicamento *</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Dipirona"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="dosage">Dosagem *</label>
            <input
              id="dosage"
              type="text"
              name="dosage"
              value={formData.dosage}
              onChange={handleChange}
              placeholder="Ex: 500mg"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Categoria *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="quantity">Quantidade em Estoque</label>
            <input
              id="quantity"
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              step="1"
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="notes">Observações</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Adicione observações sobre o medicamento"
            rows={3}
          />
        </div>

        {/* Schedule Section */}
        <div className="schedule-section">
          <h3>⏰ Agendar Horários de Ingestão</h3>
          
          <div className="schedule-form">
            <div className="form-group">
              <label htmlFor="scheduleTime">Horário</label>
              <input
                id="scheduleTime"
                type="time"
                value={newScheduleTime}
                onChange={(e) => setNewScheduleTime(e.target.value)}
              />
            </div>

            <div className="days-selector">
              <label>Dias da Semana</label>
              <div className="days-grid">
                {daysOfWeek.map((day, index) => (
                  <label key={index} className="day-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(index)}
                      onChange={() => handleToggleDay(index)}
                    />
                    <span>{day.substring(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn-add-schedule"
              onClick={handleAddSchedule}
            >
              ➕ Adicionar Horário
            </button>
          </div>

          {/* Scheduled Times List */}
          {schedules.length > 0 && (
            <div className="schedules-list">
              <h4>Horários Agendados:</h4>
              {schedules.map((schedule, index) => (
                <div key={index} className="schedule-item">
                  <div className="schedule-info">
                    <span className="time">⏰ {schedule.time}</span>
                    <span className="days">
                      {schedule.daysOfWeek.map(day => daysOfWeek[day].substring(0, 3)).join(', ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-schedule"
                    onClick={() => handleRemoveSchedule(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? 'Processando...' : editingMedicine ? 'Atualizar Medicamento' : 'Cadastrar Medicamento'}
        </button>
      </form>
    </div>
  );
}
