// utils.js - Módulo de Utilitários
class UtilsModule {
  static formatPrice(price) {
    if (!price || isNaN(price)) return 'Consulte';
    return `R$ ${parseFloat(price).toFixed(2).replace('.', ',')}`;
  }
  
  static escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  static showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
      color: white;
      padding: 12px 20px;
      border-radius: var(--border-radius-sm);
      box-shadow: var(--shadow);
      z-index: 10000;
      font-weight: 600;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: calc(100vw - 40px);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide notification
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
  
  static getUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      name: urlParams.get('name')
    };
  }
  
  static validateName(name) {
    return /^[A-Za-zÀ-ÿ ]{12,}$/.test(name);
  }
  
  static debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
  
  static getStateAbbreviation(state) {
    const stateMap = {
      "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
      "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
      "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
      "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
      "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
      "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
      "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO"
    };
    return stateMap[state] || state || '';
  }
  
  static async fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  static createLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
      grid-column: 1 / -1;
    `;
    spinner.innerHTML = `
      <div style="
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
    `;
    return spinner;
  }
  
  static createEmptyState(icon, message, subtitle = '') {
    const emptyState = document.createElement('div');
    emptyState.style.cssText = `
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px;
      color: var(--gray);
    `;
    emptyState.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
      <div style="font-size: 18px;">${message}</div>
      ${subtitle ? `<div style="font-size: 14px; color: var(--gray); margin-top: 8px;">${subtitle}</div>` : ''}
    `;
    return emptyState;
  }
}

// Export para uso nos outros módulos
window.UtilsModule = UtilsModule;