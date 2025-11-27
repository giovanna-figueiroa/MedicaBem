import emailjs from 'emailjs-com';
import type { Caregiver, CaregiverFormData } from '../types';

const CAREGIVER_KEY = 'caregivers_data';

export const caregiverService = {
  getAllCaregivers: (): Caregiver[] => {
    const data = localStorage.getItem(CAREGIVER_KEY);
    return data ? JSON.parse(data) : [];
  },

  addCaregiver: (formData: CaregiverFormData): Caregiver => {
    const caregivers = caregiverService.getAllCaregivers();
    const newCaregiver: Caregiver = {
      ...formData,
      id: Date.now().toString(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    caregivers.push(newCaregiver);
    localStorage.setItem(CAREGIVER_KEY, JSON.stringify(caregivers));
    return newCaregiver;
  },

  deleteCaregiver: (id: string): boolean => {
    const caregivers = caregiverService.getAllCaregivers();
    const filtered = caregivers.filter(c => c.id !== id);
    if (filtered.length === caregivers.length) return false;
    localStorage.setItem(CAREGIVER_KEY, JSON.stringify(filtered));
    return true;
  },

  updateCaregiver: (id: string, formData: CaregiverFormData): Caregiver | null => {
    const caregivers = caregiverService.getAllCaregivers();
    const index = caregivers.findIndex(c => c.id === id);
    if (index === -1) return null;

    caregivers[index] = {
      ...caregivers[index],
      ...formData,
    };
    localStorage.setItem(CAREGIVER_KEY, JSON.stringify(caregivers));
    return caregivers[index];
  },

  getCaregiver: (id: string): Caregiver | null => {
    const caregivers = caregiverService.getAllCaregivers();
    return caregivers.find(c => c.id === id) || null;
  },

  // (Backend notifications removidas - somente EmailJS)

  // Format weekly report for sending
  formatWeeklyReport: (
    weeklyData: {
      startDate: string;
      endDate: string;
      dailyData: { [key: string]: { taken: number; scheduled: number } };
      weeklyAdherence: number;
    }
  ): string => {
    const lines = [
      '📊 RELATÓRIO SEMANAL DE ADERÊNCIA A MEDICAMENTOS',
      '═════════════════════════════════════════════',
      `Período: ${new Date(weeklyData.startDate).toLocaleDateString('pt-BR')} a ${new Date(weeklyData.endDate).toLocaleDateString('pt-BR')}`,
      `Aderência Geral: ${weeklyData.weeklyAdherence}%`,
      '',
      'Detalhamento diário:',
    ];

    Object.entries(weeklyData.dailyData).forEach(([date, data]) => {
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
      const percentage = data.scheduled > 0 ? Math.round((data.taken / data.scheduled) * 100) : 0;
      lines.push(`${dayName}: ${data.taken}/${data.scheduled} medicamentos (${percentage}%)`);
    });

    lines.push('═════════════════════════════════════════════');
    lines.push('Gerado em: ' + new Date().toLocaleDateString('pt-BR'));

    return lines.join('\n');
  },

  // Backend report email removido - usar somente EmailJS

  // Send weekly report via EmailJS (frontend-only)
  sendWeeklyReportViaEmailJS: async (
    caregiverEmail: string,
    patientName: string,
    weeklyAdherence: number,
    weeklyData: { [key: string]: { taken: number; scheduled: number } }
  ): Promise<{ success: boolean; message: string }> => {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      return {
        success: false,
        message: 'EmailJS não configurado. Preencha SERVICE_ID, TEMPLATE_ID e PUBLIC_KEY no .env.',
      };
    }

    // Build simple HTML table for daily data
    let dailyTableHtml = '<table style="width:100%;border-collapse:collapse">\n';
    dailyTableHtml += '<thead><tr><th style="text-align:left;border-bottom:1px solid #ddd">Dia</th><th style="text-align:center;border-bottom:1px solid #ddd">Tomou/Programado</th><th style="text-align:center;border-bottom:1px solid #ddd">Aderência</th></tr></thead>';
    dailyTableHtml += '<tbody>';
    Object.entries(weeklyData).forEach(([date, data]) => {
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
      const percentage = data.scheduled > 0 ? Math.round((data.taken / data.scheduled) * 100) : 0;
      dailyTableHtml += `<tr><td style="padding:8px;border-bottom:1px solid #eee">${dayName}</td><td style="padding:8px;text-align:center;border-bottom:1px solid #eee">${data.taken}/${data.scheduled}</td><td style="padding:8px;text-align:center;border-bottom:1px solid #eee">${percentage}%</td></tr>`;
    });
    dailyTableHtml += '</tbody></table>';

    const params = {
      to_email: caregiverEmail,
      patient_name: patientName,
      weekly_adherence: `${weeklyAdherence}%`,
      daily_table_html: dailyTableHtml,
      generated_at: new Date().toLocaleString('pt-BR'),
    };

    try {
      const resp = await emailjs.send(serviceId, templateId, params, publicKey);
      const messageId = resp?.status === 200 ? 'emailjs_ok' : 'emailjs_sent';
      return {
        success: true,
        message: `✅ Relatório semanal enviado via EmailJS para ${caregiverEmail} (ID: ${messageId})`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar via EmailJS';
      return { success: false, message: `Erro no EmailJS: ${msg}` };
    }
  },
};

