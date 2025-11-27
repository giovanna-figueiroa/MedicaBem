import type { MedicationTaken, HealthSummary } from '../types';
import { medicineService } from './medicineService';

const MEDICATION_TRACKING_KEY = 'medication_tracking';

export const adherenceService = {
  // Record when a medication is taken
  recordMedicationTaken: (
    medicineId: string,
    medicineName: string,
    scheduledTime: string,
    date: string
  ): MedicationTaken => {
    const tracking = adherenceService.getAllMedicationTracking();
    const record: MedicationTaken = {
      id: Date.now().toString(),
      medicineId,
      medicineName,
      scheduledTime,
      takenAt: new Date().toISOString(),
      date,
      taken: true,
      notes: '',
    };
    tracking.push(record);
    localStorage.setItem(MEDICATION_TRACKING_KEY, JSON.stringify(tracking));
    return record;
  },

  // Mark a scheduled medication as not taken (pending past time)
  recordMissedMedication: (
    medicineId: string,
    medicineName: string,
    scheduledTime: string,
    date: string
  ): MedicationTaken => {
    const tracking = adherenceService.getAllMedicationTracking();
    const record: MedicationTaken = {
      id: Date.now().toString(),
      medicineId,
      medicineName,
      scheduledTime,
      date,
      taken: false,
      notes: '',
    };
    tracking.push(record);
    localStorage.setItem(MEDICATION_TRACKING_KEY, JSON.stringify(tracking));
    return record;
  },

  getAllMedicationTracking: (): MedicationTaken[] => {
    const data = localStorage.getItem(MEDICATION_TRACKING_KEY);
    return data ? JSON.parse(data) : [];
  },

  getTodaySchedule: (): MedicationTaken[] => {
    const today = new Date().toISOString().split('T')[0];
    const todayDayOfWeek = new Date().getDay();
    const medicines = medicineService.getAllMedicines();
    const tracking = adherenceService.getAllMedicationTracking();

    // Get all scheduled medicines for today
    const scheduledToday: MedicationTaken[] = [];
    medicines.forEach(medicine => {
      if (!medicine.schedule) return;
      medicine.schedule.forEach(schedule => {
        if (schedule.active && schedule.daysOfWeek.includes(todayDayOfWeek)) {
          // Check if there's already a tracking entry for this medicine+time today
          const existing = tracking.find(
            t => t.medicineId === medicine.id && t.date === today && t.scheduledTime === schedule.time
          );
          if (existing) {
            scheduledToday.push(existing);
          } else {
            // Create a virtual entry for this scheduled medicine (not yet taken)
            scheduledToday.push({
              id: `virtual-${medicine.id}-${schedule.time}`,
              medicineId: medicine.id,
              medicineName: medicine.name,
              scheduledTime: schedule.time,
              date: today,
              taken: false,
            });
          }
        }
      });
    });

    // Sort by time
    scheduledToday.sort((a, b) => (a.scheduledTime > b.scheduledTime ? 1 : -1));
    return scheduledToday;
  },

  getThisWeekTracking: (): MedicationTaken[] => {
    const now = new Date();
    const tracking = adherenceService.getAllMedicationTracking();
    const medicines = medicineService.getAllMedicines();
    const weekTracking: MedicationTaken[] = [];

    // For each day in the past week, compute scheduled medicines
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      medicines.forEach(medicine => {
        if (!medicine.schedule) return;
        medicine.schedule.forEach(schedule => {
          if (schedule.active && schedule.daysOfWeek.includes(dayOfWeek)) {
            const existing = tracking.find(
              t => t.medicineId === medicine.id && t.date === dateStr && t.scheduledTime === schedule.time
            );
            if (existing) {
              weekTracking.push(existing);
            } else {
              weekTracking.push({
                id: `virtual-${medicine.id}-${dateStr}-${schedule.time}`,
                medicineId: medicine.id,
                medicineName: medicine.name,
                scheduledTime: schedule.time,
                date: dateStr,
                taken: false,
              });
            }
          }
        });
      });
    }

    return weekTracking;
  },

  getThisMonthTracking: (): MedicationTaken[] => {
    const now = new Date();
    const tracking = adherenceService.getAllMedicationTracking();
    const medicines = medicineService.getAllMedicines();
    const monthTracking: MedicationTaken[] = [];

    // For each day in the past month, compute scheduled medicines
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      medicines.forEach(medicine => {
        if (!medicine.schedule) return;
        medicine.schedule.forEach(schedule => {
          if (schedule.active && schedule.daysOfWeek.includes(dayOfWeek)) {
            const existing = tracking.find(
              t => t.medicineId === medicine.id && t.date === dateStr && t.scheduledTime === schedule.time
            );
            if (existing) {
              monthTracking.push(existing);
            } else {
              monthTracking.push({
                id: `virtual-${medicine.id}-${dateStr}-${schedule.time}`,
                medicineId: medicine.id,
                medicineName: medicine.name,
                scheduledTime: schedule.time,
                date: dateStr,
                taken: false,
              });
            }
          }
        });
      });
    }

    return monthTracking;
  },

  calculateAdherence: (tracking: MedicationTaken[]): number => {
    if (tracking.length === 0) return 0;
    const taken = tracking.filter(t => t.taken).length;
    return Math.round((taken / tracking.length) * 100);
  },

  getMissedMedications: (days: number = 7): MedicationTaken[] => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const tracking = adherenceService.getAllMedicationTracking();
    return tracking.filter(t => {
      const date = new Date(t.date);
      return !t.taken && date >= pastDate && date <= now;
    });
  },

  getHealthSummary: (): HealthSummary => {
    const todayTracking = adherenceService.getTodaySchedule();
    const weekTracking = adherenceService.getThisWeekTracking();
    const monthTracking = adherenceService.getThisMonthTracking();

    const totalScheduledToday = todayTracking.length;
    const totalTakenToday = todayTracking.filter(t => t.taken).length;
    const totalPendingToday = totalScheduledToday - totalTakenToday;

    return {
      adherenceRate: adherenceService.calculateAdherence(todayTracking),
      totalScheduledToday,
      totalTakenToday,
      totalPendingToday,
      thisWeekAdherence: adherenceService.calculateAdherence(weekTracking),
      thisMonthAdherence: adherenceService.calculateAdherence(monthTracking),
      missedMedications: adherenceService.getMissedMedications(7),
      todaySchedule: todayTracking,
    };
  },

  getWeeklyReport: () => {
    const weekTracking = adherenceService.getThisWeekTracking();
    const daysInWeek: { [key: string]: { taken: number; scheduled: number } } = {};

    // Initialize days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      daysInWeek[dateStr] = { taken: 0, scheduled: 0 };
    }

    // Count medications
    weekTracking.forEach(medication => {
      if (daysInWeek[medication.date]) {
        daysInWeek[medication.date].scheduled++;
        if (medication.taken) {
          daysInWeek[medication.date].taken++;
        }
      }
    });

    return {
      startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      dailyData: daysInWeek,
      weeklyAdherence: adherenceService.calculateAdherence(weekTracking),
    };
  },

  deleteMedicationRecord: (id: string): boolean => {
    const tracking = adherenceService.getAllMedicationTracking();
    const filtered = tracking.filter(t => t.id !== id);
    if (filtered.length === tracking.length) return false;
    localStorage.setItem(MEDICATION_TRACKING_KEY, JSON.stringify(filtered));
    return true;
  },

  updateMedicationRecord: (id: string, taken: boolean, notes?: string): MedicationTaken | null => {
    const tracking = adherenceService.getAllMedicationTracking();
    const index = tracking.findIndex(t => t.id === id);
    if (index === -1) return null;

    tracking[index].taken = taken;
    if (notes) tracking[index].notes = notes;
    if (taken && !tracking[index].takenAt) {
      tracking[index].takenAt = new Date().toISOString();
    }

    localStorage.setItem(MEDICATION_TRACKING_KEY, JSON.stringify(tracking));
    return tracking[index];
  },
};
