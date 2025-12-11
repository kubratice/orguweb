// =======================================================
// TÜM SAYFALARDA ÇALIŞAN GENEL FONKSİYONLAR
// =======================================================

// --- Header'ı Scroll Ederken Sabitleme ---
window.addEventListener('scroll', function() {
    const header = document.getElementById('main-header');
    if(header) {
        if (window.scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
});

// --- Sayfa Her Yüklendiğinde Gerekli Fonksiyonları Çalıştır ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();

    // Sadece sepet sayfasındaysak sepet içeriğini çiz
    const cartItemsContainerOnCartPage = document.querySelector('.cart-layout .cart-items');
    if (cartItemsContainerOnCartPage) {
        renderCartItems();
    }
});


// =======================================================
// BİLDİRİM (NOTIFICATION) SİSTEMİ
// =======================================================
function showNotification(message, type = 'success') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }
    const finalContainer = document.getElementById('notification-container');

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-times-circle';
    notification.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    finalContainer.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => notification.remove());
    }, 3000);
}


// ALIŞVERİŞ SEPETİ YÖNETİM SİSTEMİ (localStorage)

function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartBadge = document.querySelector('.cart-badge');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (cartBadge) {
        cartBadge.textContent = totalItems;
        if (totalItems > 0) {
            cartBadge.style.display = 'flex';
        } else {
            cartBadge.style.display = 'none';
        }
    }
}

function addToCart(product) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingProductIndex = cart.findIndex(item => item.id === product.id);

    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity += product.quantity;
    } else {
        cart.push(product);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
}


// SAYFAYA ÖZEL KOD BLOKLARI


// --- ÜRÜN DETAY SAYFASI KODLARI (`urun-detay.html`) ---
const mainProductImage = document.getElementById('mainProductImage');
if (mainProductImage) {
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            mainProductImage.src = this.src.replace('100x120', '600x700');
        });
    });

    const decreaseBtn = document.getElementById('decrease-qty');
    const increaseBtn = document.getElementById('increase-qty');
    const quantityInput = document.getElementById('quantity');

    if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
            quantityInput.value = parseInt(quantityInput.value) + 1;
        });
    }

    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });
    }
    
    const addToCartButtonOnDetail = document.querySelector('.btn-add-to-cart');
    if(addToCartButtonOnDetail) {
        addToCartButtonOnDetail.addEventListener('click', function(event) {
            event.preventDefault();
            const product = {
                id: document.querySelector('.product-sku') ? document.querySelector('.product-sku').textContent.trim() : 'P-001' ,
                name: document.querySelector('.product-title').textContent,
                price: parseFloat(document.querySelector('.product-price .new-price').textContent.replace('₺', '')),
                quantity: parseInt(quantityInput.value),
                image: document.getElementById('mainProductImage').src.replace('600x700', '100x120') // Sepet için küçük resim
            };
            addToCart(product);
            showNotification(`${product.quantity} adet ürün sepete eklendi!`);
        });
    }
}

