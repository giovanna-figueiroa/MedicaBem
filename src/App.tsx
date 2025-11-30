import { useState, useEffect } from 'react'
import { Dashboard, MedicineForm, MedicineList, SearchBar, HealthSummary, CaregiverManagement, Settings } from './components'
import { medicineService } from './services/medicineService'
import { alertService } from './services/alertService'
import { caregiverService } from './services/caregiverService'
import type { Medicine, MedicineFormData } from './types'
import './App.css'

function App() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [filteredMedicines, setFilteredMedicines] = useState<Medicine[]>([])
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'list' | 'health' | 'caregivers' | 'settings'>('dashboard')
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)

  useEffect(() => {
    loadMedicines()
    
    // Start alert monitoring
    const intervalId = alertService.startMonitoring()

    // Hook de teste: window.triggerAlertTest()
    ;(window as any).triggerAlertTest = () => {
      const caregivers = caregiverService.getAllCaregivers()
      const meds = medicineService.getAllMedicines()
      const result = alertService.triggerTestAlert(caregivers, meds)
      alert(result.message)
      return result
    }
    
    // Cleanup on unmount
    return () => {
      clearInterval(intervalId)
      delete (window as any).triggerAlertTest
    }
  }, [])

  const loadMedicines = () => {
    const data = medicineService.getAllMedicines()
    setMedicines(data)
    setFilteredMedicines(data)
  }

  const handleAddMedicine = (formData: MedicineFormData, schedules?: Array<{ time: string; daysOfWeek: number[] }>) => {
    if (editingMedicine) {
      medicineService.updateMedicine(editingMedicine.id, formData)
      setEditingMedicine(null)
      loadMedicines()
      alert('Medicamento atualizado com sucesso!')
    } else {
      medicineService.addMedicine(formData, schedules)
      loadMedicines()
      alert('Medicamento cadastrado com sucesso!')
    }
    setActiveTab('list')
  }

  const handleEditMedicine = (medicine: Medicine) => {
    setEditingMedicine(medicine)
    setActiveTab('form')
  }

  const handleCancelEdit = () => {
    setEditingMedicine(null)
  }

  const handleDeleteMedicine = (id: string) => {
    medicineService.deleteMedicine(id)
    loadMedicines()
    alert('Medicamento deletado com sucesso!')
  }

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredMedicines(medicines)
    } else {
      const results = medicineService.searchMedicines(query)
      setFilteredMedicines(results)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">💊 Gerenciador de Medicamentos</h1>
          <p className="app-subtitle">Sistema de controle de estoque de medicamentos</p>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-btn ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          ➕ Cadastrar
        </button>
        <button
          className={`nav-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 Medicamentos
        </button>
        <button
          className={`nav-btn ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          ❤️ Saúde
        </button>
        <button
          className={`nav-btn ${activeTab === 'caregivers' ? 'active' : ''}`}
          onClick={() => setActiveTab('caregivers')}
        >
          👨‍⚕️ Cuidadores
        </button>
        <button
          className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Configurações
        </button>
      </nav>

      <main className="app-main">
        <div className="container">
          {activeTab === 'dashboard' && (
            <Dashboard />
          )}

          {activeTab === 'form' && (
            <MedicineForm 
              onSubmit={handleAddMedicine}
              editingMedicine={editingMedicine}
              onCancel={handleCancelEdit}
            />
          )}

          {activeTab === 'list' && (
            <>
              <SearchBar onSearch={handleSearch} />
              <MedicineList
                medicines={filteredMedicines}
                onEdit={handleEditMedicine}
                onDelete={handleDeleteMedicine}
              />
            </>
          )}

          {activeTab === 'health' && (
            <HealthSummary />
          )}

          {activeTab === 'caregivers' && (
            <CaregiverManagement />
          )}

          {activeTab === 'settings' && (
            <Settings />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>&copy; 2025 Gerenciador de Medicamentos. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}

export default App
