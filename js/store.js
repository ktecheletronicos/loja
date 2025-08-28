// store.js - Módulo Principal (Versão Atualizada com Webhook e Search via URL)
class KTechStore {
  constructor() {
    this.products = [];
    this.customerNameFromUrl = null;
    this.searchFromUrl = null;
    
    // Inicializar módulos
    this.searchModule = new SearchModule();
    this.locationModule = new LocationModule();
    this.cartModule = new CartModule();
    
    this.initializeElements();
    this.getUrlParameters();
    this.cartModule.loadCartFromCache();
    this.setupNameFieldFromUrl();
    this.updateCart(); // Atualizar carrinho após carregar do cache
    this.bindEvents();
    this.loadProducts();
    this.setupDeliveryFeeListener();
  }
  
  formatPrice(price) {
    if (!price || isNaN(price)) return 'Consulte';
    return `R$ ${parseFloat(price).toFixed(2).replace('.', ',')}`;
  }
  
  // Função para calcular total do carrinho (sem taxa de entrega)
  calculateCartTotal() {
    const cart = this.cartModule.getCart();
    let total = 0;
    
    cart.forEach(item => {
      if (item.VALOR_VENDA && !isNaN(item.VALOR_VENDA)) {
        total += parseFloat(item.VALOR_VENDA) * item.quantity;
      }
    });
    
    return total;
  }
  
  // Função para calcular total final (carrinho + taxa de entrega)
  calculateFinalTotal() {
    const cartTotal = this.calculateCartTotal();
    const deliveryFee = this.getCurrentDeliveryFee();
    return cartTotal + deliveryFee;
  }
  
  // Função para obter a taxa de entrega atual
  getCurrentDeliveryFee() {
    const selectedDeliveryOption = document.querySelector('input[name="deliveryOption"]:checked');
    if (selectedDeliveryOption && selectedDeliveryOption.value === 'ENTREGA') {
      return window.getCurrentDeliveryFee ? window.getCurrentDeliveryFee() : 0;
    }
    return 0;
  }
  
  // Função para calcular subtotal de um item
  calculateItemSubtotal(item) {
    if (!item.VALOR_VENDA || isNaN(item.VALOR_VENDA)) return 0;
    return parseFloat(item.VALOR_VENDA) * item.quantity;
  }
  
  // Setup listener para atualizações da taxa de entrega
  setupDeliveryFeeListener() {
    document.addEventListener('locationDistanceCalculated', () => {
      // Atualizar total quando distância for recalculada
      this.updateCartTotal();
    });
  }
  
  getUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    this.customerNameFromUrl = urlParams.get('name');
    this.searchFromUrl = urlParams.get('search');
    
    if (this.customerNameFromUrl) {
      console.log('Nome recebido via URL:', this.customerNameFromUrl);
    }
    
