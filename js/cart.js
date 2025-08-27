// cart.js - Módulo do Carrinho
class CartModule {
  constructor() {
    this.cart = [];
  }
  
  saveCartToCache() {
    const cartData = {
      cart: this.cart,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem('ktech_cart', JSON.stringify(cartData));
    } catch (error) {
      console.error('Erro ao salvar carrinho no cache:', error);
    }
  }
  
  loadCartFromCache() {
    try {
      const cartData = localStorage.getItem('ktech_cart');
      if (cartData) {
        const parsed = JSON.parse(cartData);
        const now = Date.now();
        const thirtyHours = 30 * 60 * 60 * 1000; // 30 horas em millisegundos
        
        if (now - parsed.timestamp < thirtyHours) {
          this.cart = parsed.cart || [];
          console.log('Carrinho carregado do cache:', this.cart.length, 'itens');
        } else {
          // Cache expirou, limpar
          localStorage.removeItem('ktech_cart');
          console.log('Cache do carrinho expirou, limpando...');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar carrinho do cache:', error);
      localStorage.removeItem('ktech_cart');
    }
  }
  
  clearCartCache() {
    try {
      localStorage.removeItem('ktech_cart');
    } catch (error) {
      console.error('Erro ao limpar cache do carrinho:', error);
    }
  }
  
  toggleCartItem(productName, products) {
    const existingIndex = this.cart.findIndex(item => item.PRODUTO === productName);
    
    if (existingIndex >= 0) {
      this.cart.splice(existingIndex, 1);
      return { action: 'removed', product: productName };
    } else {
      const product = products.find(p => p.PRODUTO === productName);
      if (product) {
        this.cart.unshift({...product, quantity: 1});
        return { action: 'added', product: productName };
      }
    }
    this.saveCartToCache();
    return null;
  }
  
  changeQuantity(productName, delta) {
    const item = this.cart.find(item => item.PRODUTO === productName);
    if (item) {
      item.quantity = Math.max(1, item.quantity + delta);
      this.saveCartToCache();
      return true;
    }
    return false;
  }
  
  removeFromCart(productName) {
    this.cart = this.cart.filter(item => item.PRODUTO !== productName);
    this.saveCartToCache();
    return true;
  }
  
  getCart() {
    return this.cart;
  }
  
  getTotalItems() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }
  
  isEmpty() {
    return this.cart.length === 0;
  }
}

// Export para uso no módulo principal
window.CartModule = CartModule;