// --- ÜRÜN LİSTELEME SAYFASI KODLARI (`urunler.html`) ---
const filtersContainer = document.querySelector('.filters');
if (filtersContainer) {
    const productGrid = document.querySelector('.product-grid');
    const colorCheckboxes = document.querySelectorAll('input[name="color"]');
    const priceSlider = document.querySelector('.price-slider');
    const priceDisplay = document.querySelector('.price-range-display');
    const sortSelect = document.getElementById('sort');
    const clearFiltersBtn = document.querySelector('.filters .btn');
    let allProducts = [];

    fetch('http://localhost:3000/api/products')
        .then(response => response.json())
        .then(products => {
            allProducts = products;
            updateProductsDisplay();
        })
        .catch(error => {
            console.error('Ürünler çekilirken hata oluştu:', error);
            if(productGrid) productGrid.innerHTML = '<p>Ürünler yüklenemedi. Lütfen sunucunun çalıştığından emin olun.</p>';
        });

    function updateProductsDisplay() {
        const selectedColors = Array.from(colorCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        const maxPrice = parseInt(priceSlider.value);
        let visibleProducts = allProducts.filter(product => {
            const colorMatch = selectedColors.length === 0 || selectedColors.includes(product.color);
            const priceMatch = product.price <= maxPrice;
            return colorMatch && priceMatch;
        });
        const sortValue = sortSelect.value;
        if (sortValue === 'price-asc') {
            visibleProducts.sort((a, b) => a.price - b.price);
        } else if (sortValue === 'price-desc') {
            visibleProducts.sort((a, b) => b.price - a.price);
        }
        renderProducts(visibleProducts);
    }

    function renderProducts(products) {
        if(!productGrid) return;
        productGrid.innerHTML = '';
        if (products.length === 0) {
            productGrid.innerHTML = '<p>Bu kriterlere uygun ürün bulunamadı.</p>';
            return;
        }
        products.forEach(product => {
            const productCardHTML = `
                <div class="product-card" data-color="${product.color}" data-price="${product.price}">
                    <div class="product-image-container"><img src="${product.image}" alt="${product.name}"><a href="urun-detay.html" class="view-product-btn">İncele</a></div>
                    <div class="product-card-details"><h3>${product.name}</h3><div class="product-card-price"><span class="new-price">₺${product.price}</span></div><div class="product-card-rating"><i class="fas fa-star"></i> 4.7 (31)</div></div>
                </div>
            `;
            productGrid.insertAdjacentHTML('beforeend', productCardHTML);
        });
    }

    function clearFilters() {
        colorCheckboxes.forEach(cb => cb.checked = false);
        priceSlider.value = 1000;
        priceDisplay.textContent = `₺0 - ₺1000`;
        sortSelect.value = 'default';
        updateProductsDisplay();
    }

    colorCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateProductsDisplay));
    sortSelect.addEventListener('change', updateProductsDisplay);
    priceSlider.addEventListener('input', () => {
        priceDisplay.textContent = `₺0 - ₺${priceSlider.value}`;
        updateProductsDisplay();
    });
    if(clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
}

// --- ALIŞVERİŞ SEPETİ SAYFASI KODLARI (`sepet.html`) ---
function renderCartItems() {
    const cartItemsContainer = document.querySelector('.cart-layout .cart-items');
    if (!cartItemsContainer) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const orderSummary = document.querySelector('.order-summary');

    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<h3>Sepetinizde henüz ürün bulunmamaktadır.</h3>';
        if(orderSummary) orderSummary.style.display = 'none';
    } else {
        if(orderSummary) orderSummary.style.display = 'block';
        cart.forEach(item => {
            const cartItemHTML = `
                <div class="cart-item" data-id="${item.id}">
                    <img src="${item.image || 'https://placehold.co/100x120/e8dcca/4a4a4a'}" alt="${item.name}">
                    <div class="item-details"><h3>${item.name}</h3><span class="item-price">₺${item.price.toFixed(2)}</span></div>
                    <div class="item-quantity"><div class="quantity-selector"><button class="quantity-btn">-</button><input type="number" value="${item.quantity}" min="1"><button class="quantity-btn">+</button></div></div>
                    <div class="item-total-price">₺${(item.price * item.quantity).toFixed(2)}</div>
                    <button class="remove-item-btn">&times;</button>
                </div>
            `;
            cartItemsContainer.insertAdjacentHTML('beforeend', cartItemHTML);
        });
    }
    updateOrderSummary();
}

function updateOrderSummary() {
    const cartLayout = document.querySelector('.cart-layout');
    if (!cartLayout) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const summarySubtotal = document.querySelector('.order-summary .summary-row span:last-child');
    const summaryTotal = document.querySelector('.order-summary .summary-total span:last-child');
    const summaryItemCount = document.querySelector('.order-summary .summary-row span:first-child');
    const pageItemCount = document.querySelector('.cart-item-count');

    if(summarySubtotal) summarySubtotal.textContent = `₺${subtotal.toFixed(2)}`;
    if(summaryTotal) summaryTotal.textContent = `₺${subtotal.toFixed(2)}`;
    if(summaryItemCount) summaryItemCount.textContent = `Ara Toplam (${totalItems} ürün)`;
    if(pageItemCount) pageItemCount.textContent = `Sepetinizde ${cart.length} çeşit ürün bulunmaktadır.`;
}

