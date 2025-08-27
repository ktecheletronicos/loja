// search.js - Módulo de Busca
class SearchModule {
  constructor() {
    this.products = [];
  }
  
  handleSearch(term, products, renderCallback) {
    this.products = products;
    
    if (!term) {
      renderCallback(this.products);
      return;
    }
    
    const searchTerms = this.normalizeSearchTerm(term);
    const filteredProducts = this.products.filter(product => 
      this.matchProduct(product.PRODUTO, searchTerms)
    );
    
    // Ordenar por relevância
    const scoredProducts = filteredProducts.map(product => ({
      ...product,
      score: this.calculateRelevanceScore(product.PRODUTO, searchTerms, term)
    })).sort((a, b) => b.score - a.score);
    
    renderCallback(scoredProducts);
  }

  normalizeSearchTerm(term) {
    // Normalizar e dividir em palavras
    const normalized = term.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .replace(/\s+/g, ' ') // Remove espaços extras
      .trim();
    
    return normalized.split(' ').filter(word => word.length > 0);
  }

  matchProduct(productName, searchTerms) {
    const productNormalized = productName.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
  // Dicionário expandido de sinônimos e variações
  const synonyms = {
    // Armazenamento
    'ssd': ['solid', 'state', 'drive', 'disco', 'hd'],
    'hd': ['hard', 'drive', 'disco'],
    'm2': ['ngff', 'nvme', 'pcie', 'msata'],
    'sata': ['serial', 'ata'],
    'caddy': ['suporte', 'adaptador hd', 'bay'],

    // Memória
    'memoria': ['ram', 'ddr', 'dimm', 'so-dimm', 'not', 'pc'],
    'ddr2': ['pc2'],
    'ddr3': ['pc3'],
    'ddr4': ['pc4'],
    'ddr5': ['pc5'],

    // Placas e adaptadores
    'placa': ['board', 'mother', 'mae', 'card'],
    'rede': ['network', 'ethernet', 'lan', 'wifi'],
    'adaptador': ['adapter', 'converter', 'dongle'],
    'conversor': ['converter', 'adapter'],
    'video': ['vga', 'graphics', 'grafica', 'gpu'],

    // Cabos
    'cabo': ['wire', 'fio'],
    'hdmi': ['high-definition', 'multimidia'],
    'displayport': ['dp'],
    'dvi': ['digital video interface'],
    'vga': ['video graphics array'],
    'p2': ['3.5mm', 'aux'],
    'p10': ['6.35mm', 'jack'],
    'rj45': ['ethernet', 'lan'],
    'usb': ['universal serial bus'],

    // Energia
    'fonte': ['power', 'supply', 'alimentacao', 'charger', 'adaptador energia'],
    'carregador': ['charger', 'fonte', 'power'],
    'bateria': ['battery', 'pilha'],

    // Periféricos
    'mouse': ['rato'],
    'teclado': ['keyboard'],
    'headset': ['fone', 'headphone', 'auricular', 'fone gamer'],
    'fone': ['earphone', 'headphone'],
    'microfone': ['mic', 'microphone'],
    'webcam': ['camera', 'web', 'cam'],
    'monitor': ['display', 'tela'],
    'alto-falante': ['speaker', 'caixa', 'som'],

    // Gamer
    'controle': ['joystick', 'gamepad', 'controlador'],
    'gamer': ['gaming', 'game'],

    // Dispositivos inteligentes
    'smartwatch': ['relogio', 'watch', 'wearable'],
    'alexa': ['echo', 'dot'],
    'lampada': ['light', 'led', 'bulb'],
    'tomada': ['plug', 'socket'],
    'zigbee': ['hub zigbee'],
    'wifi': ['wireless', 'sem fio'],
    'bluetooth': ['bt'],

    // Diversos
    'hub': ['concentrador'],
    'switch': ['comutador'],
    'scanner': ['digitalizador'],
    'impressora': ['printer'],
    'case': ['gabinete', 'estojo', 'caixa'],

    // Capacidade
    '16gb': ['16 gb', '16'],
    '32gb': ['32 gb', '32'],
    '64gb': ['64 gb', '64'],
    '128gb': ['128 gb', '128'],
    '256gb': ['256 gb', '256'],
    '512gb': ['512 gb', '512'],
    '1tb': ['1 tb', '1000 gb', 'tera'],
    '2tb': ['2 tb', '2000 gb'],
    '960gb': ['960 gb'],

    // Formatos
    '2.5': ['2,5', 'duas cinco', 'dois cinco'],
    '3.5': ['3,5', 'tres cinco'],
    'tipo-c': ['type-c', 'usb-c', 'typec'],
    'lightning': ['iphone conector', 'apple cabo']
  };
    
    // Verificar se todas as palavras da busca têm correspondência
    return searchTerms.every(searchTerm => {
      // Correspondência direta
      if (productNormalized.includes(searchTerm)) {
        return true;
      }
      
      // Verificar sinônimos
      const relatedWords = synonyms[searchTerm] || [];
      if (relatedWords.some(synonym => productNormalized.includes(synonym))) {
        return true;
      }
      
      // Verificar se o termo de busca é sinônimo de algo no produto
      for (const [key, values] of Object.entries(synonyms)) {
        if (values.includes(searchTerm) && productNormalized.includes(key)) {
          return true;
        }
      }
      
      // Busca parcial (para números e medidas)
      if (searchTerm.length >= 3) {
        const words = productNormalized.split(/\s+/);
        return words.some(word => 
          word.includes(searchTerm) || 
          searchTerm.includes(word)
        );
      }
      
      return false;
    });
  }

  calculateRelevanceScore(productName, searchTerms, originalTerm) {
    let score = 0;
    const productLower = productName.toLowerCase();
    const originalLower = originalTerm.toLowerCase();
    
    // Correspondência exata da busca completa
    if (productLower.includes(originalLower)) {
      score += 100;
    }
    
    // Correspondência no início do nome
    if (productLower.startsWith(originalLower)) {
      score += 50;
    }
    
    // Pontos por cada termo encontrado
    searchTerms.forEach(term => {
      if (productLower.includes(term)) {
        score += 10;
        
        // Bônus se estiver no início
        if (productLower.startsWith(term)) {
          score += 5;
        }
      }
    });
    
    // Bônus para produtos com menos palavras (mais específicos)
    const wordCount = productName.split(' ').length;
    score += Math.max(0, 20 - wordCount);
    
    return score;
  }
}

// Export para uso no módulo principal
window.SearchModule = SearchModule;