import { medicineService } from './medicineService';
import { adherenceService } from './adherenceService';
import { caregiverService } from './caregiverService';
import type { Medicine } from '../types';

const ALERT_TRACKING_KEY = 'alert_tracking';

interface AlertRecord {
  medicineId: string;
  scheduledTime: string;
  date: string;
  alertSentAt: string;
}

export const alertService = {
  // Get all alerts sent
  getAllAlerts: (): AlertRecord[] => {
    const data = localStorage.getItem(ALERT_TRACKING_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Record that an alert was sent
  recordAlert: (medicineId: string, scheduledTime: string, date: string) => {
    const alerts = alertService.getAllAlerts();
    const record: AlertRecord = {
      medicineId,
      scheduledTime,
      date,
      alertSentAt: new Date().toISOString(),
    };
    alerts.push(record);
    localStorage.setItem(ALERT_TRACKING_KEY, JSON.stringify(alerts));
  },

  // Check if alert was already sent for this specific medication+time+date
  wasAlertSent: (medicineId: string, scheduledTime: string, date: string): boolean => {
    const alerts = alertService.getAllAlerts();
    return alerts.some(
      a => a.medicineId === medicineId && a.scheduledTime === scheduledTime && a.date === date
    );
  },

  // Check for pending medications and send alerts if needed
  checkAndSendAlerts: async () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const medicines = medicineService.getAllMedicines();
    const tracking = adherenceService.getAllMedicationTracking();
    const caregivers = caregiverService.getAllCaregivers();

    // Only proceed if there are caregivers with email
    const caregiversWithEmail = caregivers.filter(c => c.email);
    if (caregiversWithEmail.length === 0) {
      return; // No one to notify
    }

    // Check each medicine scheduled for today
    for (const medicine of medicines) {
      if (!medicine.schedule) continue;

      for (const schedule of medicine.schedule) {
        if (!schedule.active) continue;
        if (!schedule.daysOfWeek.includes(currentDay)) continue;

        // Parse scheduled time
        const [schedHour, schedMinute] = schedule.time.split(':').map(Number);
        const schedTimeInMinutes = schedHour * 60 + schedMinute;

        // Check if more than 5 minutes have passed (para testes)
        const minutesPassed = currentTimeInMinutes - schedTimeInMinutes;
        if (minutesPassed < 5) continue; // Ainda não está 5 minutos atrasado

        // Check if medication was taken
        const wasTaken = tracking.some(
          t =>
            t.medicineId === medicine.id &&
            t.date === today &&
            t.scheduledTime === schedule.time &&
            t.taken === true
        );

        if (wasTaken) continue; // Already taken, no alert needed

        // Check if alert was already sent for this specific instance
        if (alertService.wasAlertSent(medicine.id, schedule.time, today)) {
          continue; // Alert already sent
        }

        // Send alert to all caregivers with email
        for (const caregiver of caregiversWithEmail) {
          try {
            await caregiverService.sendAlertEmail(
              caregiver.email!,
              medicine.name,
              medicine.dosage,
              schedule.time
            );
            console.log(`Alert sent to ${caregiver.name} (${caregiver.email})`);
          } catch (err) {
            console.error(`Failed to send alert to ${caregiver.email}:`, err);
          }
        }

        // Record that alert was sent
        alertService.recordAlert(medicine.id, schedule.time, today);
      }
    }
  },

  // Start automatic checking (every minute)
  startMonitoring: () => {
    // Check immediately
    alertService.checkAndSendAlerts();

    // Then check every minute
    const intervalId = setInterval(() => {
      alertService.checkAndSendAlerts();
    }, 60000); // 60 seconds

    return intervalId;
  },
  
  // Dispara um alerta de teste imediato para validar EmailJS
  triggerTestAlert(caregivers: { email?: string }[], medicines: Medicine[]): { success: boolean; message: string } {
    try {
      const caregiver = caregivers.find(c => !!c.email);
      if (!caregiver || !caregiver.email) {
        return { success: false, message: 'Nenhum cuidador com e-mail encontrado.' };
      }
      const med = medicines[0];
      if (!med) {
        return { success: false, message: 'Nenhum medicamento encontrado para teste.' };
      }
      // Derivar um horário (pega primeiro schedule ativo ou horário atual)
      let derivedTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (med.schedule && med.schedule.length > 0) {
        const first = med.schedule.find(s => s.active) || med.schedule[0];
        if (first?.time) derivedTime = first.time;
      }
      void caregiverService.sendAlertEmail(
        caregiver.email,
        med.name,
        med.dosage,
        derivedTime
      );
      return { success: true, message: `Alerta de teste disparado para ${caregiver.email}` };
    } catch {
      return { success: false, message: 'Falha ao disparar alerta de teste.' };
    }
  }
};
