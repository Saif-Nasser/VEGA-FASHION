
let products = [];
let productsLoaded = false;

window.productsLoadedEvent = new CustomEvent('productsLoaded');

window.scriptInitialized = false;

let cart = [];
let cartCount = 0;
let cartTotal = 0;

const cartIcon = document.getElementById('cartIcon');
const cartIconDesktop = document.getElementById('cartIconDesktop');
const cartModal = document.getElementById('cartModal');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const productsGrid = document.querySelector('.products-grid');
const newProductsGrid = document.querySelector('.new-products-grid');
const cartCountElements = document.querySelectorAll('.cart-count');
const totalPriceElement = document.querySelector('.total-price');

// Ensure normalizeImageUrl is available globally to handle legacy Windows/local paths
if (typeof window.normalizeImageUrl !== 'function') {
    window.normalizeImageUrl = function (url) {
        const placeholder = 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
        if (!url) return placeholder;
        if (typeof url === 'string' && (url.indexOf('\\') !== -1 || /^[A-Za-z]:\\/.test(url) || url.startsWith('file://'))) {
            try {
                const normalized = url.replace(/\\/g, '/');
                const parts = normalized.split('/');
                const filename = parts[parts.length - 1];
                return `images/${filename}`;
            } catch (e) {
                return placeholder;
            }
        }
        if (/^https?:\/\//i.test(url)) return url;
        return url;
    };
}




async function loadProductsFromFirestore() {
    try {
        if (typeof db === 'undefined') {
            console.warn("Firestore not available - db is undefined");
            return false;
        }

        const snapshot = await db.collection('products').get();

        if (snapshot.empty) {
            return false;
        }

        products = [];
        snapshot.forEach(doc => {
            const product = doc.data();
            product.id = doc.id;
            products.push(product);
        });

        productsLoaded = true;
        return true;

    } catch (error) {
        console.error("Error loading products from Firestore:", error);
        return false;
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id || product.name.replace(/\s+/g, '-').toLowerCase();

    const newBadge = product.new ? '<span class="new-badge">New</span>' : '';
    const safeName = product.name || 'Unnamed Product';
    const safeCategory = product.category || 'Uncategorized';
    const safePrice = product.price ? product.price.toFixed(2) : '0.00';
    const safeImage = (typeof normalizeImageUrl === 'function') ? normalizeImageUrl(product.image) : (product.image || 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80');
    const stock = product.stock !== undefined ? product.stock : 1;
    const isOutOfStock = stock <= 0;

    const soldOutBadge = isOutOfStock ? '<span class="sold-out-badge">Sold Out</span>' : '';

    const addToCartButtonHTML = isOutOfStock
        ? '<button class="add-to-cart" data-id="${product.id}" disabled style="opacity: 0.5; cursor: not-allowed;">Out of Stock</button>'
        : '<button class="add-to-cart" data-id="${product.id}">Add to Cart</button>';

    card.innerHTML = `
        <div class="product-image-container">
            <img src="${safeImage}" alt="${safeName}" class="product-img" loading="lazy" decoding="async"
                 onerror="this.src='https://images.unsplash.com/photo-1539008835657-9e8e9680c956?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'">
            ${newBadge}
            ${soldOutBadge}
            <button class="wishlist-btn" data-id="${product.id}" title="Add to Wishlist">
                <i class="fas fa-heart"></i>
            </button>
        </div>
        <div class="product-info ${isOutOfStock ? 'out-of-stock' : ''}">
            <h3 class="product-title">${safeName}</h3>
            <p class="product-category">${safeCategory}</p>
            <p class="product-price">${safePrice} EGP</p>
            ${addToCartButtonHTML}
        </div>
    `;

    const addToCartBtn = card.querySelector('.add-to-cart');
    if (!isOutOfStock && addToCartBtn) {
        addToCartBtn.addEventListener('click', function () {

            this.classList.add('ripple');

            this.classList.add('clicked');

            addToCart(product);

            const originalText = this.textContent;
            this.textContent = '✓ Added to Cart';
            this.classList.add('success');

            setTimeout(() => {
                this.classList.remove('ripple');
            }, 600);

            setTimeout(() => {
                this.textContent = originalText;
                this.classList.remove('clicked', 'success');
            }, 2000);
        });
    }

    const wishlistBtn = card.querySelector('.wishlist-btn');
    if (wishlistBtn) {
        wishlistBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            const productId = this.dataset.id;

            this.classList.add('heart-beat');

            try {

                if (this.classList.contains('in-wishlist')) {
                    if (typeof window.removeFromWishlist === 'function') {
                        await window.removeFromWishlist(productId);
                    }
                } else {
                    if (typeof window.addToWishlist === 'function') {
                        await window.addToWishlist(productId);
                    }
                }
            } catch (err) {
                console.error('Wishlist toggle error:', err);
                showTempMessage && showTempMessage('Error updating wishlist');
            } finally {

                setTimeout(() => {
                    this.classList.remove('heart-beat');
                }, 600);
            }
        });
    }

    return card;
}

function renderProducts(container, filterFn) {
    if (!container) return;

    container.innerHTML = '';

    const filteredProducts = products.filter(filterFn);

    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-box-open" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No Products Available</h3>
                <p>Check back soon for new arrivals</p>
            </div>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        const productCard = createProductCard(product);
        container.appendChild(productCard);
    });

    console.log(`✅ Rendered ${filteredProducts.length} products to ${container.id || container.className}`);
}

