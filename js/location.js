// location.js - Módulo de Localização
class LocationModule {
  constructor() {
    this.map = null;
    this.marker = null;
    this.selectedLocation = null;
    this.addressFetchTimeout = null;
  }
  
  initializeMap() {
    if (this.map) return;
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer || mapContainer.offsetWidth === 0) {
      console.log('Map container not ready, retrying...');
      setTimeout(() => this.initializeMap(), 200);
      return;
    }
    
    const defaultLat = -5.090000;
    const defaultLng = -42.811000;
    
    this.map = L.map(mapContainer).setView([defaultLat, defaultLng], 16);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);
    
    this.marker = L.marker([defaultLat, defaultLng], { 
      draggable: true,
      riseOnHover: true 
    }).addTo(this.map);
    
    this.selectedLocation = this.marker.getLatLng();
    
    // Aguardar o mapa carregar completamente
    this.map.whenReady(() => {
      console.log('Map is ready');
      
      // Try to get user's location
      if (navigator.geolocation) {
        console.log('Requesting user location...');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Got user location:', position.coords);
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            this.map.setView([lat, lng], 16);
            this.marker.setLatLng([lat, lng]);
            this.selectedLocation = this.marker.getLatLng();
            this.fillAddressFromLocation(lat, lng);
            this.sendLocationToWebhook(lat, lng);
          },
          (error) => {
            console.log('Geolocation error:', error);
            this.fillAddressFromLocation(defaultLat, defaultLng);
          },
          {
            timeout: 10000,
            enableHighAccuracy: true,
            maximumAge: 300000 // 5 minutos
          }
        );
      } else {
        console.log('Geolocation not supported');
        this.fillAddressFromLocation(defaultLat, defaultLng);
      }
    });
    
    // Evento de arrastar o marcador
    this.marker.on('dragstart', () => {
      console.log('Marker drag started');
    });
    
    this.marker.on('dragend', (e) => {
      console.log('Marker drag ended');
      this.selectedLocation = e.target.getLatLng();
      console.log('New location:', this.selectedLocation);
      this.fillAddressFromLocation(this.selectedLocation.lat, this.selectedLocation.lng);
      this.sendLocationToWebhook(this.selectedLocation.lat, this.selectedLocation.lng);
    });
    
    // Forçar redimensionamento do mapa
    setTimeout(() => {
      this.map.invalidateSize();
    }, 300);
  }
  
  async fillAddressFromLocation(lat, lng) {
    console.log('Filling address for:', lat, lng);

    // Cancelar requisição anterior se existir
    if (this.addressFetchTimeout) {
      clearTimeout(this.addressFetchTimeout);
    }

    // Debounce para evitar muitas requisições
    this.addressFetchTimeout = setTimeout(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

        const response = await fetch(
          `https://webhookn8n.ktecheletronicos.com.br/webhook/reverse-geocode?lat=${lat}&lng=${lng}`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Address data received:', data);

        // Agora acessa o endereço dentro de data.body
        if (data && data.body && data.body.address) {
          const addr = data.body.address;

          // Limpar campos antes de preencher
          const streetField = document.getElementById('street');
          const neighborhoodField = document.getElementById('neighborhood');
          const houseNumberField = document.getElementById('houseNumber');
          const cityField = document.getElementById('city');

          if (streetField) streetField.value = '';
          if (neighborhoodField) neighborhoodField.value = '';
          if (houseNumberField) houseNumberField.value = '';
          if (cityField) cityField.value = '';

          // Preencher com novos dados
          if (addr.road && streetField) {
            streetField.value = addr.road;
            console.log('Street filled:', addr.road);
          }

          if (addr.house_number && houseNumberField) {
            houseNumberField.value = addr.house_number;
            console.log('House number filled:', addr.house_number);
          }

  // Bairro / neighbourhood
  let neighbourhoodText = '';

  if (addr.neighbourhood) {
    neighbourhoodText = addr.neighbourhood;
    if (addr.suburb) {
      neighbourhoodText += ' - Bairro: ' + addr.suburb;
    }
  } else if (addr.suburb) {
    neighbourhoodText = addr.suburb;
  } else if (addr.quarter) {
    neighbourhoodText = addr.quarter;
  }

  if (neighbourhoodText && neighborhoodField) {
    neighborhoodField.value = neighbourhoodText;
    console.log('Neighborhood filled:', neighbourhoodText);
  }	

		
  // Função auxiliar para transformar estado em sigla
  function getStateAbbreviation(state) {
    const map = {
      "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
      "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
      "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
      "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
      "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
      "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
      "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO"
    };
    return map[state] || state || '';
  }

  // Construindo cidade + estado (sigla)
  const city = addr.city || addr.town || addr.municipality || addr.village || '';
  const state = getStateAbbreviation(addr.state);
  const cidadeEstado = `${city} - ${state}`.trim();


          if (city && cityField) {
            cityField.value = cidadeEstado;
            console.log('City filled:', city);
          }
        } else {
          console.warn('No address data in response');
        }
      } catch (error) {
        console.error('Error fetching address:', error);

        // Fallback se o webhook falhar
        try {
          const fallbackResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`
          );
          const fallbackData = await fallbackResponse.json();

          if (fallbackData) {
            const streetField = document.getElementById('street');
            const neighborhoodField = document.getElementById('neighborhood');
            const cityField = document.getElementById('city');

            if (fallbackData.locality && neighborhoodField) {
              neighborhoodField.value = fallbackData.locality;
            }

            if (fallbackData.city && cityField) {
              cityField.value = fallbackData.city;
            }

            console.log('Fallback address filled');
          }
        } catch (fallbackError) {
          console.error('Fallback geocoding also failed:', fallbackError);
        }
      }
    }, 500); // Aguarda 500ms antes de fazer a requisição
  }
  
  async sendLocationToWebhook(lat, lng) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch('https://webhookn8n.ktecheletronicos.com.br/webhook/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error sending location:', error);
    }
  }
  
  getSelectedLocation() {
    return this.selectedLocation;
  }
}

// Export para uso no módulo principal
window.LocationModule = LocationModule;