    if (this.searchFromUrl) {
      console.log('Busca recebida via URL:', this.searchFromUrl);
    }
  }
  
  setupNameFieldFromUrl() {
    if (this.customerNameFromUrl) {
      // Preencher campo automaticamente
      if (this.customerName) {
        this.customerName.value = this.customerNameFromUrl;
        // Ocultar APENAS o campo de nome (input)
        this.customerName.style.display = 'none';
        // Ocultar APENAS a mensagem de erro do nome
        const nameError = document.getElementById('nameError');
        if (nameError) {
          nameError.style.display = 'none';
        }
      }
    }
  }
  
  setupSearchFieldFromUrl() {
    if (this.searchFromUrl && this.searchInput) {
      // Preencher campo de busca automaticamente
      this.searchInput.value = this.searchFromUrl;
      
      // Aplicar a busca nos produtos já carregados
      if (this.products.length > 0) {
        this.searchModule.handleSearch(this.searchFromUrl, this.products, (filteredProducts) => {
          this.renderProducts(filteredProducts);
        });
      }
      
      console.log('Campo de busca preenchido com:', this.searchFromUrl);
    }
  }
  
  initializeElements() {
    // Header elements
    this.searchInput = document.getElementById('searchInput');
    this.cartToggle = document.getElementById('cartToggle');
    this.cartCount = document.getElementById('cartCount');
    
    // Products
    this.productsGrid = document.getElementById('productsGrid');
    this.loadingSpinner = document.getElementById('loadingSpinner');
    
    // Cart
    this.cartOverlay = document.getElementById('cartOverlay');
    this.cartPanel = document.getElementById('cartPanel');
    this.cartClose = document.getElementById('cartClose');
    this.cartItems = document.getElementById('cartItems');
    this.cartTotal = document.getElementById('cartTotal'); // Novo elemento para total
    this.floatingCart = document.getElementById('floatingCart');
    this.floatingCount = document.getElementById('floatingCount');
    
    // Form
    this.deliveryForm = document.getElementById('deliveryForm');
    this.customerForm = document.getElementById('customerForm');
    this.customerName = document.getElementById('customerName');
    this.paymentMethod = document.getElementById('paymentMethod');
    this.whatsappBtn = document.getElementById('whatsappBtn');
    
    // Modal
    this.imageModal = document.getElementById('imageModal');
    this.modalImage = document.getElementById('modalImage');
    this.modalClose = document.getElementById('modalClose');
  }
  
  bindEvents() {
    // Search - usando o módulo de busca
    this.searchInput.addEventListener('input', (e) => {
      this.searchModule.handleSearch(e.target.value, this.products, (filteredProducts) => {
        this.renderProducts(filteredProducts);
      });
    });
    
    // Cart toggle
    this.cartToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openCart();
    });
    
    this.floatingCart.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openCart();
    });
    
    // Cart close
    this.cartClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeCart();
    });
    
    this.cartOverlay.addEventListener('click', () => this.closeCart());
    
    // Prevent cart close when clicking inside panel
    this.cartPanel.addEventListener('click', (e) => e.stopPropagation());
    
    // Delivery options
    document.querySelectorAll('input[name="deliveryOption"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handleDeliveryOption(e.target.value);
        // Atualizar total quando opção de entrega mudar
        this.updateCartTotal();
        // Validar formulário quando opção mudar
        this.validateForm();
      });
    });
    
    document.querySelectorAll('input[name="tipoEndereco"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handleAddressType(e.target.value);
        // Validar formulário quando tipo de endereço mudar
        this.validateForm();
      });
    });
    
    // Form validation
    this.customerName.addEventListener('input', () => this.validateForm());
    this.paymentMethod.addEventListener('change', () => this.validateForm());
    
    // Validação em tempo real dos campos de endereço
    const addressFields = ['street', 'houseNumber', 'neighborhood', 'empresaOuCondominio'];
    addressFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', () => this.validateForm());
        field.addEventListener('blur', () => this.validateForm());
      }
    });
    
    // Form submit
    this.customerForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    
    // Modal
    this.modalClose.addEventListener('click', () => this.closeModal());
    this.imageModal.addEventListener('click', (e) => {
      if (e.target === this.imageModal) this.closeModal();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.imageModal.classList.contains('active')) {
          this.closeModal();
        } else if (this.cartPanel.classList.contains('active')) {
          this.closeCart();
        }
      }
    });
  }
  
  async loadProducts() {
    try {
      this.showLoading(true);
      const response = await fetch('https://webhookn8n.ktecheletronicos.com.br/webhook/produtos');
      const data = await response.json();
      
      this.products = Array.isArray(data) ? data.filter(p => p.PRODUTO && p.FOTO) : [];
      
      // Aplicar busca da URL se existir, senão renderizar todos os produtos
      if (this.searchFromUrl) {
        this.setupSearchFieldFromUrl();
      } else {
        this.renderProducts(this.products);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      this.showError('Erro ao carregar produtos. Tente novamente.');
    } finally {
      this.showLoading(false);
    }
  }
  
  showLoading(show) {
    this.loadingSpinner.style.display = show ? 'flex' : 'none';
    this.productsGrid.style.display = show ? 'none' : 'grid';
  }
  
  showError(message) {
    this.productsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--gray);">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <div style="font-size: 18px;">${message}</div>
      </div>
    `;
  }
  
  renderProducts(products) {
    if (products.length === 0) {
      const searchTerm = this.searchInput.value || this.searchFromUrl;
      const message = searchTerm 
        ? `Nenhum produto encontrado para "${searchTerm}"`
        : 'Nenhum produto encontrado';
      
      this.productsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--gray);">
          <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
          <div style="font-size: 18px;">${message}</div>
        </div>
      `;
      return;
    }
    
    this.productsGrid.innerHTML = '';
    
    products.forEach(product => {
      const cartItem = this.cartModule.getCart().find(item => item.PRODUTO === product.PRODUTO);
      const inCart = !!cartItem;
      
      const card = document.createElement('div');
      card.className = 'product-card fade-in';
      
      card.innerHTML = `
        <img src="${product.FOTO}" alt="${this.escapeHtml(product.PRODUTO)}" class="product-image">
        <h3 class="product-title">${this.escapeHtml(product.PRODUTO)}</h3>
        <div class="product-price">${this.formatPrice(product.VALOR_VENDA)}</div>
        
        ${inCart ? `
          <div class="quantity-controls">
            <button class="qty-button minus-btn" data-product="${this.escapeHtml(product.PRODUTO)}">−</button>
            <span class="qty-display">${cartItem.quantity}</span>
            <button class="qty-button plus-btn" data-product="${this.escapeHtml(product.PRODUTO)}">+</button>
          </div>
          <button class="product-button btn-remove" data-product="${this.escapeHtml(product.PRODUTO)}">Remover do Carrinho</button>
        ` : `
          <button class="product-button btn-add" data-product="${this.escapeHtml(product.PRODUTO)}">Adicionar ao Carrinho</button>
        `}
      `;
      
      // Image click event
      const img = card.querySelector('.product-image');
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openModal(product.FOTO);
      });
      
      // Button events
      const button = card.querySelector('.product-button');
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCartItem(product.PRODUTO);
      });
      
      // Quantity controls
      const minusBtn = card.querySelector('.minus-btn');
      const plusBtn = card.querySelector('.plus-btn');
      
      if (minusBtn) {
        minusBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.changeQuantity(product.PRODUTO, -1);
        });
      }
      
      if (plusBtn) {
        plusBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.changeQuantity(product.PRODUTO, 1);
        });
      }
      
      this.productsGrid.appendChild(card);
    });
  }
  
  toggleCartItem(productName) {
    const result = this.cartModule.toggleCartItem(productName, this.products);
    
    if (result) {
      const message = result.action === 'added' 
        ? `${result.product} adicionado ao carrinho`
        : `${result.product} removido do carrinho`;
      const type = result.action === 'added' ? 'success' : 'danger';
      
      this.showNotification(message, type);
    }
    
    this.updateCart();
    
    // Renderizar produtos baseado na busca atual (seja do input ou da URL)
    const currentSearch = this.searchInput.value || this.searchFromUrl || '';
    const filteredProducts = currentSearch ? 
      this.products.filter(p => p.PRODUTO.toLowerCase().includes(currentSearch.toLowerCase())) : 
      this.products;
    
    this.renderProducts(filteredProducts);
  }
  
  changeQuantity(productName, delta) {
    this.cartModule.changeQuantity(productName, delta);
    this.updateCart();
    
    // Renderizar produtos baseado na busca atual (seja do input ou da URL)
    const currentSearch = this.searchInput.value || this.searchFromUrl || '';
    const filteredProducts = currentSearch ? 
      this.products.filter(p => p.PRODUTO.toLowerCase().includes(currentSearch.toLowerCase())) : 
      this.products;
    
    this.renderProducts(filteredProducts);
  }
  
  removeFromCart(productName) {
    this.cartModule.removeFromCart(productName);
    this.updateCart();
    
    // Renderizar produtos baseado na busca atual (seja do input ou da URL)
    const currentSearch = this.searchInput.value || this.searchFromUrl || '';
    const filteredProducts = currentSearch ? 
      this.products.filter(p => p.PRODUTO.toLowerCase().includes(currentSearch.toLowerCase())) : 
      this.products;
    
    this.renderProducts(filteredProducts);
    this.showNotification(`${productName} removido do carrinho`, 'danger');
  }
  
  updateCart() {
    const totalItems = this.cartModule.getTotalItems();
    
    // Update counters
    if (totalItems > 0) {
      this.cartCount.textContent = totalItems;
      this.cartCount.classList.remove('hidden');
      this.floatingCount.textContent = totalItems;
    } else {
      this.cartCount.classList.add('hidden');
      this.floatingCount.textContent = '0';
    }
    
    // Update cart items display
    this.renderCartItems();
    this.validateForm();
  }
  
  renderCartItems() {
    const cart = this.cartModule.getCart();
    
    if (cart.length === 0) {
      this.cartItems.innerHTML = `
        <div class="cart-empty">
          <div style="font-size: 48px; margin-bottom: 16px;">🛒</div>
          <div>Seu carrinho está vazio</div>
          <div style="font-size: 14px; color: var(--gray); margin-top: 8px;">
            Adicione produtos para começar
          </div>
        </div>
      `;
      
      // Limpar total se carrinho estiver vazio
      if (this.cartTotal) {
        this.cartTotal.innerHTML = '';
      }
      return;
    }
    
    this.cartItems.innerHTML = '';
    
    cart.forEach(item => {
      const subtotal = this.calculateItemSubtotal(item);
      const div = document.createElement('div');
      div.className = 'cart-item slide-up';
      
      div.innerHTML = `
        <div class="cart-item-info">
          <div class="cart-item-name">${this.escapeHtml(item.PRODUTO)}</div>
          <div class="cart-item-price">${this.formatPrice(item.VALOR_VENDA)}</div>
          ${item.quantity > 1 ? `<div class="cart-item-subtotal">Subtotal: ${this.formatPrice(subtotal)}</div>` : ''}
        </div>
        <div class="cart-item-controls">
          <button class="cart-qty-btn minus-cart-btn" data-product="${this.escapeHtml(item.PRODUTO)}">−</button>
          <span class="cart-qty-display">${item.quantity}</span>
          <button class="cart-qty-btn plus-cart-btn" data-product="${this.escapeHtml(item.PRODUTO)}">+</button>
          <button class="cart-remove-btn" data-product="${this.escapeHtml(item.PRODUTO)}">×</button>
        </div>
      `;
      
      // Bind events (important: use event delegation to prevent cart closing)
      const minusBtn = div.querySelector('.minus-cart-btn');
      const plusBtn = div.querySelector('.plus-cart-btn');
      const removeBtn = div.querySelector('.cart-remove-btn');
      
      minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.changeQuantity(item.PRODUTO, -1);
      });
      
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.changeQuantity(item.PRODUTO, 1);
      });
      
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFromCart(item.PRODUTO);
      });
      
      this.cartItems.appendChild(div);
    });
    
    // Adicionar total geral
    this.updateCartTotal();
  }
  
  updateCartTotal() {
    const cartTotal = this.calculateCartTotal();
    const deliveryFee = this.getCurrentDeliveryFee();
    const finalTotal = cartTotal + deliveryFee;
    const totalItems = this.cartModule.getTotalItems();
    
    if (!this.cartTotal) {
      // Criar elemento de total se não existir
      this.cartTotal = document.createElement('div');
      this.cartTotal.id = 'cartTotal';
      this.cartTotal.className = 'cart-total';
      this.cartItems.parentNode.insertBefore(this.cartTotal, this.cartItems.nextSibling);
    }
    
    if (cartTotal > 0) {
      let totalHTML = `
        <div class="cart-total-content">
          <div class="cart-total-items">${totalItems} ${totalItems === 1 ? 'item' : 'itens'}</div>
          <div class="cart-subtotal">Subtotal: ${this.formatPrice(cartTotal)}</div>
      `;
      
      // Adicionar taxa de entrega se houver
      if (deliveryFee > 0) {
        const currentDistance = window.getCurrentDistance ? window.getCurrentDistance() : 0;
        totalHTML += `
          <div class="cart-delivery-fee">Taxa de entrega (${currentDistance.toFixed(1)}km): ${this.formatPrice(deliveryFee)}</div>
          <div class="cart-total-price">Total Final: ${this.formatPrice(finalTotal)}</div>
        `;
      } else {
        totalHTML += `<div class="cart-total-price">Total: ${this.formatPrice(cartTotal)}</div>`;
      }
      
      totalHTML += `
          <div class="cart-total-note">*Valores sujeitos a alteração</div>
        </div>
      `;
      
      this.cartTotal.innerHTML = totalHTML;
      this.cartTotal.style.display = 'block';
    } else {
      this.cartTotal.style.display = 'none';
    }
  }
  
  openCart() {
    this.cartOverlay.classList.add('active');
    this.cartPanel.classList.add('active');
    this.floatingCart.classList.add('hidden');
    document.body.style.overflow = 'hidden';
  }
  
  closeCart() {
    this.cartOverlay.classList.remove('active');
    this.cartPanel.classList.remove('active');
    this.floatingCart.classList.remove('hidden');
    document.body.style.overflow = '';
  }
  
  openModal(imageSrc) {
    this.modalImage.src = imageSrc;
    this.imageModal.classList.add('active');
  }
  
  closeModal() {
    this.imageModal.classList.remove('active');
  }
  
  handleDeliveryOption(option) {
    if (option === 'ENTREGA') {
      this.deliveryForm.classList.remove('hidden');
      // Aguardar um frame para garantir que o elemento esteja visível
      setTimeout(() => {
        this.locationModule.initializeMap();
      }, 100);
    } else {
      this.deliveryForm.classList.add('hidden');
    }
    this.validateForm();
  }
  
  handleAddressType(type) {
    const empresaContainer = document.getElementById('empresaContainer');
    if (type === 'CASA') {
      empresaContainer.classList.add('hidden');
    } else {
      empresaContainer.classList.remove('hidden');
    }
  }
  
  validateForm() {
    let nameValid = true;
    let addressValid = true;
    
    // Validar nome
    if (this.customerNameFromUrl) {
      nameValid = /^[A-Za-zÀ-ÿ ]{12,}$/.test(this.customerNameFromUrl);
    } else {
      const nameInput = this.customerName;
      const nameError = document.getElementById('nameError');
      const name = nameInput.value.trim();
      nameValid = /^[A-Za-zÀ-ÿ ]{12,}$/.test(name);
      
      if (name && !nameValid) {
        nameError.classList.add('active');
        nameInput.classList.add('input-error');
      } else {
        nameError.classList.remove('active');
        nameInput.classList.remove('input-error');
      }
    }
    
    // Validar campos de endereço se entrega for selecionada
    const deliveryOption = document.querySelector('input[name="deliveryOption"]:checked');
    if (deliveryOption && deliveryOption.value === 'ENTREGA') {
      const tipoEndereco = document.querySelector('input[name="tipoEndereco"]:checked');
      const street = document.getElementById('street').value.trim();
      const houseNumber = document.getElementById('houseNumber').value.trim();
      const neighborhood = document.getElementById('neighborhood').value.trim();
      
      // Campos obrigatórios para entrega
      let requiredFields = [
        { element: document.getElementById('street'), valid: street.length > 0 },
        { element: document.getElementById('houseNumber'), valid: houseNumber.length > 0 },
        { element: document.getElementById('neighborhood'), valid: neighborhood.length > 0 }
      ];
      
      // Se tipo de endereço for empresa/condomínio, validar campo adicional
      if (tipoEndereco && (tipoEndereco.value === 'EMPRESA' || tipoEndereco.value === 'CONDOMINIO')) {
        const empresaOuCondominio = document.getElementById('empresaOuCondominio').value.trim();
        requiredFields.push({ 
          element: document.getElementById('empresaOuCondominio'), 
          valid: empresaOuCondominio.length > 0 
        });
      }
      
      // Verificar se tipo de endereço foi selecionado
      const tipoEnderecoValid = !!tipoEndereco;
      
      // Aplicar estilos de erro nos campos
      requiredFields.forEach(field => {
        if (field.element) {
          if (!field.valid) {
            field.element.classList.add('input-error');
          } else {
            field.element.classList.remove('input-error');
          }
        }
      });
      
      // Validar se todos os campos obrigatórios estão preenchidos
      addressValid = tipoEnderecoValid && requiredFields.every(field => field.valid);
      
      // Mostrar mensagem de erro se necessário
      this.showAddressValidationMessage(addressValid, tipoEnderecoValid);
    } else {
      // Limpar erros de endereço se retirada for selecionada
      this.clearAddressErrors();
    }
    
    // Verificar se formulário está completo
    const isFormValid = nameValid && 
                       this.paymentMethod.value !== '' && 
                       !this.cartModule.isEmpty() &&
                       addressValid;
    
    this.whatsappBtn.disabled = !isFormValid;
    
    return isFormValid;
  }
  
  // Função auxiliar para mostrar mensagens de validação de endereço
  showAddressValidationMessage(addressValid, tipoEnderecoValid) {
    // Remover mensagem anterior se existir
    const existingError = document.querySelector('.address-validation-error');
    if (existingError) {
      existingError.remove();
    }
    
    if (!addressValid) {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'address-validation-error form-error active';
      errorMessage.style.cssText = `
        margin-top: 8px;
        padding: 8px 12px;
        background: #f8d7da;
        border: 1px solid #dc3545;
        border-radius: 4px;
        color: #721c24;
        font-size: 14px;
      `;
      
      if (!tipoEnderecoValid) {
        errorMessage.textContent = 'Selecione o tipo de endereço para entrega';
      } else {
        errorMessage.textContent = 'Preencha todos os campos obrigatórios do endereço';
      }
      
      // Inserir mensagem após os campos de endereço
      const deliveryForm = document.getElementById('deliveryForm');
      if (deliveryForm) {
        deliveryForm.appendChild(errorMessage);
      }
    }
  }
  
  // Função auxiliar para limpar erros de endereço
  clearAddressErrors() {
    const addressFields = ['street', 'houseNumber', 'neighborhood', 'empresaOuCondominio'];
    addressFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.classList.remove('input-error');
      }
    });
    
    const existingError = document.querySelector('.address-validation-error');
    if (existingError) {
      existingError.remove();
    }
  }
  
  // Nova função para enviar dados para o webhook
  async sendOrderToWebhook(orderData) {
    try {
      console.log('Enviando pedido para webhook:', orderData);
      
      const response = await fetch('https://webhookn8n.ktecheletronicos.com.br/webhook/pedido_site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Pedido enviado com sucesso:', result);
      return { success: true, data: result };
      
    } catch (error) {
      console.error('Erro ao enviar pedido para webhook:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Função para estruturar os dados do pedido
  buildOrderData() {
    const customerName = this.customerNameFromUrl || this.customerName.value.trim();
    const paymentMethod = this.paymentMethod.value;
    const observations = document.getElementById('observations').value.trim();
    const deliveryOption = document.querySelector('input[name="deliveryOption"]:checked').value;
    
    const cart = this.cartModule.getCart();
    const totalItems = this.cartModule.getTotalItems();
    const cartTotal = this.calculateCartTotal();
    const deliveryFee = this.getCurrentDeliveryFee();
    const finalTotal = cartTotal + deliveryFee;
    
    // Estruturar dados básicos do pedido
    const orderData = {
      timestamp: new Date().toISOString(),
      customer: {
        name: customerName,
        source: this.customerNameFromUrl ? 'URL' : 'FORM'
      },
      payment: {
        method: paymentMethod
      },
      delivery: {
        type: deliveryOption,
        fee: deliveryFee,
        distance: deliveryOption === 'ENTREGA' ? (window.getCurrentDistance ? window.getCurrentDistance() : 0) : null
      },
      cart: {
        items: cart.map(item => ({
          product: item.PRODUTO,
          quantity: item.quantity,
          unitPrice: parseFloat(item.VALOR_VENDA || 0),
          subtotal: this.calculateItemSubtotal(item),
          hasPrice: !!(item.VALOR_VENDA && !isNaN(item.VALOR_VENDA))
        })),
        totalItems: totalItems,
        subtotal: cartTotal,
        deliveryFee: deliveryFee,
        totalValue: finalTotal,
        hasValidTotal: cartTotal > 0
      },
      observations: observations || null,
      search: {
        fromUrl: this.searchFromUrl || null,
        appliedSearch: this.searchInput.value || this.searchFromUrl || null
      }
    };
    
    // Adicionar dados de entrega se for entrega
    if (deliveryOption === 'ENTREGA') {
      const tipoEndereco = document.querySelector('input[name="tipoEndereco"]:checked')?.value || '';
      const empresaOuCondominio = document.getElementById('empresaOuCondominio').value || '';
      const street = document.getElementById('street').value || '';
      const houseNumber = document.getElementById('houseNumber').value || '';
      const neighborhood = document.getElementById('neighborhood').value || '';
      const city = document.getElementById('city').value || '';
      const selectedLocation = this.locationModule.getSelectedLocation();
      
      orderData.delivery.address = {
        type: tipoEndereco,
        company: empresaOuCondominio || null,
        street: street,
        number: houseNumber,
        neighborhood: neighborhood,
        city: city,
        coordinates: selectedLocation ? {
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          mapsUrl: `https://maps.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`
        } : null
      };
    }
    
    return orderData;
  }
  
  handleFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('Form submit triggered');
    console.log('Cart items:', this.cartModule.getCart().length);

    if (!this.validateForm()) {
      console.log('Form validation failed');
      this.showNotification('Por favor, preencha todos os campos obrigatórios', 'danger');
      return;
    }

    if (this.cartModule.isEmpty()) {
      console.log('Cart is empty');
      this.showNotification('Adicione produtos ao carrinho primeiro', 'danger');
      return;
    }

    try {
      // Estruturar dados do pedido
      const orderData = this.buildOrderData();
      
      // Enviar para webhook
      this.sendOrderToWebhook(orderData);
      
      // Continuar com o fluxo original do WhatsApp
      const customerName = this.customerNameFromUrl || this.customerName.value.trim();
      const paymentMethod = this.paymentMethod.value;
      const observations = document.getElementById('observations').value.trim();
      const deliveryOption = document.querySelector('input[name="deliveryOption"]:checked').value;

      let message = '🛒 *NOVO ORÇAMENTO - CATÁLOGO KTECH*\n\n';
      const totalItems = this.cartModule.getTotalItems();
      const cartTotal = this.calculateCartTotal();
      const deliveryFee = this.getCurrentDeliveryFee();
      const finalTotal = cartTotal + deliveryFee;
      
      message += `\n📦 *PRODUTOS* (${totalItems} itens):\n`;

      this.cartModule.getCart().forEach(item => {
        const subtotal = this.calculateItemSubtotal(item);
        message += `• ${item.quantity}x ${item.PRODUTO}`;
        if (item.VALOR_VENDA && !isNaN(item.VALOR_VENDA)) {
          message += ` - ${this.formatPrice(item.VALOR_VENDA)}`;
          if (item.quantity > 1) {
            message += ` = ${this.formatPrice(subtotal)}`;
          }
        }
        message += '\n';
      });

      // Adicionar subtotal e taxa de entrega se houver produtos com preço
      if (cartTotal > 0) {
        message += `\n💰 *SUBTOTAL:* ${this.formatPrice(cartTotal)}`;
        
        if (deliveryFee > 0) {
          const currentDistance = window.getCurrentDistance ? window.getCurrentDistance() : 0;
          message += `\n🚚 *TAXA DE ENTREGA (${currentDistance.toFixed(1)}km):* ${this.formatPrice(deliveryFee)}`;
          message += `\n💸 *TOTAL FINAL:* ${this.formatPrice(finalTotal)}`;
        }
        message += '\n';
      }

      if (observations) {
        message += `\n📝 *Observações:* ${observations}\n\n`;
      }

      if (deliveryOption === 'RETIRADA') {
        message += `\n👤 *Cliente:* ${customerName}\n`;
        message += '📍 *Entrega:* Retirada na loja\n';
      } else {
        const tipoEndereco = document.querySelector('input[name="tipoEndereco"]:checked')?.value || '';
        const empresaOuCondominio = document.getElementById('empresaOuCondominio').value || '';
        const street = document.getElementById('street').value || '';
        const houseNumber = document.getElementById('houseNumber').value || '';
        const neighborhood = document.getElementById('neighborhood').value || '';
        const city = document.getElementById('city').value || '';

        message += `👤 *Cliente:* ${customerName}\n`;
        message += '📍 *Entrega em endereço:*\n';

        if (empresaOuCondominio) {
          message += `${empresaOuCondominio} - `;
        }

        message += `${street}, ${houseNumber} - ${neighborhood}, ${city}\n`;

        const selectedLocation = this.locationModule.getSelectedLocation();
        if (selectedLocation) {
          const currentDistance = window.getCurrentDistance ? window.getCurrentDistance() : 0;
          message += `🗺️ *Localização:* https://maps.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}\n`;
          message += `📏 *Distância:* ${currentDistance.toFixed(1)} km\n`;
        }
      }

      message += `💳 *Pagamento:* ${paymentMethod}\n`;

      message += '\n\n⚠️ *Aguardando orçamento e confirmação dos valores finais.*';

      const whatsappUrl = `https://api.whatsapp.com/send?phone=558688519865&text=${encodeURIComponent(message)}`;

      console.log('Opening WhatsApp with URL:', whatsappUrl);

      this.showNotification('Pedido enviado! Redirecionando para o WhatsApp...', 'success');

      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 500);

    } catch (error) {
      console.error('Error in form submit:', error);
      this.showNotification('Erro ao processar pedido. Tente novamente.', 'danger');
    }
  }
  
  showNotification(message, type = 'success') {
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
  
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Initialize the store when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new KTechStore();
});