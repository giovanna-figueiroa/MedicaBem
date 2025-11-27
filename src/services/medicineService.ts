import type { Medicine, MedicineFormData, MedicineSchedule } from '../types';

const STORAGE_KEY = 'medicines_data';

export const medicineService = {
  getAllMedicines: (): Medicine[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  addMedicine: (formData: MedicineFormData, schedules?: Array<{ time: string; daysOfWeek: number[] }>): Medicine => {
    const medicines = medicineService.getAllMedicines();
    const medicineSchedules: MedicineSchedule[] = schedules?.map((s, index) => ({
      id: `schedule-${Date.now()}-${index}`,
      medicineId: '',
      time: s.time,
      daysOfWeek: s.daysOfWeek,
      active: true,
    })) || [];

    const newMedicine: Medicine = {
      ...formData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      schedule: medicineSchedules,
    };

    // Update schedule with medicineId
    newMedicine.schedule?.forEach(s => {
      s.medicineId = newMedicine.id;
    });

    medicines.push(newMedicine);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
    return newMedicine;
  },

  updateMedicine: (id: string, formData: MedicineFormData): Medicine | null => {
    const medicines = medicineService.getAllMedicines();
    const index = medicines.findIndex(m => m.id === id);
    if (index === -1) return null;

    const updated = {
      ...medicines[index],
      ...formData,
    };
    medicines[index] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
    return updated;
  },

  deleteMedicine: (id: string): boolean => {
    const medicines = medicineService.getAllMedicines();
    const filtered = medicines.filter(m => m.id !== id);
    if (filtered.length === medicines.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  getMedicineById: (id: string): Medicine | null => {
    const medicines = medicineService.getAllMedicines();
    return medicines.find(m => m.id === id) || null;
  },

  searchMedicines: (query: string): Medicine[] => {
    const medicines = medicineService.getAllMedicines();
    const lowerQuery = query.toLowerCase();
    return medicines.filter(m =>
      m.name.toLowerCase().includes(lowerQuery) ||
      m.category.toLowerCase().includes(lowerQuery)
    );
  },

  getExpiringSoon: (): Medicine[] => {
    // expiry data removed from medicines; return empty list
    return [];
  },

  getLowStock: (threshold: number = 10): Medicine[] => {
    const medicines = medicineService.getAllMedicines();
    return medicines.filter(m => m.quantity <= threshold);
  },

  getTotalValue: (): number => {
    // price removed from medicines; total value not available
    return 0;
  },

  getStats: () => {
    const medicines = medicineService.getAllMedicines();
    const totalStock = medicines.reduce((sum, m) => sum + m.quantity, 0);

    return {
      totalMedicines: medicines.length,
      totalStock,
    };
  },
};