async function renderCollections(container) {
    if (!container) return;
    container.innerHTML = '';

    if (typeof db !== 'undefined') {
        try {
            const colSnap = await db.collection('collections').orderBy('createdAt', 'desc').get();
            if (!colSnap.empty) {
                colSnap.forEach(doc => {
                    const c = doc.data();
                    const id = doc.id;
                    const count = Array.isArray(c.products) ? c.products.length : 0;
                    const image = (typeof normalizeImageUrl === 'function') ? normalizeImageUrl(c.image || (c.products && c.products.length ? (products.find(p => p.id === c.products[0]) || {}).image : null) || ('https://via.placeholder.com/800x600?text=' + encodeURIComponent(c.name || 'Collection'))) : (c.image || (c.products && c.products.length ? (products.find(p => p.id === c.products[0]) || {}).image : null) || ('https://via.placeholder.com/800x600?text=' + encodeURIComponent(c.name || 'Collection')));

                    const card = document.createElement('div');
                    card.className = 'collection-card';
                    card.dataset.collectionId = id;
                    card.dataset.collectionName = c.name || '';
                    card.innerHTML = `
                        <div class="collection-image">
                            <img src="${image}" alt="${c.name || 'Collection'}" loading="lazy" decoding="async" onerror="this.src='https://via.placeholder.com/800x600'">
                        </div>
                        <div class="collection-info">
                            <h3>${c.name || 'Collection'}</h3>
                            <p>${c.description || 'Explore this collection'}</p>
                            <span class="collection-count">${count} item${count !== 1 ? 's' : ''}</span>
                        </div>
                    `;

                    card.addEventListener('click', async (e) => {
                        e.preventDefault();
                        try {
                            const doc = await db.collection('collections').doc(id).get();
                            if (!doc.exists) {
                                showTempMessage('Collection not found');
                                return;
                            }
                            const data = doc.data();
                            const productIds = Array.isArray(data.products) ? data.products : [];

                            const items = [];
                            for (const pid of productIds) {
                                try {
                                    const pdoc = await db.collection('products').doc(pid).get();
                                    if (pdoc.exists) {
                                        const p = pdoc.data(); p.id = pdoc.id; items.push(p);
                                    }
                                } catch (e) {
                                    console.warn('Error loading product', pid, e);
                                }
                            }
                            showCollectionModal(items, data.name || 'Collection');
                        } catch (err) {
                            console.error('Error opening collection:', err);
                            showTempMessage('Error loading collection');
                        }
                    });

                    container.appendChild(card);
                });

                console.log(`✅ Rendered ${colSnap.size} admin-created collections to ${container.id}`);
                return;
            }
        } catch (err) {
            console.warn('Could not load collections collection from Firestore:', err);

        }
    }

    if (!products || products.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--dark-gray);">No collections available</div>`;
        return;
    }

    const groups = {};
    products.forEach(p => {
        const key = p.category ? p.category.trim() : 'Uncategorized';
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    });

    Object.keys(groups).forEach(category => {
        const items = groups[category];
        const sample = items.find(i => i.image) || items[0];
        const image = (typeof normalizeImageUrl === 'function') ? normalizeImageUrl((sample && sample.image) ? sample.image : 'https://via.placeholder.com/800x600?text=' + encodeURIComponent(category)) : ((sample && sample.image) ? sample.image : 'https://via.placeholder.com/800x600?text=' + encodeURIComponent(category));
        const count = items.length;
        const card = document.createElement('div');
        card.className = 'collection-card';
        card.dataset.category = category;
        card.innerHTML = `
            <div class="collection-image">
                <img src="${image}" alt="${category}" onerror="this.src='https://via.placeholder.com/800x600'">
            </div>
            <div class="collection-info">
                <h3>${category}</h3>
                <p>Explore ${category} collection</p>
                <span class="collection-count">${count} item${count !== 1 ? 's' : ''}</span>
            </div>
        `;

        card.addEventListener('click', (e) => {
            e.preventDefault();

            const catItems = products.filter(p => (p.category || '').toString().trim() === category);
            showCollectionModal(catItems, category);
        });

        container.appendChild(card);
    });

    console.log(`✅ Rendered ${Object.keys(groups).length} collections to ${container.id}`);
}

