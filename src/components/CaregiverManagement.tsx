import { useState } from 'react';
import { caregiverService } from '../services/caregiverService';
import { adherenceService } from '../services/adherenceService';
import type { Caregiver, CaregiverFormData } from '../types';
import './CaregiverManagement.css';

export function CaregiverManagement() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>(() => {
    return caregiverService.getAllCaregivers();
  });
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const [formData, setFormData] = useState<CaregiverFormData>({
    name: '',
    phone: '',
    email: '',
    notificationType: 'whatsapp',
    relationship: '',
  });

  const loadCaregivers = () => {
    const data = caregiverService.getAllCaregivers();
    setCaregivers(data);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddCaregiver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.relationship) {
      alert('Por favor, preencha nome e relacionamento');
      return;
    }

    caregiverService.addCaregiver(formData);
    loadCaregivers();
    setFormData({
      name: '',
      phone: '',
      email: '',
      notificationType: 'whatsapp',
      relationship: '',
    });
    setIsFormVisible(false);
    alert('Cuidador cadastrado com sucesso!');
  };

  const handleDeleteCaregiver = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este cuidador?')) {
      caregiverService.deleteCaregiver(id);
      loadCaregivers();
      alert('Cuidador deletado com sucesso!');
    }
  };

  // Test notification disabled (backend removido)

  const handleSendWeeklyReport = async (caregiver: Caregiver) => {
    if (!caregiver.email) {
      alert('Este cuidador não tem e-mail cadastrado. Use o botão 📧 após adicionar o e-mail.');
      return;
    }
    const weeklyData = adherenceService.getWeeklyReport();
    const result = await caregiverService.sendWeeklyReportViaEmailJS(
      caregiver.email,
      'Paciente',
      weeklyData.weeklyAdherence,
      weeklyData.dailyData
    );
    alert(result.message);
    if (result.success) {
      setShowReport(false);
      setSelectedCaregiver(null);
    }
  };

  // Email button removido; envio de relatório é feito pelo modal

  const weeklyReport = adherenceService.getWeeklyReport();

  return (
    <div className="caregiver-container">
      <h1>👨‍⚕️ Gerenciamento de Cuidadores</h1>

      {/* Add Caregiver Form */}
      <div className="form-section">
        <button
          className="btn-add-caregiver"
          onClick={() => setIsFormVisible(!isFormVisible)}
        >
          {isFormVisible ? '✕ Cancelar' : '➕ Adicionar Cuidador'}
        </button>

        {isFormVisible && (
          <form onSubmit={handleAddCaregiver} className="caregiver-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Nome do Cuidador *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="relationship">Relacionamento *</label>
                <input
                  id="relationship"
                  type="text"
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleFormChange}
                  placeholder="Ex: Filho, Enfermeiro, etc"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">Número de Telefone/WhatsApp</label>
                <input
                  id="phone"
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="Ex: +55 11 99999-9999"
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">E-mail para Relatórios</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleFormChange}
                  placeholder="Ex: joao@gmail.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="notificationType">Tipo de Notificação *</label>
                <select
                  id="notificationType"
                  name="notificationType"
                  value={formData.notificationType}
                  onChange={handleFormChange}
                  required
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
            </div>

            <button type="submit" className="submit-btn">
              Cadastrar Cuidador
            </button>
          </form>
        )}
      </div>

      {/* Caregivers List */}
      <div className="caregivers-list-section">
        {caregivers.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum cuidador cadastrado. Comece adicionando um!</p>
          </div>
        ) : (
          <div className="caregivers-grid">
            {caregivers.map(caregiver => (
              <div key={caregiver.id} className="caregiver-card">
                <div className="caregiver-header">
                  <div className="caregiver-info">
                    <h3>{caregiver.name}</h3>
                    <p className="relationship">{caregiver.relationship}</p>
                  </div>
                  <div className="caregiver-type-badge">
                    {caregiver.notificationType === 'whatsapp' ? '💬' : '📱'} {caregiver.notificationType.toUpperCase()}
                  </div>
                </div>

                <div className="caregiver-details">
                  <div className="detail-item">
                    <span className="label">Telefone:</span>
                    <span className="value">{caregiver.phone || '—'}</span>
                  </div>
                  {caregiver.email && (
                    <div className="detail-item">
                      <span className="label">E-mail:</span>
                      <span className="value">{caregiver.email}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${caregiver.active ? 'active' : 'inactive'}`}>
                      {caregiver.active ? '✓ Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                <div className="caregiver-actions">
                  {/* Botão de teste desativado */}
                  <button
                    className="btn-report"
                    onClick={() => {
                      setSelectedCaregiver(caregiver);
                      setShowReport(true);
                    }}
                    title="Enviar relatório semanal"
                  >
                    📊 Relatório
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteCaregiver(caregiver.id)}
                    title="Deletar cuidador"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Report Modal */}
      {showReport && selectedCaregiver && (
        <div className="modal-overlay" onClick={() => setShowReport(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Relatório Semanal</h2>
              <button className="btn-close" onClick={() => setShowReport(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p className="report-recipient">Para: <strong>{selectedCaregiver.name}</strong></p>
              
              <div className="report-preview">
                <div className="report-header">
                  <h3>ADERÊNCIA A MEDICAMENTOS - RELATÓRIO SEMANAL</h3>
                  <p>Período: {new Date(weeklyReport.startDate).toLocaleDateString('pt-BR')} a {new Date(weeklyReport.endDate).toLocaleDateString('pt-BR')}</p>
                </div>

                <div className="report-stats">
                  <div className="report-stat">
                    <span className="label">Aderência Geral</span>
                    <span className="value">{weeklyReport.weeklyAdherence}%</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${weeklyReport.weeklyAdherence}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="report-daily">
                  <h4>Detalhamento Diário:</h4>
                  <div className="daily-items">
                    {Object.entries(weeklyReport.dailyData).map(([date, data]) => {
                      const dateObj = new Date(date);
                      const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                      const percentage = data.scheduled > 0 ? Math.round((data.taken / data.scheduled) * 100) : 0;
                      return (
                        <div key={date} className="daily-item">
                          <span className="day">{dayName}:</span>
                          <span className="percentage">{percentage}%</span>
                          <span className="details">{data.taken}/{data.scheduled}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="report-footer">
                  <p>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowReport(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-send"
                onClick={() => handleSendWeeklyReport(selectedCaregiver)}
              >
                📤 Enviar Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
