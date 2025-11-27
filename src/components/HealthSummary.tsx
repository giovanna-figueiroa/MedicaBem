import { useState, useEffect } from 'react';
import { adherenceService } from '../services/adherenceService';
import type { HealthSummary, MedicationTaken } from '../types';
import './HealthSummary.css';

export function HealthSummary() {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [expandedSection, setExpandedSection] = useState<'today' | 'missed' | null>('today');

  useEffect(() => {
    // Load immediately
    const data = adherenceService.getHealthSummary();
    setSummary(data);

    // Reload every minute to update status
    const interval = setInterval(() => {
      const updatedData = adherenceService.getHealthSummary();
      setSummary(updatedData);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMedication = (medication: MedicationTaken) => {
    // Check if this is a virtual ID (not yet tracked)
    if (medication.id.startsWith('virtual-')) {
      // Create a new tracking record for this medicine
      adherenceService.recordMedicationTaken(
        medication.medicineId,
        medication.medicineName,
        medication.scheduledTime,
        medication.date
      );
    } else {
      // Update existing record
      adherenceService.updateMedicationRecord(medication.id, !medication.taken);
    }
    const data = adherenceService.getHealthSummary();
    setSummary(data);
  };

  if (!summary) {
    return <div className="health-summary-loading">Carregando resumo de saúde...</div>;
  }

  return (
    <div className="health-summary-container">
      <h1>📊 Resumo de Saúde</h1>

      {/* Main Stats */}
      <div className="health-stats-grid">
        <div className="health-stat-card adherence">
          <div className="stat-circle" style={{ background: `conic-gradient(#10b981 0deg ${summary.adherenceRate * 3.6}deg, #e5e7eb ${summary.adherenceRate * 3.6}deg)` }}>
            <div className="stat-circle-inner">
              <div className="stat-circle-value">{summary.adherenceRate}%</div>
            </div>
          </div>
          <div className="stat-info">
            <h3>Aderência Hoje</h3>
            <p className="stat-description">Medicamentos tomados no horário</p>
          </div>
        </div>

        <div className="health-stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{summary.totalTakenToday}</h3>
            <p className="stat-description">Tomados hoje</p>
          </div>
        </div>

        <div className="health-stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{summary.totalPendingToday}</h3>
            <p className="stat-description">Pendentes hoje</p>
          </div>
        </div>

        <div className="health-stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <h3>{summary.thisWeekAdherence}%</h3>
            <p className="stat-description">Aderência esta semana</p>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="health-section">
        <button
          className="section-header"
          onClick={() => setExpandedSection(expandedSection === 'today' ? null : 'today')}
        >
          <span className="section-title">
            📅 Agendamento de Hoje ({summary.totalScheduledToday} medicamentos)
          </span>
          <span className="toggle-icon">{expandedSection === 'today' ? '▼' : '▶'}</span>
        </button>

        {expandedSection === 'today' && (
          <div className="section-content">
            {summary.todaySchedule.length === 0 ? (
              <p className="empty-message">Nenhum medicamento agendado para hoje</p>
            ) : (
              <div className="medication-list">
                {summary.todaySchedule.map(med => (
                  <div key={med.id} className={`medication-item ${med.taken ? 'taken' : 'pending'}`}>
                    <div className="medication-checkbox">
                      <input
                        type="checkbox"
                        checked={med.taken}
                        onChange={() => {
                        if (med.id.startsWith('virtual-')) {
                          adherenceService.recordMedicationTaken(
                            med.medicineId,
                            med.medicineName,
                            med.scheduledTime,
                            med.date
                          );
                        } else {
                          adherenceService.updateMedicationRecord(med.id, !med.taken);
                        }
                        const data = adherenceService.getHealthSummary();
                        setSummary(data);
                      }}
                        id={`med-${med.id}`}
                      />
                      <label htmlFor={`med-${med.id}`}></label>
                    </div>
                    <div className="medication-info">
                      <h4>{med.medicineName}</h4>
                      <div className="medication-details">
                        <span className="time">⏰ {med.scheduledTime}</span>
                        {med.takenAt && (
                          <span className="taken-time">
                            ✓ Tomado às {new Date(med.takenAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`medication-status ${med.taken ? 'success' : 'pending'}`}>
                      {med.taken ? '✓ Tomado' : 'Pendente'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Missed Medications */}
      {summary.missedMedications.length > 0 && (
        <div className="health-section warning">
          <button
            className="section-header"
            onClick={() => setExpandedSection(expandedSection === 'missed' ? null : 'missed')}
          >
            <span className="section-title">
              ⚠️ Medicamentos Não Tomados ({summary.missedMedications.length})
            </span>
            <span className="toggle-icon">{expandedSection === 'missed' ? '▼' : '▶'}</span>
          </button>

          {expandedSection === 'missed' && (
            <div className="section-content">
              <div className="medication-list">
                {summary.missedMedications.map(med => (
                  <div key={med.id} className="medication-item missed">
                    <div className="medication-icon">⚠️</div>
                    <div className="medication-info">
                      <h4>{med.medicineName}</h4>
                      <div className="medication-details">
                        <span className="date">
                          {new Date(med.date).toLocaleDateString('pt-BR')} às {med.scheduledTime}
                        </span>
                        {med.notes && <span className="notes">Nota: {med.notes}</span>}
                      </div>
                    </div>
                    <button
                      className="btn-mark-taken"
                      onClick={() => handleToggleMedication(med)}
                    >
                      Marcar como tomado
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Stats */}
      <div className="health-section stats-summary">
        <div className="stats-summary-content">
          <div className="stat-summary-item">
            <span className="label">Aderência no Mês</span>
            <span className="value">{summary.thisMonthAdherence}%</span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${summary.thisMonthAdherence}%` }}
              ></div>
            </div>
          </div>
          <div className="stat-summary-item">
            <span className="label">Medicamentos Perdidos (7 dias)</span>
            <span className="value" style={{ color: summary.missedMedications.length > 0 ? '#ef4444' : '#10b981' }}>
              {summary.missedMedications.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