function showCollectionModal(items, title) {

    let backdrop = document.getElementById('collectionModalBackdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'collectionModalBackdrop';
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:20000;padding:20px;';
        const modal = document.createElement('div');
        modal.id = 'collectionModal';
        modal.style.cssText = 'width:100%;max-width:900px;background:#fff;border-radius:12px;overflow:auto;max-height:90vh;padding:18px;position:relative;';
        modal.innerHTML = `
                <button id="closeCollectionModal" style="position:absolute;right:12px;top:12px;border:none;background:transparent;font-size:20px;cursor:pointer;"><i class="fas fa-times"></i></button>
                <h3 style="margin-top:0;">${title}</h3>
                <div id="collectionModalBody" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:12px;"></div>
            `;
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        document.getElementById('closeCollectionModal').addEventListener('click', closeCollectionModal);
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeCollectionModal(); });
    }

    const body = document.getElementById('collectionModalBody');
    const modalTitle = backdrop.querySelector('h3');
    if (modalTitle) modalTitle.textContent = title;
    body.innerHTML = '';

    if (!items || items.length === 0) {
        body.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--dark-gray);">No items in this collection</div>`;
    } else {
        items.forEach(p => {
            const card = document.createElement('div');
            card.style.cssText = 'border:1px solid #eee;border-radius:8px;overflow:hidden;background:#fff;display:flex;flex-direction:column;';
            const colImage = (typeof normalizeImageUrl === 'function') ? normalizeImageUrl(p.image) : (p.image || 'https://via.placeholder.com/800x600');
            card.innerHTML = `
                    <img src="${colImage}" style="width:100%;height:160px;object-fit:cover;" loading="lazy" decoding="async" onerror="this.src='https://via.placeholder.com/800x600'">
                    <div style="padding:8px;flex:1;display:flex;flex-direction:column;gap:6px;">
                        <div style="font-weight:700;font-size:13px;">${p.name || 'Product'}</div>
                        <div style="color:var(--dark-gray);font-size:12px;">${p.price ? p.price.toFixed(2) + ' EGP' : 'Price N/A'}</div>
                    </div>
                `;

            body.appendChild(card);
        });
    }

    backdrop.style.display = 'flex';
}

function closeCollectionModal() {
    const backdrop = document.getElementById('collectionModalBackdrop');
    if (backdrop) backdrop.style.display = 'none';
}

window.addToCart = addToCart;

function toggleCart() {
    if (cartModal) {
        cartModal.classList.toggle('active');
    }
}

function addToCart(product) {

    const hasLocalUser = !!localStorage.getItem('vegaUser');
    const hasGuestFlag = localStorage.getItem('vegaGuest') === 'true';
    const firebaseUserAvailable = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
    const isLoggedIn = hasLocalUser || !!firebaseUserAvailable;

    if (!isLoggedIn) {

        window.location.href = 'login.html?redirect=cart';
        return;
    }

    if (product.selectedSize) {
        addProductToCart(product, product.selectedSize);
    } else if (product.sizes && product.sizes.length > 0) {
        showSizeSelector(product);
    } else {
        addProductToCart(product, null);
    }
}