const cartItemsContainer = document.querySelector('.cart-layout .cart-items');
if (cartItemsContainer) {
    cartItemsContainer.addEventListener('click', function(event) {
        const target = event.target;
        const cartItemElement = target.closest('.cart-item');
        if (!cartItemElement) return;

        const productId = cartItemElement.dataset.id;
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const productIndex = cart.findIndex(item => item.id == productId);

        if (productIndex > -1) {
            if (target.matches('.quantity-btn') && target.textContent === '+') {
                cart[productIndex].quantity++;
            }
            if (target.matches('.quantity-btn') && target.textContent === '-') {
                if (cart[productIndex].quantity > 1) {
                    cart[productIndex].quantity--;
                }
            }
            if (target.matches('.remove-item-btn')) {
                cart.splice(productIndex, 1);
            }
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCartItems();
        updateCartBadge();
    });
}

// --- KAYIT FORMU (REGISTER) GÖNDERME İŞLEMİ (`kayit.html`) ---
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const fullname = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            showNotification('Şifreler eşleşmiyor!', 'error');
            return;
        }

        const userData = { fullname: fullname, email: email, password: password };

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const result = await response.json();
            if (response.ok) {
                showNotification(result.message, 'success');
                setTimeout(() => { window.location.href = 'giris.html'; }, 1000);
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            showNotification('Bir ağ hatası oluştu. Lütfen tekrar deneyin.', 'error');
        }
    });
}

// GİRİŞ FORMU (LOGIN) GÖNDERME İŞLEMİ

const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const userData = { email, password };

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                showNotification(result.message, 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                showNotification(result.message, 'error');
            }

        } catch (error) {
            showNotification('Bir ağ hatası oluştu. Lütfen tekrar deneyin.', 'error');
        }
    });
}


// --- ÖDEME SAYFASI MANTIĞI (`odeme.html`) ---
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    renderCheckoutSummary();

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        if (cart.length === 0) {
            showNotification('Sepetiniz boş!', 'error');
            return;
        }

        const customer = {
            fullname: document.getElementById('firstname').value + ' ' + document.getElementById('lastname').value,
            address: document.getElementById('address').value + ', ' + document.getElementById('city').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value
        };

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const orderData = {
            customer: customer,
            items: cart,
            total: total
        };

        try {
            const response = await fetch('http://localhost:3000/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                const result = await response.json();
                localStorage.removeItem('cart'); 
                updateCartBadge();
                alert('Siparişiniz başarıyla alındı! Sipariş No: #' + result.orderId);
                window.location.href = 'index.html'; 
            } else {
                const result = await response.json();
                showNotification('Hata: ' + result.message, 'error');
            }
        } catch (error) {
            showNotification('Sunucu hatası: Sipariş oluşturulamadı.', 'error');
        }
    });
}

function renderCheckoutSummary() {
    const summaryItemsContainer = document.getElementById('checkout-summary-items');
    const subtotalElement = document.getElementById('checkout-subtotal');
    const totalElement = document.getElementById('checkout-total');

    if (!summaryItemsContainer) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    let total = 0;

    summaryItemsContainer.innerHTML = '';
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const html = `
            <div class="summary-item">
                <img src="${item.image || 'https://placehold.co/80x100/e8dcca/4a4a4a'}" alt="${item.name}">
                <div class="summary-item-details">
                    <span>${item.name} (x${item.quantity})</span>
                    <span>₺${itemTotal.toFixed(2)}</span>
                </div>
            </div>
        `;
        summaryItemsContainer.insertAdjacentHTML('beforeend', html);
    });

    if (subtotalElement) subtotalElement.textContent = `₺${total.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `₺${total.toFixed(2)}`;
}