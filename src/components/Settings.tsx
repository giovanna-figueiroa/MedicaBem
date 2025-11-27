import './Settings.css';

interface SettingsProps {
  onDataCleared?: () => void;
}

export function Settings({ onDataCleared }: SettingsProps) {
  const handleClearAllData = () => {
    const confirmed = confirm(
      '⚠️ Tem certeza que deseja apagar TODOS os dados?\n\n' +
      'Isso vai remover:\n' +
      '• Medicamentos\n' +
      '• Histórico de aderência\n' +
      '• Cuidadores cadastrados\n\n' +
      'Esta ação NÃO pode ser desfeita.'
    );

    if (confirmed) {
      const keys = ['medicines_data', 'medication_tracking', 'caregivers_data'];
      keys.forEach(key => {
        localStorage.removeItem(key);
      });
      sessionStorage.clear();

      alert('✓ Todos os dados foram removidos com sucesso!');
      
      if (onDataCleared) {
        onDataCleared();
      }
      
      // Reload page
      window.location.reload();
    }
  };

  return (
    <div className="settings-container">
      <h1>⚙️ Configurações</h1>

      <div className="settings-section">
        <div className="settings-card danger">
          <div className="card-header">
            <h2>🗑️ Limpar Dados</h2>
            <p className="card-description">Remove todos os medicamentos, histórico e cuidadores cadastrados</p>
          </div>
          
          <div className="card-content">
            <div className="warning-box">
              <span className="warning-icon">⚠️</span>
              <div className="warning-text">
                <strong>Atenção:</strong> Esta ação é irreversível. Todos os seus dados serão permanentemente deletados.
              </div>
            </div>

            <button
              className="btn-clear-data"
              onClick={handleClearAllData}
            >
              Apagar Todos os Dados
            </button>
          </div>
        </div>

        <div className="settings-card info">
          <div className="card-header">
            <h2>ℹ️ Informações</h2>
          </div>
          
          <div className="card-content">
            <div className="info-item">
              <span className="label">Versão</span>
              <span className="value">1.0.0</span>
            </div>
            <div className="info-item">
              <span className="label">Armazenamento</span>
              <span className="value">Local Storage (navegador)</span>
            </div>
            <div className="info-item">
              <span className="label">Dados Sincronizados</span>
              <span className="value">Não</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