function showSizeSelector(product) {

    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 15px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease;
    `;

    const sizes = product.sizes || [];
    const sizeButtons = sizes.map(size => {

        const isAvailable = product.stock > 0;
        const blurStyle = !isAvailable ? 'opacity: 0.5; filter: blur(2px); cursor: not-allowed;' : 'cursor: pointer;';

        return `
            <button onclick="${isAvailable ? `selectSize('${product.id}', '${size}')` : ''}" style="
                padding: 12px 20px;
                margin: 8px;
                border: 2px solid #333;
                background: white;
                color: #333;
                border-radius: 8px;
                font-weight: 600;
                transition: all 0.3s;
                min-width: 60px;
                ${blurStyle}
            " ${!isAvailable ? 'disabled' : ''} onmouseover="${isAvailable ? "this.style.background='#333'; this.style.color='white';" : ''}" onmouseout="${isAvailable ? "this.style.background='white'; this.style.color='#333';" : ''}" title="${!isAvailable ? 'Out of Stock' : ''}">
                ${size}
            </button>
        `;
    }).join('');

    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #333;">Select Size</h3>
            <button onclick="this.closest('div').closest('div').parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
            ">&times;</button>
        </div>
        <p style="color: #666; margin-bottom: 25px; font-size: 16px;">${product.name}</p>
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 25px;">
            ${sizeButtons}
        </div>
        <button onclick="this.closest('div').parentElement.remove()" style="
            width: 100%;
            padding: 12px;
            background: #eee;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            color: #333;
            font-weight: 600;
        ">Cancel</button>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    window.selectedProduct = product;
}

function selectSize(productId, size) {
    const product = window.selectedProduct;
    if (product) {
        addProductToCart(product, size);

        document.querySelector('[style*="background: rgba(0, 0, 0, 0.5)"]').remove();
    }
}

function addProductToCart(product, size) {

    const stock = product.stock !== undefined ? product.stock : 999;

    const cartKey = size ? `${product.id}-${size}` : product.id;
    const existingItem = cart.find(item => {
        if (size) {
            return item.id === product.id && item.size === size;
        }
        return item.id === product.id && !item.size;
    });

    const currentQuantity = existingItem ? existingItem.quantity : 0;

    if (currentQuantity >= stock) {
        showTempMessage(`❌ Cannot add more. Only ${stock} in stock.`);
        return;
    }

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            size: size || undefined,
            quantity: 1
        });
    }

    saveCart();
    updateCart();
    renderCartItems();
    showTempMessage(`✓ Added to cart${size ? ` (Size: ${size})` : ''}`);
}

function updateCart() {
    cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    cartCountElements.forEach(el => {
        el.textContent = cartCount;
    });

    if (totalPriceElement) {
        totalPriceElement.textContent = `${cartTotal.toFixed(2)} EGP`;
    }

    const checkoutBtns = document.querySelectorAll('.checkout-btn');
    checkoutBtns.forEach(btn => {
        if (cart.length === 0) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
    });
}

function renderCartItems() {
    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Your cart is empty</p>';
        return;
    }

    cartItems.innerHTML = cart.map(item => {
        const maxStock = (typeof item.stock !== 'undefined') ? item.stock : Infinity;
        const plusDisabled = (item.quantity >= maxStock) ? 'disabled' : '';
        return `
        <div class="cart-item">
            <img src="${normalizeImageUrl(item.image)}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80'">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                ${item.size ? `<p style="color: #999; font-size: 14px; margin: 5px 0;">Size: <strong>${item.size}</strong></p>` : ''}
                <p>${item.price.toFixed(2)} EGP</p>
                
            </div>
            <div class="cart-item-quantity">
                <button onclick="updateQuantity('${item.id}', '${item.size || ''}', -1)">-</button>
                <span>${item.quantity}</span>
                <button ${plusDisabled} onclick="updateQuantity('${item.id}', '${item.size || ''}', 1)">+</button>
            </div>
            <button class="remove-item" onclick="removeFromCart('${item.id}', '${item.size || ''}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    }).join('');
}

function updateQuantity(productId, size, change) {
    const item = cart.find(i => {
        if (size) {
            return i.id === productId && i.size === size;
        }
        return i.id === productId && !i.size;
    });
    if (item) {
        // Respect stock when increasing
        const stock = (typeof item.stock !== 'undefined') ? item.stock : Infinity;
        if (change > 0) {
            if (item.quantity + change > stock) {
                showTempMessage && showTempMessage(`Only ${stock} in stock`);
                return;
            }
            item.quantity += change;
        } else if (change < 0) {
            item.quantity += change;
            if (item.quantity <= 0) {
                // pass size when removing so sized items are removed correctly
                removeFromCart(productId, size);
                return;
            }
        }

        saveCart();
        updateCart();
        renderCartItems();
    }
}

