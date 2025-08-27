# KTech Store - Módulos JavaScript

Este projeto foi dividido em módulos separados para melhor organização e manutenibilidade do código.

## Estrutura dos Arquivos

```
js/
├── utils.js          # Módulo de utilitários gerais
├── search.js         # Módulo de busca e filtros
├── location.js       # Módulo de localização e mapas  
├── cart.js           # Módulo do carrinho de compras
└── store.js          # Módulo principal (orquestrador)
```

## Como Incluir no HTML

Adicione os scripts na seguinte ordem no seu HTML (antes do fechamento da tag `</body>`):

```html
<!-- Scripts dos módulos (ordem importante) -->
<script src="js/utils.js"></script>
<script src="js/search.js"></script>
<script src="js/location.js"></script>
<script src="js/cart.js"></script>
<script src="js/store.js"></script>
```

## Descrição dos Módulos

### 1. utils.js - Módulo de Utilitários
**Funções:** Formatação de preços, escape de HTML, notificações, validações, etc.
- `UtilsModule.formatPrice(price)` - Formatar preços
- `UtilsModule.escapeHtml(str)` - Escapar HTML
- `UtilsModule.showNotification(message, type)` - Mostrar notificações
- `UtilsModule.validateName(name)` - Validar nomes

### 2. search.js - Módulo de Busca
**Responsabilidades:** Sistema de busca inteligente com sinônimos
- `SearchModule.handleSearch(term, products, callback)` - Executar busca
- `SearchModule.normalizeSearchTerm(term)` - Normalizar termos
- `SearchModule.matchProduct(productName, searchTerms)` - Verificar correspondências
- `SearchModule.calculateRelevanceScore()` - Calcular relevância

### 3. location.js - Módulo de Localização
**Responsabilidades:** Mapas, geolocalização e endereços
- `LocationModule.initializeMap()` - Inicializar mapa Leaflet
- `LocationModule.fillAddressFromLocation(lat, lng)` - Buscar endereço por coordenadas
- `LocationModule.sendLocationToWebhook(lat, lng)` - Enviar localização
- `LocationModule.getSelectedLocation()` - Obter localização selecionada

### 4. cart.js - Módulo do Carrinho
**Responsabilidades:** Gerenciamento do carrinho de compras
- `CartModule.toggleCartItem(productName, products)` - Adicionar/remover item
- `CartModule.changeQuantity(productName, delta)` - Alterar quantidade
- `CartModule.saveCartToCache()` - Salvar no localStorage
- `CartModule.loadCartFromCache()` - Carregar do localStorage
- `CartModule.getTotalItems()` - Obter total de itens

### 5. store.js - Módulo Principal
**Responsabilidades:** Orquestração geral e inicialização
- Inicialização de todos os módulos
- Gerenciamento de eventos
- Renderização da interface
- Submissão de formulários

## Dependências Externas

### Leaflet (para mapas)
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

## Funcionalidades

### Busca Inteligente
- Busca com sinônimos e variações
- Normalização de termos (remove acentos)
- Sistema de pontuação por relevância
- Suporte a termos técnicos

### Localização
- Geolocalização automática
- Mapa interativo com Leaflet
- Busca reversa de endereços
- Fallback para APIs externas

### Carrinho
- Cache automático (30 horas)
- Controle de quantidade
- Persistência entre sessões
- Interface responsiva

### Características Gerais
- Código modular e reutilizável
- Sistema de notificações
- Validação de formulários
- Interface responsiva
- Compatibilidade com URLs parametrizadas

## Notas Importantes

1. **Ordem de Carregamento:** Os módulos devem ser carregados na ordem especificada
2. **Variáveis Globais:** Cada módulo expõe sua classe na variável `window`
3. **Dependências:** O módulo principal (`store.js`) coordena todos os outros
4. **Cache:** O carrinho é salvo automaticamente no localStorage
5. **APIs:** Utiliza webhooks específicos para produtos e geocodificação

## Personalização

Para personalizar o comportamento:

1. **Busca:** Modifique o dicionário de sinônimos em `search.js`
2. **Localização:** Altere coordenadas padrão em `location.js`  
3. **Carrinho:** Ajuste tempo de cache em `cart.js`
4. **UI:** Personalize notificações e estilos em `utils.js`

## Troubleshooting

- **Mapa não carrega:** Verifique se o Leaflet está incluído
- **Busca não funciona:** Confirme ordem de carregamento dos scripts
- **Carrinho não persiste:** Verifique se localStorage está habilitado
- **Localização falha:** Confirme permissões de geolocalização