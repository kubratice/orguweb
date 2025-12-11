// =======================================================
// ADMIN PANELİ ANA JS DOSYASI
// =======================================================

const token = localStorage.getItem('admin_token');

document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();

    // Eğer ana dizindeysek (index.html yazmasa bile) veya index.html ise paneli çalıştır
    // Eğer login.html ise giriş sayfasını çalıştır
    if (currentPage === 'login.html') {
        setupLoginForm();
    } else {
        checkAuth();
        setupDashboard();
    }
});

// --- GÜVENLİK ---
function checkAuth() {
    if (!token) {
        window.location.href = 'login.html';
    }
}

// --- GİRİŞ SAYFASI MANTIĞI (login.html) ---
function setupLoginForm() {
    const loginForm = document.getElementById('admin-login-form');
    const errorMessage = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessage.textContent = '';
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();
                if (response.ok) {
                    localStorage.setItem('admin_token', result.token);
                    window.location.href = 'index.html';
                } else {
                    errorMessage.textContent = result.message;
                }
            } catch (error) {
                errorMessage.textContent = 'Sunucuya bağlanırken bir hata oluştu.';
            }
        });
    }
}

// --- ANA PANEL MANTIĞI (index.html) ---
function setupDashboard() {
    // Çıkış yap butonu
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('admin_token');
            window.location.href = 'login.html';
        });
    }

    fetchProducts();
    setupAddProductForm();
    setupProductTableEvents();
    setupEditModalEvents();
}

// --- ÜRÜN İŞLEMLERİ (CRUD) ---

// 1. Ürünleri Çek ve Listele (Read)
async function fetchProducts() {
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) return;

    try {
        const response = await fetch('http://localhost:3000/api/admin/products', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('admin_token');
            window.location.href = 'login.html';
            return;
        }

        const products = await response.json();
        tableBody.innerHTML = '';
        products.forEach(product => {
            const row = `
                <tr data-id="${product.id}">
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>₺${product.price}</td>
                    <td>${product.color}</td>
                    <td>
                        <button class="admin-btn-sm btn-edit">Düzenle</button>
                        <button class="admin-btn-sm btn-delete">Sil</button>
                    </td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });

    } catch (error) {
        console.error('Ürünler çekilirken hata:', error);
    }
}

// 2. Yeni Ürün Ekle (Create)
function setupAddProductForm() {
    const addForm = document.getElementById('add-product-form');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const product = {
                name: document.getElementById('name').value,
                color: document.getElementById('color').value,
                price: parseFloat(document.getElementById('price').value),
                image: document.getElementById('image').value
            };

            try {
                const response = await fetch('http://localhost:3000/api/admin/products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(product)
                });

                if (response.ok) {
                    alert('Ürün başarıyla eklendi!');
                    addForm.reset(); // Formu temizle
                    fetchProducts(); // Tabloyu yenile
                } else {
                    const result = await response.json();
                    alert(`Hata: ${result.message}`);
                }
            } catch (error) {
                alert('Sunucu hatası: Ürün eklenemedi.');
            }
        });
    }
}

// 3. Silme ve Düzenleme Butonları için Olay Dinleyicisi
function setupProductTableEvents() {
    const tableBody = document.getElementById('products-table-body');
    if (tableBody) {
        tableBody.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            if (!row) return;
            const productId = row.dataset.id;

            // SİLME İŞLEMİ
            if (e.target.classList.contains('btn-delete')) {
                if (confirm(`Emin misiniz? ${productId} ID'li ürünü silmek üzeresiniz.`)) {
                    try {
                        const response = await fetch(`http://localhost:3000/api/admin/products/${productId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (response.ok) {
                            alert('Ürün başarıyla silindi.');
                            fetchProducts(); // Tabloyu yenile
                        } else {
                            const result = await response.json();
                            alert(`Hata: ${result.message}`);
                        }
                    } catch (error) {
                        alert('Sunucu hatası: Ürün silinemedi.');
                    }
                }
            }
            
            // DÜZENLEME İŞLEMİ (Modal'ı açar)
            if (e.target.classList.contains('btn-edit')) {
                openEditModal(productId);
            }
        });
    }
}

// 4. Düzenleme Modal'ını Açma ve Doldurma
async function openEditModal(productId) {
    const modal = document.getElementById('edit-modal');
    try {
        const response = await fetch(`http://localhost:3000/api/admin/products/${productId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Ürün bilgileri çekilemedi.');
        
        const product = await response.json();
        
        // Formu doldur
        document.getElementById('edit-product-id').value = product.id;
        document.getElementById('edit-name').value = product.name;
        document.getElementById('edit-color').value = product.color;
        document.getElementById('edit-price').value = product.price;
        document.getElementById('edit-image').value = product.image;
        
        // Modalı göster
        modal.style.display = 'flex';
    } catch (error) {
        alert(error.message);
    }
}

// 5. Düzenleme Modal'ını Kapatma ve Kaydetme Olayları
function setupEditModalEvents() {
    const modal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-product-form');
    const cancelBtn = document.getElementById('cancel-edit');
    
    if (!modal || !editForm || !cancelBtn) return;

    // "İptal" butonuna basınca modalı kapat
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // "Kaydet" (form submit) olayı
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = document.getElementById('edit-product-id').value;
        
        const updatedProduct = {
            name: document.getElementById('edit-name').value,
            color: document.getElementById('edit-color').value,
            price: parseFloat(document.getElementById('edit-price').value),
            image: document.getElementById('edit-image').value
        };

        try {
            const response = await fetch(`http://localhost:3000/api/admin/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedProduct)
            });
            
            if (response.ok) {
                alert('Ürün başarıyla güncellendi.');
                modal.style.display = 'none';
                fetchProducts(); // Tabloyu yenile
            } else {
                const result = await response.json();
                alert(`Hata: ${result.message}`);
            }
        } catch (error) {
            alert('Sunucu hatası: Ürün güncellenemedi.');
        }
    });
}