function removeFromCart(productId, size) {
    cart = cart.filter(item => {
        if (size) {
            return !(item.id === productId && item.size === size);
        }
        return !(item.id === productId && !item.size);
    });
    saveCart();
    updateCart();
    renderCartItems();
}



function saveCart() {
    localStorage.setItem('vegaCart', JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem('vegaCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    // Always update UI to ensure correct button state (disabled if empty)
    updateCart();
    renderCartItems();
}

async function addToWishlist(productId) {
    try {
        if (typeof firebase === 'undefined' || typeof db === 'undefined') {
            if (typeof showToast === 'function') showToast('Firebase not initialized. Please refresh the page.', 'error'); else showTempMessage && showTempMessage('Firebase not initialized. Please refresh the page.');
            return;
        }

        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            if (typeof showToast === 'function') showToast('Please log in to add items to wishlist', 'info'); else showTempMessage && showTempMessage('Please log in to add items to wishlist');
            return;
        }

        const userRef = db.collection('users').doc(currentUser.uid);
        const userDoc = await userRef.get();
        let wishlist = [];
        if (userDoc.exists && Array.isArray(userDoc.data().wishlist)) {
            wishlist = userDoc.data().wishlist;
        }

        if (wishlist.includes(productId)) {

            flashWishlistButton(productId, true);
            return;
        }

        wishlist.push(productId);
        await userRef.set({ wishlist: wishlist }, { merge: true });

        console.log('Added to wishlist:', productId);
        flashWishlistButton(productId, true);

        showTempMessage('✓ Added to wishlist');
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        if (typeof showToast === 'function') showToast('Error adding to wishlist. Please try again.', 'error'); else showTempMessage && showTempMessage('Error adding to wishlist. Please try again.');
    }
}

async function removeFromWishlist(productId, userId) {
    try {
        if (typeof db === 'undefined') {
            if (typeof showToast === 'function') showToast('Database not initialized. Please refresh the page.', 'error'); else showTempMessage && showTempMessage('Database not initialized. Please refresh the page.');
            return;
        }

        const uid = userId || (firebase.auth().currentUser && firebase.auth().currentUser.uid);
        if (!uid) {
            if (typeof showToast === 'function') showToast('User not found. Please log in.', 'error'); else showTempMessage && showTempMessage('User not found. Please log in.');
            return;
        }

        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        let wishlist = userDoc.exists ? (userDoc.data().wishlist || []) : [];

        wishlist = wishlist.filter(id => id !== productId);
        await userRef.set({ wishlist: wishlist }, { merge: true });

        console.log('Removed from wishlist:', productId);

        flashWishlistButton(productId, false);

        const item = document.querySelector(`[data-product-id="${productId}"]`);
        if (item) {
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            setTimeout(() => item.remove(), 300);
        }
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        if (typeof showToast === 'function') showToast('Error removing from wishlist.', 'error'); else showTempMessage && showTempMessage('Error removing from wishlist.');
    }
}

function flashWishlistButton(productId, added) {
    const buttons = document.querySelectorAll(`.wishlist-btn[data-id="${productId}"]`);
    buttons.forEach(btn => {
        if (added) {
            btn.classList.add('in-wishlist');
        } else {
            btn.classList.remove('in-wishlist');
        }
        btn.classList.add('pulse');
        setTimeout(() => btn.classList.remove('pulse'), 700);
    });
}

function showTempMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'temp-message';
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => {
        msg.style.opacity = '0';
        setTimeout(() => msg.remove(), 400);
    }, 1500);
}

