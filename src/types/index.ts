export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  quantity: number;
  category: string;
  notes?: string;
  createdAt: string;
  schedule?: MedicineSchedule[];
}

export interface MedicineSchedule {
  id: string;
  medicineId: string;
  time: string; // HH:mm format
  daysOfWeek: number[]; // 0-6, 0 = Sunday
  active: boolean;
}

export interface MedicationTaken {
  id: string;
  medicineId: string;
  medicineName: string;
  scheduledTime: string;
  takenAt?: string; // ISO timestamp
  date: string; // YYYY-MM-DD
  taken: boolean;
  notes?: string;
}

export interface MedicineFormData {
  name: string;
  dosage: string;
  quantity: number;
  category: string;
  notes?: string;
}

export interface DashboardStats {
  totalMedicines: number;
  totalStock: number;
}

export interface Caregiver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notificationType: 'whatsapp' | 'sms';
  relationship: string;
  active: boolean;
  createdAt: string;
}

export interface CaregiverFormData {
  name: string;
  phone: string;
  email?: string;
  notificationType: 'whatsapp' | 'sms';
  relationship: string;
}

export interface HealthSummary {
  adherenceRate: number; // percentage 0-100
  totalScheduledToday: number;
  totalTakenToday: number;
  totalPendingToday: number;
  thisWeekAdherence: number;
  thisMonthAdherence: number;
  missedMedications: MedicationTaken[];
  todaySchedule: MedicationTaken[];
}
