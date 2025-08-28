// location.js - Módulo de Localização
class LocationModule {
  constructor() {
    this.map = null;
    this.marker = null;
    this.selectedLocation = null;
    this.addressFetchTimeout = null;
    this.routeControl = null;
    
    // Local de referência para cálculo de distância
    this.referenceLocation = {
      lat: -5.110777,
      lng: -42.742837
    };
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
    
    // Adicionar marcador do local de referência
    const referenceMarker = L.marker([this.referenceLocation.lat, this.referenceLocation.lng], {
      draggable: false,
      riseOnHover: true
    }).addTo(this.map);
    
    // Ícone diferente para o marcador de referência
    referenceMarker.bindPopup('Local de Referência').openPopup();
    
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
            this.calculateRouteDistance();
          },
          (error) => {
            console.log('Geolocation error:', error);
            this.fillAddressFromLocation(defaultLat, defaultLng);
            this.calculateRouteDistance();
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
        this.calculateRouteDistance();
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
      this.calculateRouteDistance();
    });
    
    // Forçar redimensionamento do mapa
    setTimeout(() => {
      this.map.invalidateSize();
    }, 300);
  }
  
  /**
   * Calcula a distância de rota entre a localização selecionada e o local de referência
   * @returns {Promise<number>} Distância em quilômetros
   */
  async calculateRouteDistance() {
    if (!this.selectedLocation) return 0;
    
    try {
      const startLat = this.selectedLocation.lat;
      const startLng = this.selectedLocation.lng;
      const endLat = this.referenceLocation.lat;
      const endLng = this.referenceLocation.lng;
      
      console.log('Calculating route distance from:', startLat, startLng, 'to:', endLat, endLng);
      
      // Usando OSRM (Open Source Routing Machine) para calcular a rota
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false&alternatives=false&steps=false`
      );
      
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const distanceInMeters = data.routes[0].distance;
        const distanceInKm = (distanceInMeters / 1000).toFixed(2);
        
        console.log(`Route distance: ${distanceInKm} km`);
        
        // Disparar evento customizado com a distância calculada
        this.dispatchDistanceEvent(parseFloat(distanceInKm));
        
        return parseFloat(distanceInKm);
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      console.error('Error calculating route distance:', error);
      
      // Fallback: calcular distância em linha reta
      const straightDistance = this.calculateStraightDistance();
      console.log(`Fallback to straight distance: ${straightDistance} km`);
      
      this.dispatchDistanceEvent(straightDistance);
      return straightDistance;
    }
  }
  
  /**
   * Calcula a distância em linha reta usando a fórmula de Haversine
   * @returns {number} Distância em quilômetros
   */
  calculateStraightDistance() {
    if (!this.selectedLocation) return 0;
    
    const R = 6371; // Raio da Terra em km
    const lat1 = this.selectedLocation.lat * Math.PI / 180;
    const lat2 = this.referenceLocation.lat * Math.PI / 180;
    const deltaLat = (this.referenceLocation.lat - this.selectedLocation.lat) * Math.PI / 180;
    const deltaLng = (this.referenceLocation.lng - this.selectedLocation.lng) * Math.PI / 180;
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return parseFloat(distance.toFixed(2));
  }
  
  /**
   * Dispara evento customizado com a distância calculada
   * @param {number} distance Distância em quilômetros
   */
  dispatchDistanceEvent(distance) {
    const event = new CustomEvent('locationDistanceCalculated', {
      detail: {
        distance: distance,
        from: {
          lat: this.selectedLocation.lat,
          lng: this.selectedLocation.lng
        },
        to: this.referenceLocation,
        unit: 'km'
      }
    });
    
    document.dispatchEvent(event);
    
    // Também exibir no console para debug
    console.log(`Distance calculated: ${distance} km`);
  }
  
  /**
   * Obtém a última distância calculada
   * @returns {Promise<number>} Distância em quilômetros
   */
  async getDistanceToReference() {
    return await this.calculateRouteDistance();
  }
  
  /**
   * Atualiza o local de referência para cálculo de distância
   * @param {number} lat Latitude
   * @param {number} lng Longitude
   */
  setReferenceLocation(lat, lng) {
    this.referenceLocation = { lat, lng };
    console.log('Reference location updated to:', lat, lng);
    
    // Recalcular distância se já há uma localização selecionada
    if (this.selectedLocation) {
      this.calculateRouteDistance();
    }
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

// Exemplo de como usar o evento de distância calculada:
/*
document.addEventListener('locationDistanceCalculated', (event) => {
  const { distance, from, to, unit } = event.detail;
  console.log(`Distância calculada: ${distance} ${unit}`);
  console.log(`De: ${from.lat}, ${from.lng}`);
  console.log(`Para: ${to.lat}, ${to.lng}`);
  
  // Aqui você pode atualizar a interface do usuário com a distância
  // Por exemplo:
  const distanceDisplay = document.getElementById('distance-display');
  if (distanceDisplay) {
    distanceDisplay.textContent = `${distance} km`;
  }
});
*/