// Confirm modal helper
(function () {
    function createConfirmModal() {
        if (document.getElementById('confirmModal')) return;

        const overlay = document.createElement('div');
        overlay.id = 'confirmModal';
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
                <div class="confirm-body">
                    <h3 id="confirmTitle" class="confirm-title">Confirm</h3>
                    <div class="confirm-message">Are you sure?</div>
                    <div class="confirm-actions">
                        <button class="confirm-btn cancel">Cancel</button>
                        <button class="confirm-btn confirm">Confirm</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Event delegation
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                hideConfirm(false);
            }
        });

        const cancelBtn = overlay.querySelector('.confirm-btn.cancel');
        const confirmBtn = overlay.querySelector('.confirm-btn.confirm');

        cancelBtn.addEventListener('click', () => hideConfirm(false));
        confirmBtn.addEventListener('click', () => hideConfirm(true));

        // keyboard support
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideConfirm(false);
            if (e.key === 'Enter') hideConfirm(true);
        });

        // expose show/hide via closures
        let resolver = null;

        function showConfirmImpl(message, opts = {}) {
            const titleEl = overlay.querySelector('.confirm-title');
            const msgEl = overlay.querySelector('.confirm-message');
            const confirmBtn = overlay.querySelector('.confirm-btn.confirm');
            const cancelBtn = overlay.querySelector('.confirm-btn.cancel');

            titleEl.textContent = opts.title || 'Confirm';
            msgEl.textContent = message || '';
            confirmBtn.textContent = opts.confirmText || 'Confirm';
            cancelBtn.textContent = opts.cancelText || 'Cancel';

            if (opts.danger) {
                confirmBtn.classList.add('danger');
            } else {
                confirmBtn.classList.remove('danger');
            }

            overlay.style.display = 'flex';
            document.body.classList.add('modal-open');
            // focus management
            confirmBtn.focus();

            return new Promise(resolve => {
                resolver = resolve;
            });
        }

        function hideConfirm(result) {
            overlay.style.display = 'none';
            document.body.classList.remove('modal-open');
            if (resolver) {
                resolver(result);
                resolver = null;
            }
        }

        window._showConfirmImpl = showConfirmImpl;
    }

    createConfirmModal();

    window.showConfirm = async function (message, opts = {}) {
        if (!window._showConfirmImpl) createConfirmModal();
        return await window._showConfirmImpl(message, opts);
    };
})();

window.addToWishlist = addToWishlist;
window.removeFromWishlist = removeFromWishlist;

async function loadCurrentUserWishlist(uid) {
    try {
        if (typeof db === 'undefined') return;
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        const wishlist = userDoc.exists ? (userDoc.data().wishlist || []) : [];
        wishlist.forEach(productId => {
            const btns = document.querySelectorAll(`.wishlist-btn[data-id="${productId}"]`);
            btns.forEach(b => b.classList.add('in-wishlist'));
        });
    } catch (e) {
        console.error('Error loading current user wishlist:', e);
    }
}

let wishlistUnsubscribe = null;

function setupWishlistRealTimeListener(userId) {

    if (wishlistUnsubscribe) {
        wishlistUnsubscribe();
    }

    if (typeof db === 'undefined') {
        console.warn('Firestore not available for wishlist listener');
        return;
    }

    try {
        wishlistUnsubscribe = db.collection('users').doc(userId).onSnapshot((doc) => {
            if (doc.exists) {
                const wishlist = doc.data().wishlist || [];
                console.log('Wishlist updated in real-time:', wishlist);

                document.querySelectorAll('.wishlist-btn').forEach(btn => {
                    const productId = btn.getAttribute('data-id');
                    if (wishlist.includes(productId)) {
                        btn.classList.add('in-wishlist');
                    } else {
                        btn.classList.remove('in-wishlist');
                    }
                });
            }
        }, (error) => {
            console.error('Error listening to wishlist changes:', error);
        });
    } catch (err) {
        console.warn('Could not setup wishlist listener:', err);
    }
}

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            loadCurrentUserWishlist(user.uid);
            setupWishlistRealTimeListener(user.uid);
        } else {

            if (wishlistUnsubscribe) {
                wishlistUnsubscribe();
                wishlistUnsubscribe = null;
            }
        }
    });
}

