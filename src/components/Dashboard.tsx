import { useEffect, useState } from 'react';
import { medicineService } from '../services/medicineService';
import { adherenceService } from '../services/adherenceService';
import type { Medicine, HealthSummary } from '../types';
import './Dashboard.css';

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<{
    todayList: Array<{ medicine: Medicine; time: string }>;
    summary: HealthSummary | null;
  }>({ todayList: [], summary: null });

  useEffect(() => {
    const compute = () => {
      const meds = medicineService.getAllMedicines();
      const today = new Date().getDay();
      const list: Array<{ medicine: Medicine; time: string }> = [];
      meds.forEach(m => {
        if (!m.schedule) return;
        m.schedule.forEach(s => {
          if (s.active && s.daysOfWeek.includes(today)) {
            list.push({ medicine: m, time: s.time });
          }
        });
      });
      list.sort((a, b) => (a.time > b.time ? 1 : -1));
      const sum = adherenceService.getHealthSummary();
      setDashboardData({ todayList: list, summary: sum });
    };

    compute();
    const interval = setInterval(compute, 60000);
    return () => clearInterval(interval);
  }, []);

  const isTaken = (medicineId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tracking = adherenceService.getAllMedicationTracking();
    return tracking.some(t => t.medicineId === medicineId && t.date === today && t.scheduledTime === time && t.taken === true);
  };

  return (
    <div className="dashboard-container">
      <h1>Dashboard de Medicamentos</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon medicines-icon">💊</div>
          <div className="stat-content">
            <div className="stat-label">Total de Medicamentos</div>
            <div className="stat-value">{medicineService.getAllMedicines().length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stock-icon">📦</div>
          <div className="stat-content">
            <div className="stat-label">Unidades em Estoque</div>
            <div className="stat-value">{medicineService.getAllMedicines().reduce((s, m) => s + m.quantity, 0)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon expiring-icon">⏰</div>
          <div className="stat-content">
            <div className="stat-label">Vencendo em 30 dias</div>
            <div className="stat-value" style={{ color: medicineService.getExpiringSoon().length > 0 ? '#f59e0b' : '#10b981' }}>
              {medicineService.getExpiringSoon().length}
            </div>
          </div>
        </div>
      </div>

      <div className="today-section">
        <h2>📅 Medicamentos de Hoje</h2>

        {dashboardData.todayList.length === 0 ? (
          <p className="empty-message">Nenhum medicamento agendado para hoje</p>
        ) : (
          <div className="stats-grid today-grid">
            {dashboardData.todayList.map((item, idx) => {
              const taken = isTaken(item.medicine.id, item.time);
              return (
                <div key={`${item.medicine.id}-${item.time}-${idx}`} className="stat-card">
                  <div className="stat-icon">💊</div>
                  <div className="stat-content">
                    <div className="stat-label">{item.time}</div>
                    <div className="stat-value">{item.medicine.name} <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 8 }}>{item.medicine.dosage}</span></div>
                  </div>
                  <div style={{ marginLeft: 12 }}>
                    <div className={`status-badge ${taken ? 'taken' : 'pending'}`}>
                      {taken ? '✓ Tomado' : '⏳ Pendente'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="stock-section">
        <h2>📦 Estoque de Medicamentos</h2>

        {medicineService.getAllMedicines().length === 0 ? (
          <p className="empty-message">Nenhum medicamento cadastrado</p>
        ) : (
          <div className="stock-list">
            {medicineService.getAllMedicines().map(medicine => (
              <div key={medicine.id} className="stock-item">
                <div className="stock-info">
                  <div className="medicine-name">{medicine.name}</div>
                  <div className="medicine-dosage">{medicine.dosage}</div>
                </div>
                <div className={`stock-quantity ${medicine.quantity === 0 ? 'empty' : medicine.quantity <= 10 ? 'low' : 'ok'}`}>
                  {medicine.quantity} un.
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