window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 DOM fully loaded - Starting initialization");

    const firestoreSuccess = await loadProductsFromFirestore();

    if (!firestoreSuccess) {
        console.log("⚠️ Failed to load products from Firestore. Displaying no products.");
    }

    const shopProductsGrid = document.getElementById('productsGrid');
    const newArrivalsProductsGridById = document.getElementById('newProductsGrid');
    const newArrivalsProductsGridByClass = document.querySelector('.new-products-grid');

    if (productsGrid) renderProducts(productsGrid, product => product.topSelling);

    if (newArrivalsProductsGridByClass) renderProducts(newArrivalsProductsGridByClass, product => product.new);

    if (newArrivalsProductsGridById) renderProducts(newArrivalsProductsGridById, product => product.new);

    const collectionsGrid = document.getElementById('collectionsGrid');
    if (collectionsGrid) renderCollections(collectionsGrid);

    const params = new URLSearchParams(window.location.search);
    const collectionParam = params.get('collection');
    const categoryParam = params.get('category');

    if (shopProductsGrid) {
        if (collectionParam && typeof db !== 'undefined') {
            (async () => {
                try {
                    const colSnap = await db.collection('collections').where('name', '==', collectionParam).limit(1).get();
                    if (!colSnap.empty) {
                        const c = colSnap.docs[0].data();
                        const ids = Array.isArray(c.products) ? c.products : [];
                        renderProducts(shopProductsGrid, p => ids.includes(p.id));
                    } else if (categoryParam) {
                        renderProducts(shopProductsGrid, p => p.category === categoryParam);
                    } else {
                        renderProducts(shopProductsGrid, p => true);
                    }
                } catch (err) {
                    console.warn('Error applying collection filter:', err);
                    if (categoryParam) renderProducts(shopProductsGrid, p => p.category === categoryParam);
                    else renderProducts(shopProductsGrid, p => true);
                }
            })();
        } else if (categoryParam) {
            renderProducts(shopProductsGrid, p => p.category === categoryParam);
        } else {

            renderProducts(shopProductsGrid, p => true);
        }
    }

    loadCart();



    if (cartIcon) cartIcon.addEventListener('click', toggleCart);
    if (cartIconDesktop) cartIconDesktop.addEventListener('click', toggleCart);
    if (closeCart) closeCart.addEventListener('click', toggleCart);

    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                toggleCart();
            }
        });
    }

    if (typeof firebase !== 'undefined' && typeof auth !== 'undefined') {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists && userDoc.data().wishlist) {
                        const wishlist = userDoc.data().wishlist;
                        wishlist.forEach(productId => {
                            flashWishlistButton(productId, true);
                        });
                        console.log('✓ Wishlist loaded from Firestore:', wishlist);
                    }
                } catch (error) {
                    console.error('Error loading wishlist:', error);
                }
            }
        });
    }

    console.log("✅ Initialization complete");
    console.log(`📦 Total products: ${products.length}`);
    console.log(`⭐ Featured: ${products.filter(p => !p.new).length}`);
    console.log(`🆕 New arrivals: ${products.filter(p => p.new).length}`);

    window.scriptInitialized = true;

    setTimeout(() => {
        console.log("📢 Dispatching productsLoaded event...");
        document.dispatchEvent(window.productsLoadedEvent);
    }, 10);

    document.querySelectorAll('.checkout-btn').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();

            const hasLocalUser = !!localStorage.getItem('vegaUser');
            const firebaseUserAvailable = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
            const isLoggedIn = hasLocalUser || !!firebaseUserAvailable;

            if (!isLoggedIn) {

                window.location.href = 'login.html?redirect=checkout';
                return;
            }

            if (el.tagName && el.tagName.toLowerCase() === 'a' && el.getAttribute('href')) {
                window.location.href = el.getAttribute('href');
            } else {
                window.location.href = 'checkout.html';
            }
        });
    });

    const supportForms = document.querySelectorAll('#footer-support-form');
    supportForms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const phoneInput = form.querySelector('.support-phone');
            const textarea = form.querySelector('.support-message');
            const phone = phoneInput.value.trim();
            const message = textarea.value.trim();
            const button = form.querySelector('button[type="submit"]');

            if (!phone) {
                showTempMessage && showTempMessage('Please enter your phone number');
                return;
            }

            if (!message) {
                showTempMessage && showTempMessage('Please enter a message');
                return;
            }

            let userEmail = 'Anonymous';
            try {
                const user = JSON.parse(localStorage.getItem('vegaUser'));
                if (user && user.email) {
                    userEmail = user.email;
                }
            } catch (e) {

            }

            try {
                button.disabled = true;
                button.textContent = 'Sending...';

                if (typeof db === 'undefined') {
                    throw new Error('Database not initialized');
                }

                await db.collection('supportMessages').add({
                    email: userEmail,
                    phone: phone,
                    message: message,
                    status: 'new',
                    timestamp: new Date()
                });

                phoneInput.value = '';
                textarea.value = '';
                button.textContent = 'Message Sent!';
                setTimeout(() => {
                    button.textContent = 'Send Message';
                    button.disabled = false;
                }, 2000);

            } catch (error) {
                console.error('Error sending support message:', error);
                showTempMessage && showTempMessage('Error sending message. Please try again.');
                button.disabled = false;
                button.textContent = 'Send Message';
            }
        });
    });
});