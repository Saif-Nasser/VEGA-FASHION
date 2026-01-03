

async function initAdminPage() {

    if (window._adminPageInitialized) {
        console.log("Admin page already initialized, skipping...");
        return;
    }
    window._adminPageInitialized = true;

    console.log("Initializing admin page...");

    if (typeof db === 'undefined') {
        showError('Firebase not loaded. Please check your configuration.');
        return;
    }

    setupNavigation();

    setupAddProductForm();

    setupCollectionsSection();

    setupAdminSettings();

    setupCategoryManagement();

    setupSupportSection();

    setupPromosSection();

    setupOrdersSection();

    setupViewSection();

    setupReviewsSection();

    await loadProducts();

    await loadOrders();

    await loadAnalytics();

    updateCurrentData();

    console.log("Admin page initialized");
}



function setupCollectionsSection() {

    if (typeof window.currentEditingCollectionId === 'undefined') window.currentEditingCollectionId = null;
    const form = document.getElementById('createCollectionForm');
    const productsContainer = document.getElementById('collectionProductsList');
    const collectionsList = document.getElementById('collectionsList');
    const message = document.getElementById('collectionMessage');

    async function loadProductsForCollections() {
        if (!productsContainer) return;
        productsContainer.innerHTML = '<p style="text-align:center;color:var(--dark-gray);">Loading products...</p>';
        try {
            const snapshot = await db.collection('products').get();
            if (snapshot.empty) {
                productsContainer.innerHTML = '<p style="text-align:center;color:var(--dark-gray);">No products available</p>';
                return;
            }

            productsContainer.innerHTML = '';
            snapshot.forEach(doc => {
                const p = doc.data();
                const id = doc.id;
                const item = document.createElement('div');
                item.className = 'product-item';
                item.innerHTML = `
                    <label class="product-checkbox" for="col_prod_${id}">
                        <input type="checkbox" id="col_prod_${id}" data-id="${id}" />
                        <span class="checkmark" aria-hidden="true"></span>
                        <img src="${typeof normalizeImageUrl === 'function' ? normalizeImageUrl(p.image) : (p.image || 'https://via.placeholder.com/80')}" alt="${p.name}" loading="lazy" decoding="async" onerror="this.src='https://via.placeholder.com/80'">
                        <div class="product-info">
                            <h3 style="margin:0;">${p.name}</h3>
                            <p style="margin:0;color:var(--dark-gray);font-size:13px;">${p.category || 'Uncategorized'}</p>
                        </div>
                    </label>
                `;
                productsContainer.appendChild(item);
            });
        } catch (err) {
            console.error('Error loading products for collections:', err);
            productsContainer.innerHTML = `<div style="color:#dc3545;">Error loading products: ${err.message}</div>`;
        }
    }

    async function loadCollectionsList() {
        if (!collectionsList) return;
        collectionsList.innerHTML = '<p style="text-align:center;color:var(--dark-gray);">Loading collections...</p>';
        try {
            const snapshot = await db.collection('collections').orderBy('createdAt', 'desc').get();
            if (snapshot.empty) {
                collectionsList.innerHTML = '<p style="text-align:center;color:var(--dark-gray);">No collections yet</p>';
                return;
            }

            collectionsList.innerHTML = '';
            snapshot.forEach(doc => {
                const c = doc.data();
                const id = doc.id;
                const el = document.createElement('div');
                el.style.cssText = 'display:flex;align-items:center;gap:12px;border:1px solid #eee;padding:12px;border-radius:8px;margin-bottom:10px;background:var(--light-beige);';
                el.innerHTML = `
                    <img src="${typeof normalizeImageUrl === 'function' ? normalizeImageUrl(c.image) : (c.image || 'https://via.placeholder.com/80')}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;" onerror="this.src='https://via.placeholder.com/80'" />
                    <div style="flex:1;"><strong>${c.name}</strong><div style="color:var(--dark-gray);font-size:13px;">${(c.products || []).length} item(s)</div></div>
                    <div style="display:flex;gap:8px;"><button class="action-btn" onclick="editCollection('${id}')">Edit</button><button class="action-btn delete" onclick="deleteCollection('${id}','${(c.name || '').replace(/'/g, "\\'")}')">Delete</button></div>
                `;
                collectionsList.appendChild(el);
            });
        } catch (err) {
            console.error('Error loading collections:', err);
            collectionsList.innerHTML = `<div style="color:#dc3545;">Error loading collections: ${err.message}</div>`;
        }
    }

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const name = document.getElementById('collectionName').value.trim();
            const image = document.getElementById('collectionImage').value.trim();
            if (!name) { showMessage(message, 'Please enter a collection name', 'error'); return; }

            const checks = form.querySelectorAll('input[type="checkbox"][id^="col_prod_"]:checked');
            const productIds = Array.from(checks).map(c => c.dataset.id);

            try {
                const btn = document.getElementById('createCollectionBtn');
                const orig = btn.innerHTML;
                btn.innerHTML = window.currentEditingCollectionId ? '<i class="fas fa-spinner fa-spin"></i> Saving...' : '<i class="fas fa-spinner fa-spin"></i> Creating...';
                btn.disabled = true;

                if (window.currentEditingCollectionId) {

                    await db.collection('collections').doc(window.currentEditingCollectionId).update({
                        name: name,
                        image: image || null,
                        products: productIds,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    showMessage(message, `Collection "${name}" updated`, 'success');
                    window.currentEditingCollectionId = null;
                } else {

                    await db.collection('collections').add({
                        name: name,
                        image: image || null,
                        products: productIds,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    showMessage(message, `Collection "${name}" created`, 'success');
                }

                form.reset();
                await loadCollectionsList();

            } catch (err) {
                console.error('Error creating/updating collection:', err);
                showMessage(message, `Error: ${err.message}`, 'error');
            } finally {
                const btn = document.getElementById('createCollectionBtn');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus-circle"></i> Create Collection'; }
                setTimeout(() => { if (message) message.style.display = 'none'; }, 3000);
            }
        });
    }

    window.editCollection = async function (collectionId) {
        try {
            const doc = await db.collection('collections').doc(collectionId).get();
            if (!doc.exists) { if (typeof showToast === 'function') showToast('Collection not found', 'info'); else showTempMessage && showTempMessage('Collection not found'); return; }
            const c = doc.data();

            document.getElementById('collectionName').value = c.name || '';
            document.getElementById('collectionImage').value = c.image || '';

            document.querySelectorAll('#collectionProductsList input[type="checkbox"]').forEach(cb => cb.checked = false);
            if (Array.isArray(c.products)) {
                c.products.forEach(id => {
                    const cb = document.getElementById('col_prod_' + id);
                    if (cb) cb.checked = true;
                });
            }

            window.currentEditingCollectionId = collectionId;
            const btn = document.getElementById('createCollectionBtn');
            if (btn) btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        } catch (err) {
            console.error('Error editing collection:', err);
            if (typeof showToast === 'function') showToast('Error: ' + err.message, 'error'); else showTempMessage && showTempMessage('Error: ' + err.message);
        }
    };

    window.deleteCollection = async function (collectionId, collectionName) {
        if (!await showConfirm(`Delete collection "${collectionName}"?`)) return;
        try {
            await db.collection('collections').doc(collectionId).delete();
            await loadCollectionsList();
            showSuccess('Collection deleted');
        } catch (err) {
            console.error('Error deleting collection:', err);
            if (typeof showToast === 'function') showToast('Error: ' + err.message, 'error'); else showTempMessage && showTempMessage('Error: ' + err.message);
        }
    };

    loadProductsForCollections();
    loadCollectionsList();
}

function setupAdminSettings() {
    const form = document.getElementById('addAdminForm');
    const message = document.getElementById('adminMessage');
    const adminsList = document.getElementById('adminsList');

    if (!adminsList) return;

    async function loadAdminsList() {
        try {
            const adminDoc = await db.collection('config').doc('admins').get();
            const data = adminDoc.exists ? adminDoc.data() : {};
            const raw = data.uids || [];
            const masterEmail = data.masterEmail || null;

            if (raw.length === 0 && !masterEmail) {
                adminsList.innerHTML = '<p style="color: var(--dark-gray);">No admin accounts found.</p>';
                return;
            }

            // Try to resolve emails from our `users` collection when available
            const resolved = await Promise.all(raw.map(async (entry) => {
                if (typeof entry === 'string') {
                    const uid = entry;
                    try {
                        const userDoc = await db.collection('users').doc(uid).get();
                        if (userDoc.exists) return { uid, email: userDoc.data().email || 'Unknown' };
                        return { uid, email: 'Unknown' };
                    } catch (e) {
                        return { uid, email: 'Unknown' };
                    }
                } else if (entry && entry.uid) {
                    return { uid: entry.uid, email: entry.email || 'Unknown' };
                }
                return { uid: 'unknown', email: 'Unknown' };
            }));

            let html = '';

            // Show Master Admin if exists
            if (masterEmail) {
                html += `
                    <div style="padding: 15px; border: 2px solid #3b82f6; border-radius: 8px; margin-bottom: 15px; background: rgba(59, 130, 246, 0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 700; color: #3b82f6; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Master Administrator</div>
                                <div style="font-weight: 600; color: var(--black);">${masterEmail}</div>
                            </div>
                            <span style="font-size: 20px; color: #3b82f6;"><i class="fas fa-crown"></i></span>
                        </div>
                    </div>
                `;
            }

            html += resolved.map((admin) => `
                <div style="padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: var(--black);">${admin.email}</div>
                        <div style="color: var(--dark-gray); font-size: 12px; margin-top: 4px;">UID: ${admin.uid}</div>
                    </div>
                    <button onclick="removeAdmin('${admin.uid}', '${admin.email}')" class="btn" style="background: #e74c3c; color: white; padding: 8px 15px; font-size: 12px;">
                        Remove
                    </button>
                </div>
            `).join('');

            adminsList.innerHTML = html;
        } catch (error) {
            console.error('Error loading admins:', error);
            adminsList.innerHTML = '<p style="color: #e74c3c;">Error loading admin list</p>';
        }
    }

    window.removeAdmin = async function (uid, email) {
        if (!await showConfirm(`Are you sure you want to remove ${email} as an administrator?`)) return;

        try {
            // 1. Remove UID from config/admins
            const adminRef = db.collection('config').doc('admins');
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(adminRef);
                if (!doc.exists) return;
                const uids = doc.data().uids || [];
                const updatedUids = uids.filter(id => id !== uid);
                transaction.update(adminRef, { uids: updatedUids });
            });

            // 2. Delete user document from users collection (optional but keeps things clean)
            try {
                await db.collection('users').doc(uid).delete();
            } catch (e) {
                console.warn("Could not delete user document, but admin privileges were revoked:", e);
            }

            if (typeof showToast === 'function') showToast(`${email} has been removed successfully.`, 'success'); else showTempMessage && showTempMessage(`${email} has been removed successfully.`);
            loadAdminsList();
        } catch (error) {
            console.error("Error removing admin:", error);
            if (typeof showToast === 'function') showToast("Error removing admin: " + error.message, 'error'); else showTempMessage && showTempMessage("Error removing admin: " + error.message);
        }
    };

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value.trim();
            const password = document.getElementById('adminPassword').value;
            const submitBtn = form.querySelector('button[type="submit"]');

            if (!email || !password) return;

            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            submitBtn.disabled = true;
            message.style.display = 'none';

            let secondaryApp = null;
            try {
                // Initialize a secondary Firebase app instance to avoid session hijacking
                // This prevents the current admin from being signed out when createUserWithEmailAndPassword is called.
                const appName = "SecondaryCreationApp_" + Date.now();
                secondaryApp = firebase.initializeApp(window.firebaseConfig, appName);

                // 1. Create the user in Firebase Auth using the secondary app
                const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
                const uid = userCredential.user.uid;

                // 2. Create the user document in Firestore (using the primary db instance)
                await db.collection('users').doc(uid).set({
                    email: email,
                    role: 'admin',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 3. Add UID to config/admins (using the primary db instance)
                const adminRef = db.collection('config').doc('admins');
                await db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(adminRef);
                    const data = doc.exists ? doc.data() : { uids: [] };
                    const uids = data.uids || [];
                    if (!uids.includes(uid)) {
                        uids.push(uid);
                        transaction.set(adminRef, { uids: uids }, { merge: true });
                    }
                });

                showMessage(message, '✓ Administrator account created successfully!', 'success');
                form.reset();
                loadAdminsList();
            } catch (error) {
                console.error("Error creating admin:", error);
                showMessage(message, '❌ Error: ' + error.message, 'error');
            } finally {
                // Always delete the secondary app instance to clean up
                if (secondaryApp) {
                    try {
                        await secondaryApp.delete();
                    } catch (e) {
                        console.warn("Could not delete secondary app:", e);
                    }
                }
                submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Admin Account';
                submitBtn.disabled = false;
            }
        });
    }

    loadAdminsList();
}

async function populateCategoryDropdowns() {
    const mainSelect = document.getElementById('productCategory');
    const editSelect = document.getElementById('editModalCategory'); // If modal is open

    try {
        const catDoc = await db.collection('config').doc('categories').get();
        const categories = catDoc.exists ? (catDoc.data().list || []) : [];

        const updateSelect = (select) => {
            if (!select) return;
            const currentVal = select.value;
            select.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.toLowerCase();
                opt.textContent = cat;
                select.appendChild(opt);
            });
            if (currentVal) select.value = currentVal;
        };

        updateSelect(mainSelect);
        updateSelect(editSelect);
    } catch (err) {
        console.error('Error populating categories:', err);
    }
}

function setupCategoryManagement() {
    const form = document.getElementById('addCategoryForm');
    const list = document.getElementById('categoriesList');
    const message = document.getElementById('categoryMessage');

    async function loadCategories() {
        if (!list) return;
        try {
            const doc = await db.collection('config').doc('categories').get();
            const categories = doc.exists ? (doc.data().list || []) : [];

            if (categories.length === 0) {
                list.innerHTML = '<p style="text-align:center;color:var(--dark-gray);padding:20px;">No categories yet.</p>';
            } else {
                list.innerHTML = categories.map(cat => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;background:var(--light-beige);">
                        <span style="font-weight:600;">${cat}</span>
                        <button onclick="removeCategory('${cat}')" class="btn" style="background:#e74c3c;color:white;padding:5px 10px;font-size:12px;">Delete</button>
                    </div>
                `).join('');
            }
            populateCategoryDropdowns();
        } catch (err) {
            console.error('Error loading categories:', err);
            list.innerHTML = '<p style="color:#e74c3c;">Error loading categories</p>';
        }
    }

    window.removeCategory = async function (catName) {
        if (!await showConfirm(`Are you sure you want to delete the "${catName}" category?`)) return;
        try {
            const catRef = db.collection('config').doc('categories');
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(catRef);
                if (!doc.exists) return;
                const list = doc.data().list || [];
                const updated = list.filter(c => c !== catName);
                transaction.update(catRef, { list: updated });
            });
            loadCategories();
        } catch (err) {
            console.error('Error removing category:', err);
            if (typeof showToast === 'function') showToast('Error removing category: ' + err.message, 'error'); else showTempMessage && showTempMessage('Error removing category: ' + err.message);
        }
    };

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('newCategoryName');
            const name = nameInput.value.trim();
            if (!name) return;

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            try {
                const catRef = db.collection('config').doc('categories');
                await db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(catRef);
                    const data = doc.exists ? doc.data() : { list: [] };
                    const list = data.list || [];
                    if (!list.includes(name)) {
                        list.push(name);
                        list.sort();
                        transaction.set(catRef, { list: list }, { merge: true });
                    }
                });

                showMessage(message, '✓ Category added successfully!', 'success');
                nameInput.value = '';
                loadCategories();
            } catch (err) {
                console.error('Error adding category:', err);
                showMessage(message, '❌ Error: ' + err.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Category';
                setTimeout(() => { message.style.display = 'none'; }, 3000);
            }
        });
    }

    loadCategories();
}

function showMessage(element, msg, type) {
    element.textContent = msg;
    element.style.display = 'block';
    element.style.padding = '12px';
    element.style.borderRadius = '6px';
    element.style.marginBottom = '15px';

    if (type === 'success') {
        element.style.background = '#d4edda';
        element.style.color = '#155724';
        element.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        element.style.background = '#f8d7da';
        element.style.color = '#721c24';
        element.style.border = '1px solid #f5c6cb';
    }
}

function setupNavigation() {
    const navButtons = document.querySelectorAll('.admin-nav-btn');
    const sections = document.querySelectorAll('.admin-section');

    navButtons.forEach(button => {
        button.addEventListener('click', function () {
            const sectionId = this.dataset.section + 'Section';

            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });
        });
    });
}

function setupAddProductForm() {
    const form = document.getElementById('addProductForm');
    const message = document.getElementById('addMessage');

    if (!form) return;

    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    const updatedForm = document.getElementById('addProductForm');

    updatedForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        console.log("Form submit event triggered");

        const name = document.getElementById('productName').value.trim();
        const category = document.getElementById('productCategory').value;
        const price = parseFloat(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const image = document.getElementById('productImage').value.trim();
        const description = document.getElementById('productDescription').value.trim();
        const isNew = document.getElementById('isNewProduct').checked;
        const isTopSelling = document.getElementById('isTopSelling') ? document.getElementById('isTopSelling').checked : false;

        const sizeCheckboxes = document.querySelectorAll('input[name="sizes"]:checked');
        const sizes = Array.from(sizeCheckboxes).map(cb => cb.value);

        const updatedMessage = document.getElementById('addMessage');

        if (!name || !category || !price || !image || isNaN(stock)) {
            showMessage(updatedMessage, 'Please fill in all required fields', 'error');
            return;
        }

        if (sizes.length === 0) {
            showMessage(updatedMessage, 'Please select at least one size', 'error');
            return;
        }

        if (price <= 0) {
            showMessage(updatedMessage, 'Price must be greater than 0', 'error');
            return;
        }

        if (stock < 0) {
            showMessage(updatedMessage, 'Stock cannot be negative', 'error');
            return;
        }

        const productData = {
            name: name,
            category: category,
            price: price,
            stock: stock,
            image: image,
            description: description || `${name} - ${category}`,
            sizes: sizes,
            new: isNew,
            topSelling: isTopSelling,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const productIdToUpdate = updatedForm.getAttribute('data-edit-id');

        const submitBtn = document.getElementById('addProductBtn');
        const isEditing = !!productIdToUpdate;
        const originalText = isEditing ? '<i class="fas fa-save"></i> Update Product' : '<i class="fas fa-plus"></i> Add Product';

        try {
            if (productIdToUpdate) {

                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
                submitBtn.disabled = true;

                await db.collection('products').doc(productIdToUpdate).update(productData);
                console.log("Product updated with ID:", productIdToUpdate);

                showMessage(updatedMessage, `Product "${name}" updated successfully!`, 'success');

                updatedForm.removeAttribute('data-edit-id');
            } else {

                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
                submitBtn.disabled = true;

                productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const docRef = await db.collection('products').add(productData);
                console.log("Product added to Firestore with ID:", docRef.id);

                showMessage(updatedMessage, `Product "${name}" added successfully! ID: ${docRef.id}`, 'success');
            }

            await loadProducts();
            updateCurrentData();

            updatedForm.reset();

        } catch (error) {
            console.error("Error saving product to Firestore:", error);
            showMessage(updatedMessage, `Error: ${error.message}`, 'error');
        } finally {

            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Product';
            submitBtn.disabled = false;
        }

        setTimeout(() => {
            updatedMessage.style.display = 'none';
        }, 3000);
    });
}

function setupViewSection() {
    const searchInput = document.getElementById('productSearch');
    const lowStockCheck = document.getElementById('lowStockFilter');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            loadProducts(searchInput.value, lowStockCheck.checked);
        });
    }

    if (lowStockCheck) {
        lowStockCheck.addEventListener('change', () => {
            loadProducts(searchInput.value, lowStockCheck.checked);
        });
    }
}

async function loadProducts(search = '', lowStockOnly = false) {
    const productsList = document.getElementById('productsList');
    if (!productsList) {
        console.log("Products list element not found");
        return;
    }

    try {
        const snapshot = await db.collection('products').get();
        let allProducts = [];

        snapshot.forEach(doc => {
            const product = doc.data();
            product.id = doc.id;

            // Filter logic
            const stock = product.stock !== undefined ? product.stock : 0;
            const searchLower = search.toLowerCase();
            const matchesSearch = !search ||
                product.name.toLowerCase().includes(searchLower) ||
                product.category.toLowerCase().includes(searchLower);
            const matchesLowStock = !lowStockOnly || stock <= 5;

            if (matchesSearch && matchesLowStock) {
                allProducts.push(product);
            }
        });

        productsList.innerHTML = '';

        if (allProducts.length === 0) {
            productsList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                    <h3>No Matching Products</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            `;
            return;
        }

        allProducts.forEach((product) => {
            const stock = product.stock !== undefined ? product.stock : 'N/A';
            const stockColor = stock <= 5 ? '#ff6b6b' : (stock === 'N/A' ? '#6c757d' : '#28a745');

            const productItem = document.createElement('div');
            productItem.className = 'product-item';

            // Pulse effect if low stock
            if (stock <= 5 && stock !== 'N/A') {
                productItem.style.borderLeft = '4px solid #ff6b6b';
            }

            productItem.innerHTML = `
                <img src="${typeof normalizeImageUrl === 'function' ? normalizeImageUrl(product.image) : (product.image || 'https://via.placeholder.com/80')}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/80'">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p><strong>Category:</strong> ${product.category}</p>
                    <p><strong>Price:</strong> ${product.price.toFixed(2)} EGP</p>
                    <p><strong>Stock:</strong> <span style="color: ${stockColor}; font-weight: 600;">${stock}${stock !== 'N/A' ? ' units' : ''}</span></p>
                </div>
                <div class="product-actions">
                    <button class="action-btn" onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete" onclick="deleteProduct('${product.id}', '${product.name.replace(/'/g, "\\'")}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;

            productsList.appendChild(productItem);
        });
    } catch (error) {
        console.error("Error loading products:", error);
        productsList.innerHTML = `<div style="text-align: center; padding: 40px; color: #dc3545;">Error: ${error.message}</div>`;
    }
}

async function editProduct(productId) {
    try {

        const doc = await db.collection('products').doc(productId).get();

        if (!doc.exists) {
            if (typeof showToast === 'function') showToast('Product not found!', 'info'); else showTempMessage && showTempMessage('Product not found!');
            return;
        }

        const product = doc.data();

        const modal = document.createElement('div');
        modal.id = 'editProductModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        `;

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Edit Product</h2>
                <button onclick="document.getElementById('editProductModal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
            </div>

            <form id="editModalForm" style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Product Name *</label>
                    <input type="text" id="editModalName" value="${product.name}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Category *</label>
                    <select id="editModalCategory" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                        <option value="">Loading categories...</option>
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Price (EGP) *</label>
                        <input type="number" id="editModalPrice" value="${product.price}" step="0.01" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Stock *</label>
                        <input type="number" id="editModalStock" value="${product.stock || 1}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                    </div>
                </div>

                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Image URL *</label>
                    <input type="text" id="editModalImage" value="${product.image}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Description</label>
                    <textarea id="editModalDescription" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; min-height: 80px; resize: vertical;">${product.description || ''}</textarea>
                </div>

                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Available Sizes</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                        ${['S', 'M', 'L'].map(size => `
                            <label class="size-label" style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" name="editSizes" value="${size}" ${product.sizes && product.sizes.includes(size) ? 'checked' : ''}>
                                <span class="size-visual">${size}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="editModalNew" ${product.new ? 'checked' : ''}>
                    <label for="editModalNew" style="margin: 0; cursor: pointer; font-weight: 500;">Mark as New Arrival</label>
                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="editModalTop" ${product.topSelling ? 'checked' : ''}>
                    <label for="editModalTop" style="margin: 0; cursor: pointer; font-weight: 500;">Mark as Top Selling</label>
                </div>

                <div id="editModalMessage" style="padding: 10px; border-radius: 6px; display: none; margin-top: 10px;"></div>

                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" style="flex: 1; padding: 12px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                    <button type="button" onclick="document.getElementById('editProductModal').remove()" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Populate and set categories in modal
        await populateCategoryDropdowns();
        const categorySelect = document.getElementById('editModalCategory');
        if (categorySelect) categorySelect.value = product.category;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        const form = modalContent.querySelector('#editModalForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const message = modalContent.querySelector('#editModalMessage');

            const updatedData = {
                name: document.getElementById('editModalName').value.trim(),
                category: document.getElementById('editModalCategory').value.trim(),
                price: parseFloat(document.getElementById('editModalPrice').value),
                stock: parseInt(document.getElementById('editModalStock').value),
                image: document.getElementById('editModalImage').value.trim(),
                description: document.getElementById('editModalDescription').value.trim(),
                new: document.getElementById('editModalNew').checked,
                topSelling: document.getElementById('editModalTop') ? document.getElementById('editModalTop').checked : false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const sizeCheckboxes = modalContent.querySelectorAll('input[name="editSizes"]:checked');
            const sizes = Array.from(sizeCheckboxes).map(cb => cb.value);

            if (sizes.length === 0) {
                message.textContent = '❌ Please select at least one size';
                message.style.background = '#ffebee';
                message.style.color = '#c62828';
                message.style.display = 'block';
                return;
            }

            updatedData.sizes = sizes;

            if (!updatedData.name || !updatedData.category || !updatedData.price || !updatedData.image) {
                message.textContent = '❌ Please fill in all required fields';
                message.style.background = '#ffebee';
                message.style.color = '#c62828';
                message.style.display = 'block';
                return;
            }

            if (updatedData.price <= 0) {
                message.textContent = '❌ Price must be greater than 0';
                message.style.background = '#ffebee';
                message.style.color = '#c62828';
                message.style.display = 'block';
                return;
            }

            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;

            try {
                await db.collection('products').doc(productId).update(updatedData);

                message.textContent = '✓ Product updated successfully!';
                message.style.background = '#e8f5e9';
                message.style.color = '#2e7d32';
                message.style.display = 'block';

                await loadProducts();
                updateCurrentData();

                setTimeout(() => {
                    modal.remove();
                }, 1500);

            } catch (error) {
                console.error("Error updating product:", error);
                message.textContent = `❌ Error: ${error.message}`;
                message.style.background = '#ffebee';
                message.style.color = '#c62828';
                message.style.display = 'block';

                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                submitBtn.disabled = false;
            }
        });

    } catch (error) {
        console.error("Error loading product for edit:", error);
        if (typeof showToast === 'function') showToast(`Error: ${error.message}`, 'error'); else showTempMessage && showTempMessage(`Error: ${error.message}`);
    }
}

async function deleteProduct(productId, productName) {
    if (!await showConfirm(`Are you sure you want to delete "${productName}"?`)) {
        return;
    }

    const message = document.getElementById('viewMessage');

    try {

        await db.collection('products').doc(productId).delete();

        showMessage(message, `"${productName}" deleted successfully`, 'success');

        await loadProducts();
        updateCurrentData();

        setTimeout(() => {
            message.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error("Error deleting product:", error);
        showMessage(message, `Error: ${error.message}`, 'error');
    }
}


async function updateCurrentData() {
    const display = document.getElementById('currentData');
    if (!display) return;

    try {

        const snapshot = await db.collection('products').get();
        const productCount = snapshot.size;

        const data = {
            timestamp: new Date().toLocaleString(),
            totalProducts: productCount,
            firestoreConnected: typeof db !== 'undefined',
            sampleData: productCount > 0 ? 'Products loaded successfully' : 'No products in database'
        };

        display.textContent = JSON.stringify(data, null, 2);

    } catch (error) {
        display.textContent = JSON.stringify({
            error: error.message,
            timestamp: new Date().toLocaleString()
        }, null, 2);
    }
}

function showMessage(element, text, type) {
    if (!element) return;

    element.textContent = text;
    element.className = `message ${type}`;
    element.style.display = 'block';
}

function showError(message) {
    const container = document.querySelector('.admin-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545; margin-bottom: 20px;"></i>
                <h2>Firebase Error</h2>
                <p>${message}</p>
                <p>Please check your Firebase configuration in firebase-config.js</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

function showSuccess(message) {

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
        animation: slideIn 0.3s ease-in;
    `;
    toast.textContent = '✓ ' + message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function testLocalStorage() {
    const result = document.getElementById('storageTestResult');
    try {
        const testKey = 'vega_test_' + Date.now();
        const testValue = 'test_value_' + Math.random();

        localStorage.setItem(testKey, testValue);

        const retrievedValue = localStorage.getItem(testKey);

        localStorage.removeItem(testKey);

        if (retrievedValue === testValue) {
            showMessage(result, '✅ Local Storage: Working correctly', 'success');
        } else {
            showMessage(result, '❌ Local Storage: Value mismatch', 'error');
        }
    } catch (error) {
        showMessage(result, `❌ Local Storage Error: ${error.message}`, 'error');
    }
}

function testProductArray() {
    const result = document.getElementById('productTestResult');
    try {
        if (typeof products === 'undefined') {
            showMessage(result, '❌ Products array not defined', 'error');
            return;
        }

        showMessage(result, `✅ Products array loaded: ${products.length} products found`, 'success');
    } catch (error) {
        showMessage(result, `❌ Error: ${error.message}`, 'error');
    }
}

function testOrdersArray() {
    const result = document.getElementById('productTestResult');
    try {

        if (typeof db === 'undefined') {
            showMessage(result, '❌ Firestore not loaded', 'error');
            return;
        }

        showMessage(result, '✅ Orders collection accessible in Firestore', 'success');
    } catch (error) {
        showMessage(result, `❌ Error: ${error.message}`, 'error');
    }
}

async function clearAllData() {
    if (!await showConfirm('WARNING: This will delete ALL products and orders. This action cannot be undone. Are you sure?', { title: 'Dangerous Action', danger: true, confirmText: 'Delete All' })) {
        return;
    }

    if (!await showConfirm('Please confirm again - this is permanent!', { title: 'Confirm Again', danger: true, confirmText: 'Yes, delete permanently' })) {
        return;
    }

    const message = document.getElementById('testMessage');

    try {

        db.collection('products').get().then(snapshot => {
            snapshot.forEach(doc => {
                db.collection('products').doc(doc.id).delete();
            });
        });

        db.collection('orders').get().then(snapshot => {
            snapshot.forEach(doc => {
                db.collection('orders').doc(doc.id).delete();
            });
        });

        showMessage(message, '✅ Deletion in progress...', 'success');

        setTimeout(() => {
            loadProducts();
            updateCurrentData();
            showMessage(message, '✅ All data cleared', 'success');
        }, 2000);

    } catch (error) {
        showMessage(message, `❌ Error: ${error.message}`, 'error');
    }
}

function setupOrdersSection() {
    const searchInput = document.getElementById('orderSearch');
    const statusFilter = document.getElementById('orderStatusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            loadOrders(searchInput.value, statusFilter.value);
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            loadOrders(searchInput.value, statusFilter.value);
        });
    }
}

async function loadOrders(search = '', filterStatus = '') {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    try {
        let query = db.collection('orders').orderBy('createdAt', 'desc');

        // Firestore doesn't support easy multi-field text search and filtering at once without complex indexing
        // So we'll fetch recently modified and filter in memory for better UX on small-to-medium datasets
        const snapshot = await query.limit(100).get();

        if (snapshot.empty) {
            ordersList.innerHTML = '<p style="text-align: center; color: var(--dark-gray); padding: 20px;">No orders yet</p>';
            return;
        }

        let html = '';
        let found = 0;

        snapshot.forEach(doc => {
            const order = doc.data();
            const orderId = doc.id;
            const status = order.status || 'Pending';
            const customerName = order.shippingAddress?.fullName || order.userEmail || 'N/A';
            const email = order.userEmail || order.shippingAddress?.email || '';
            const orderIdLower = orderId.toLowerCase();
            const searchLower = search.toLowerCase();

            // Filter
            if (filterStatus && status !== filterStatus) return;
            if (search && !customerName.toLowerCase().includes(searchLower) &&
                !email.toLowerCase().includes(searchLower) &&
                !orderIdLower.includes(searchLower)) return;

            found++;
            const createdAt = order.createdAt
                ? new Date(order.createdAt.toDate()).toLocaleString()
                : 'N/A';

            let actionButtons = '';
            if (status === 'Pending') {
                actionButtons = `
                    <button onclick="window.updateOrderStatus('${orderId}', 'Processing')" style="background-color: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 8px; font-size: 12px;">
                        ✓ Confirm Order
                    </button>
                `;
            } else if (status === 'Processing') {
                actionButtons = `
                    <button onclick="window.updateOrderStatus('${orderId}', 'Delivered')" style="background-color: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 8px; font-size: 12px;">
                        📦 Mark Delivered
                    </button>
                    <button onclick="window.updateOrderStatus('${orderId}', 'Shipped')" style="background-color: #17a2b8; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 8px; font-size: 12px;">
                        🚚 Mark Shipped
                    </button>
                `;
            } else if (status === 'Shipped') {
                actionButtons = `
                    <button onclick="window.updateOrderStatus('${orderId}', 'Delivered')" style="background-color: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 8px; font-size: 12px;">
                        ✅ Mark Delivered
                    </button>
                `;
            }

            actionButtons += `
                <button onclick="window.showOrderDetails('${orderId}')" style="background-color: #ffffff; color: #333; border: 1px solid #ddd; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    🔍 View Details
                </button>
                <button onclick="window.updateOrderStatus('${orderId}', 'Cancelled')" style="background-color: #ffffff; color: #dc3545; border: 1px solid #dc3545; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: auto;">
                    ✕ Cancel
                </button>
            `;

            let statusColor = '#ffc107';
            if (status === 'Processing') statusColor = '#6c757d';
            if (status === 'Shipped') statusColor = '#17a2b8';
            if (status === 'Delivered') statusColor = '#28a745';
            if (status === 'Cancelled') statusColor = '#e74c3c';

            html += `
                <div style="border: 1px solid #eee; padding: 15px; margin-bottom: 15px; border-radius: 8px; background: white; transition: transform 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>Order #${orderId.substring(0, 8)}...</strong>
                        <span style="color: var(--dark-gray); font-size: 13px;">${createdAt}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px;">
                        <p><strong>Status:</strong> <span style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; display: inline-block; font-size: 11px; font-weight: 600; text-transform: uppercase;">${status}</span></p>
                        <p><strong>Total:</strong> $${order.total ? order.total.toFixed(2) : '0.00'}</p>
                        <p><strong>Customer:</strong> ${customerName}</p>
                    </div>
                    <div style="padding-top: 10px; border-top: 1px solid #f8f8f8; display: flex; gap: 8px; align-items: center;">
                        ${actionButtons}
                    </div>
                </div>
            `;
        });

        if (found === 0) {
            ordersList.innerHTML = '<p style="text-align: center; color: var(--dark-gray); padding: 40px;">No matching orders found</p>';
        } else {
            ordersList.innerHTML = html;
        }

    } catch (error) {
        console.error("Error loading orders:", error);
        ordersList.innerHTML = `<div style="color: #dc3545; padding: 20px;">Error loading orders: ${error.message}</div>`;
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        if (!await showConfirm(`Are you sure you want to update this order to "${newStatus}"?`)) {
            return;
        }

        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        const order = orderDoc.data();

        // Deduct stock only once when order is confirmed (Processing or Shipped or Delivered)
        const confirmsStock = ['Processing', 'Shipped', 'Delivered'];
        if (confirmsStock.includes(newStatus) && !order.stockDeducted && order.items && Array.isArray(order.items)) {
            console.log("Deducting stock for order confirmed/processing...");
            for (const item of order.items) {
                const productId = item.id || item.productId;
                if (productId) {
                    const productRef = db.collection('products').doc(productId);
                    const productDoc = await productRef.get();

                    if (productDoc.exists) {
                        const currentStock = productDoc.data().stock || 0;
                        const qty = item.qty || item.quantity || 1;
                        const newStock = Math.max(0, currentStock - qty);

                        await productRef.update({
                            stock: newStock
                        });
                        console.log(`Updated product ${productId} stock: ${currentStock} -> ${newStock}`);
                    }
                }
            }
            // Mark as deducted in the local object and then Firestore update happens later or now? 
            // Better do it now to be safe.
            await orderRef.update({ stockDeducted: true });
        }

        await orderRef.update({
            status: newStatus,
            updatedAt: new Date()
        });

        console.log(`Order ${orderId} updated to ${newStatus}`);

        await loadOrders();

        showSuccess(`Order updated to ${newStatus}`);

    } catch (error) {
        console.error("Error updating order status:", error);
        showError(`Error updating order: ${error.message}`);
    }
}

async function showOrderDetails(orderId) {
    const backdrop = document.getElementById('orderModalBackdrop');
    const body = document.getElementById('orderModalBody');
    if (!backdrop || !body) return;

    try {
        body.innerHTML = '<p style="color: var(--dark-gray);">Loading order details...</p>';
        backdrop.classList.add('active');

        const doc = await db.collection('orders').doc(orderId).get();
        if (!doc.exists) {
            body.innerHTML = `<p style="color: #dc3545;">Order not found.</p>`;
            return;
        }

        const order = doc.data();
        const createdAt = order.createdAt ? new Date(order.createdAt.toDate()).toLocaleString() : 'N/A';
        const updatedAt = order.updatedAt ? (order.updatedAt.toDate ? new Date(order.updatedAt.toDate()).toLocaleString() : new Date(order.updatedAt).toLocaleString()) : '';

        const ship = order.shippingAddress || {};

        let itemsHtml = '';
        if (Array.isArray(order.items) && order.items.length) {
            order.items.forEach(it => {
                const title = it.name || it.title || it.productName || 'Item';
                const qty = it.qty || it.quantity || it.count || 1;
                const price = (it.price || it.unitPrice || 0);
                const img = it.image || it.imageUrl || it.thumbnail || '';
                const variant = it.variant ? ` - ${it.variant}` : (it.size ? ` - ${it.size}` : '');
                const safeTitle = (title || '').replace(/'/g, "\\'");

                itemsHtml += `
                    <div class="order-item-product">
                        ${img ? `<img src="${img}" alt="${title}" class="modal-image--large" onclick="openImageInProductModal('${img}','${safeTitle}')">` : ''}
                        <div>
                            <div style="font-weight:600">${title}${variant}</div>
                            <div style="color: var(--dark-gray); font-size:13px;">Qty: ${qty} &nbsp; • &nbsp; $${Number(price).toFixed(2)}</div>
                        </div>
                    </div>
                `;
            });
        } else {
            itemsHtml = '<p style="color: var(--dark-gray);">No items recorded for this order.</p>';
        }

        const payment = order.paymentMethod || order.payment || 'Cash on Delivery';

        const status = order.status || 'Pending';

        let modalActions = '';
        if (status === 'Pending') {
            modalActions = `<button onclick="window.updateOrderStatus('${orderId}', 'Processing')" class="action-btn" style="background:#28a745;color:white;border:none;">✓ Confirm</button>`;
        } else if (status === 'Processing') {
            modalActions = `<button onclick="window.updateOrderStatus('${orderId}', 'Delivered')" class="action-btn" style="background:#007bff;color:white;border:none;">📦 Mark Delivered</button>`;
        }

        body.innerHTML = `
            <div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                    <div><strong>Order #${orderId}</strong><div style="color:var(--dark-gray);font-size:13px;">Placed: ${createdAt}</div></div>
                    <div style="text-align:right"> <div style="font-weight:700">Total: $${(order.total || 0).toFixed(2)}</div> <div style="margin-top:6px;"><span style="padding:6px 10px;border-radius:14px;background:${status === 'Delivered' ? '#d4edda' : status === 'Processing' ? '#e2e3e5' : '#fff3cd'};font-weight:600;">${status}</span></div></div>
                </div>

                <hr style="margin:12px 0;" />

                <h4 style="margin:8px 0;">Shipping Information</h4>
                <div class="order-item-row"><div class="order-label">Name</div><div class="order-value">${ship.fullName || ship.name || 'N/A'}</div></div>
                <div class="order-item-row"><div class="order-label">Email</div><div class="order-value">${ship.email || order.email || 'N/A'}</div></div>
                <div class="order-item-row"><div class="order-label">Phone</div><div class="order-value">${ship.phone || 'N/A'}</div></div>
                <div class="order-item-row"><div class="order-label">Address</div><div class="order-value">${ship.address || ship.line1 || 'N/A'} ${ship.city ? ', ' + ship.city : ''} ${ship.postalCode ? ', ' + ship.postalCode : ''} ${ship.country ? ', ' + ship.country : ''}</div></div>

                <h4 style="margin:12px 0 8px;">Items (${order.items ? order.items.length : 0})</h4>
                <div class="order-items">
                    ${itemsHtml}
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:12px;flex-wrap:wrap;">
                    <div style="color:var(--dark-gray);font-size:13px;">Payment: ${payment}</div>
                    <div style="display:flex;gap:8px;">${modalActions}<button class="action-btn" onclick="document.getElementById('orderModalBackdrop').classList.remove('active')" style="background:#ffffff;border:1px solid #ddd;">Close</button></div>
                </div>

                ${updatedAt ? `<div style="margin-top:10px;color:var(--dark-gray);font-size:12px;">Last updated: ${updatedAt}</div>` : ''}
            </div>
        `;

    } catch (error) {
        console.error('Error loading order details:', error);
        body.innerHTML = `<p style="color:#dc3545;">Error loading order: ${error.message}</p>`;
    }
}

async function loadAnalytics() {
    try {
        const productsSnapshot = await db.collection('products').get();
        document.getElementById('totalProducts').textContent = productsSnapshot.size;

        const ordersSnapshot = await db.collection('orders').get();
        let totalRevenue = 0;
        let pendingCount = 0;
        let lowStockCount = 0;
        const revenueData = {};
        const categoryData = {};

        productsSnapshot.forEach(doc => {
            const p = doc.data();
            if (p.stock !== undefined && p.stock <= 5) {
                lowStockCount++;
            }
        });

        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            totalRevenue += order.total || 0;
            if (order.status === 'Pending' || !order.status) {
                pendingCount++;
            }

            // Data for Revenue Chart (by date)
            if (order.createdAt) {
                const date = order.createdAt.toDate().toLocaleDateString();
                revenueData[date] = (revenueData[date] || 0) + (order.total || 0);
            }

            // Data for Category Chart
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const cat = item.category || 'Other';
                    categoryData[cat] = (categoryData[cat] || 0) + (item.qty || item.quantity || 1);
                });
            }
        });

        document.getElementById('totalOrdersCount').textContent = ordersSnapshot.size;
        document.getElementById('totalRevenue').textContent = '$' + totalRevenue.toFixed(2);
        document.getElementById('pendingOrders').textContent = pendingCount;

        // Add Low Stock count update if element exists
        const lowStockEl = document.getElementById('lowStockCount');
        if (lowStockEl) lowStockEl.textContent = lowStockCount;

        renderCharts(revenueData, categoryData);
        await loadRecentActivity();

    } catch (error) {
        console.error("Error loading analytics:", error);
    }
}

let revenueChart = null;
let categoryChart = null;

function renderCharts(revenueData, categoryData) {
    const revCtx = document.getElementById('revenueChart');
    const catCtx = document.getElementById('categoryChart');
    if (!revCtx || !catCtx) return;

    if (revenueChart) revenueChart.destroy();
    if (categoryChart) categoryChart.destroy();

    const dates = Object.keys(revenueData).sort((a, b) => new Date(a) - new Date(b));
    const revenues = dates.map(d => revenueData[d]);

    revenueChart = new Chart(revCtx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Revenue (EGP)',
                data: revenues,
                borderColor: '#8B7355',
                backgroundColor: 'rgba(139, 115, 85, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    const categories = Object.keys(categoryData);
    const counts = categories.map(c => categoryData[c]);

    categoryChart = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: counts,
                backgroundColor: [
                    '#8B7355', '#2c3e50', '#7f8c8d', '#95a5a6', '#dcdde1'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

async function loadRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    if (!recentActivity) return;

    try {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(5).get();

        if (snapshot.empty) {
            recentActivity.innerHTML = '<p style="text-align: center; color: var(--dark-gray);">No recent activity</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const order = doc.data();
            const createdAt = order.createdAt
                ? new Date(order.createdAt.toDate()).toLocaleString()
                : 'N/A';

            html += `
                <div style="padding: 10px; border-bottom: 1px solid #eee; font-size: 14px;">
                    <strong>${order.shippingAddress?.fullName || 'Unknown'}</strong> placed order for <strong>$${order.total ? order.total.toFixed(2) : '0.00'}</strong>
                    <div style="color: var(--dark-gray); font-size: 12px;">${createdAt}</div>
                </div>
            `;
        });

        recentActivity.innerHTML = html;

    } catch (error) {
        console.error("Error loading recent activity:", error);
        recentActivity.innerHTML = `<div style="color: #dc3545;">Error loading activity: ${error.message}</div>`;
    }
}

function refreshProductDisplays() {
    console.log("Refreshing all product displays");
    loadProducts();
    loadOrders();
    loadAnalytics();
    updateCurrentData();
}

document.addEventListener('DOMContentLoaded', initAdminPage);

window.loadProducts = loadProducts;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.testLocalStorage = testLocalStorage;
window.testProductArray = testProductArray;
window.testOrdersArray = testOrdersArray;
window.clearAllData = clearAllData;
window.loadOrders = loadOrders;
window.loadAnalytics = loadAnalytics;
window.refreshProductDisplays = refreshProductDisplays;
window.migrateReviews = async () => {
    if (!await showConfirm('This will mark all reviews WITHOUT a status as "approved". Continue?')) return;
    try {
        const snapshot = await db.collection('reviews').get();
        let count = 0;
        const batch = db.batch();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.status) {
                batch.update(doc.ref, { status: 'approved', approved: true });
                count++;
            }
        });
        if (count > 0) {
            await batch.commit();
            if (typeof showToast === 'function') showToast(`Successfully migrated ${count} reviews.`, 'success'); else showTempMessage && showTempMessage(`Successfully migrated ${count} reviews.`);
        } else {
            if (typeof showToast === 'function') showToast('No reviews needed migration.', 'info'); else showTempMessage && showTempMessage('No reviews needed migration.');
        }
    } catch (err) {
        console.error('Migration error:', err);
        if (typeof showToast === 'function') showToast('Migration failed: ' + err.message, 'error'); else showTempMessage && showTempMessage('Migration failed: ' + err.message);
    }
};
window.updateOrderStatus = updateOrderStatus;
window.showOrderDetails = showOrderDetails;

document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeOrderModal');
    const backdrop = document.getElementById('orderModalBackdrop');
    if (closeBtn && backdrop) {
        closeBtn.addEventListener('click', () => backdrop.classList.remove('active'));
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) backdrop.classList.remove('active');
        });
    }
});

let currentSupportMessage = null;

async function setupSupportSection() {
    console.log("Setting up support section...");

    const supportBtn = document.querySelector('[data-section="support"]');
    if (supportBtn) {
        supportBtn.addEventListener('click', loadSupportMessages);
    }

    const searchInput = document.getElementById('supportSearch');
    const filterSelect = document.getElementById('supportFilter');

    if (searchInput) searchInput.addEventListener('input', filterSupportMessages);
    if (filterSelect) filterSelect.addEventListener('change', filterSupportMessages);

    loadSupportMessages();
}

async function loadSupportMessages() {
    try {
        const messagesList = document.getElementById('supportMessagesList');
        if (!messagesList) {
            console.log("Support messages list element not found");
            return;
        }

        messagesList.innerHTML = '<p style="color: var(--dark-gray); text-align: center; padding: 40px;">Loading...</p>';

        if (typeof db === 'undefined') {
            console.error("Database not initialized");
            messagesList.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 40px;">Database not initialized</p>';
            return;
        }

        console.log("Querying support messages...");
        const messagesSnapshot = await db.collection('supportMessages').orderBy('timestamp', 'desc').get();
        console.log("Got snapshot:", messagesSnapshot.size, "documents");

        if (messagesSnapshot.empty) {
            console.log("No support messages found");
            messagesList.innerHTML = '<p style="color: var(--dark-gray); text-align: center; padding: 40px;">No messages yet</p>';
            return;
        }

        const messages = [];
        messagesSnapshot.forEach(doc => {
            messages.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log("Loaded messages:", messages.length);

        messagesList.innerHTML = '';
        messages.forEach(message => {
            const timestamp = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleString() : 'Unknown time';
            const status = message.status || 'new';
            const statusColor = status === 'new' ? '#e74c3c' : status === 'replied' ? '#27ae60' : '#95a5a6';

            const messageElement = document.createElement('div');
            messageElement.style.cssText = `
                background: white;
                border: 2px solid ${statusColor};
                border-left: 5px solid ${statusColor};
                padding: 20px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
            `;
            messageElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 15px;">
                    <div style="flex: 1;">
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                            <strong style="color: var(--black);">${escapeHtml(message.email || 'Anonymous')}</strong>
                            <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; text-transform: capitalize;">${status}</span>
                        </div>
                        <p style="margin: 5px 0; color: var(--dark-gray);">${escapeHtml(message.message.substring(0, 100))}${message.message.length > 100 ? '...' : ''}</p>
                        <small style="color: #999;">${timestamp}</small>
                    </div>
                    <button onclick="deleteSupportMessage('${message.id}')" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 18px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            messageElement.addEventListener('click', () => showSupportMessageDetail(message));
            messagesList.appendChild(messageElement);
        });

    } catch (error) {
        console.error('Error loading support messages:', error);
        const messagesList = document.getElementById('supportMessagesList');
        if (messagesList) {
            messagesList.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 40px;">Error: ' + error.message + '</p>';
        }
    }
}

function showSupportMessageDetail(message) {
    currentSupportMessage = message;
    const modal = document.getElementById('supportMessageModal');
    const detail = document.getElementById('supportMessageDetail');

    const timestamp = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleString() : 'Unknown time';
    const status = message.status || 'new';

    detail.innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong style="color: var(--black); font-size: 16px;">From:</strong> ${escapeHtml(message.email || 'Anonymous')}
        </div>
        <div style="margin-bottom: 20px;">
            <strong style="color: var(--black); font-size: 16px;">Phone:</strong> <a href="tel:${escapeHtml(message.phone || 'N/A')}" style="color: #0066cc; text-decoration: none;">${escapeHtml(message.phone || 'Not provided')}</a>
        </div>
        <div style="margin-bottom: 20px;">
            <strong style="color: var(--black); font-size: 16px;">Date:</strong> ${timestamp}
        </div>
        <div style="margin-bottom: 20px;">
            <strong style="color: var(--black); font-size: 16px;">Status:</strong> <span style="text-transform: capitalize;">${status}</span>
        </div>
        <div style="margin-bottom: 20px;">
            <strong style="color: var(--black); font-size: 16px;">Message:</strong>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 10px; white-space: pre-wrap; word-break: break-word;">
                ${escapeHtml(message.message)}
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeSupportModal() {
    document.getElementById('supportMessageModal').style.display = 'none';
    currentSupportMessage = null;
}

async function markAsRead() {
    if (!currentSupportMessage) return;

    try {
        await db.collection('supportMessages').doc(currentSupportMessage.id).update({
            status: 'read'
        });
        closeSupportModal();
        loadSupportMessages();
    } catch (error) {
        console.error('Error marking message as read:', error);
        if (typeof showToast === 'function') showToast('Error updating message status', 'error'); else showTempMessage && showTempMessage('Error updating message status');
    }
}

async function deleteSupportMessage(messageId) {
    if (!await showConfirm('Are you sure you want to delete this message?')) return;

    try {
        await db.collection('supportMessages').doc(messageId).delete();
        closeSupportModal();
        loadSupportMessages();
    } catch (error) {
        console.error('Error deleting message:', error);
        if (typeof showToast === 'function') showToast('Error deleting message', 'error'); else showTempMessage && showTempMessage('Error deleting message');
    }
}

function deleteMessage() {
    if (!currentSupportMessage) return;
    deleteSupportMessage(currentSupportMessage.id);
}

function filterSupportMessages() {
    const searchTerm = document.getElementById('supportSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('supportFilter')?.value || '';

    const messages = document.getElementById('supportMessagesList')?.querySelectorAll('[style*="background: white"]') || [];

    messages.forEach(message => {
        const text = message.textContent.toLowerCase();
        const status = message.querySelector('span')?.textContent.toLowerCase() || '';

        const matchesSearch = text.includes(searchTerm);
        const matchesStatus = !statusFilter || status.includes(statusFilter);

        message.style.display = matchesSearch && matchesStatus ? 'block' : 'none';
    });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
function setupPromosSection() {
    const form = document.getElementById('addPromoForm');
    const promosList = document.getElementById('promosList');
    const message = document.getElementById('promoMessage');

    async function loadPromos() {
        if (!promosList) return;
        promosList.innerHTML = '<p style="text-align: center; color: var(--dark-gray); padding: 20px;">Loading promo codes...</p>';
        try {
            const snapshot = await db.collection('promoCodes').orderBy('createdAt', 'desc').get();
            if (snapshot.empty) {
                promosList.innerHTML = '<p style="text-align: center; color: var(--dark-gray); padding: 20px;">No active promo codes.</p>';
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const promo = doc.data();
                const id = doc.id;
                const expiry = promo.expiry ? new Date(promo.expiry).toLocaleDateString() : 'No expiry';
                const isExpired = promo.expiry && new Date(promo.expiry) < new Date();

                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; background: ${isExpired ? '#fff5f5' : 'var(--light-beige)'};">
                        <div>
                            <strong style="font-size: 16px; color: var(--black);">${promo.code}</strong>
                            <div style="font-size: 13px; color: var(--dark-gray);">
                                ${promo.type === 'percentage' ? promo.value + '%' : promo.value + ' EGP'} OFF
                                <br>Expires: ${expiry} ${isExpired ? '<span style="color: #e74c3c; font-weight: bold;">(EXPIRED)</span>' : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                           <button onclick="deletePromo('${id}', '${promo.code}')" class="btn" style="background: #e74c3c; color: white; padding: 8px 15px; font-size: 12px; border-radius: 6px;">
                               <i class="fas fa-trash"></i>
                           </button>
                        </div>
                    </div>
                `;
            });
            promosList.innerHTML = html;
        } catch (err) {
            console.error('Error loading promos:', err);
            promosList.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 10px;">Error loading promo codes.</p>';
        }
    }

    window.deletePromo = async (id, code) => {
        if (!await showConfirm(`Delete promo code "${code}"?`)) return;
        try {
            await db.collection('promoCodes').doc(id).delete();
            loadPromos();
        } catch (err) {
            console.error('Error deleting promo:', err);
            if (typeof showToast === 'function') showToast('Error deleting promo code', 'error'); else showTempMessage && showTempMessage('Error deleting promo code');
        }
    };

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const codeInput = document.getElementById('promoCode');
            const code = codeInput.value.trim().toUpperCase();
            const type = document.getElementById('promoType').value;
            const value = parseFloat(document.getElementById('promoValue').value);
            const expiry = document.getElementById('promoExpiry').value;

            if (!code || isNaN(value) || !expiry) return;

            const btn = document.getElementById('createPromoBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

            try {
                const existing = await db.collection('promoCodes').where('code', '==', code).get();
                if (!existing.empty) {
                    showMessage(message, '❌ Promo code already exists!', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-plus"></i> Create Promo Code';
                    return;
                }

                await db.collection('promoCodes').add({
                    code,
                    type,
                    value,
                    expiry,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                showMessage(message, '✓ Promo code created!', 'success');
                form.reset();
                loadPromos();
            } catch (err) {
                console.error('Error creating promo:', err);
                showMessage(message, '❌ Error creating promo code', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-plus"></i> Create Promo Code';
                setTimeout(() => { if (message) message.style.display = 'none'; }, 3000);
            }
        };
    }

    loadPromos();
}

/* Hero banner admin removed — function deleted by request */

function setupReviewsSection() {
    const listContainer = document.getElementById('pendingReviewsList');
    if (!listContainer) return;

    async function loadPendingReviews() {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--dark-gray); padding: 20px;">Loading reviews...</p>';
        try {
            const snapshot = await db.collection('reviews')
                .where('status', '==', 'pending')
                .get();

            if (snapshot.empty) {
                listContainer.innerHTML = '<p style="text-align: center; color: var(--dark-gray); padding: 40px;">No pending reviews at the moment.</p>';
                return;
            }

            // Sort in memory to avoid needing a composite index
            const reviews = [];
            snapshot.forEach(doc => {
                reviews.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort by createdAt descending (newest first)
            reviews.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            });

            let html = '';
            reviews.forEach(review => {
                const date = review.createdAt ? new Date(review.createdAt.toDate()).toLocaleString() : 'N/A';

                html += `
                    <div class="review-moderation-item" style="background: #fdfdfd; padding: 20px; border-radius: 10px; border: 1px solid #eee; display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <strong style="color: var(--black); font-size: 16px;">${review.userName}</strong>
                                <span style="color: var(--dark-gray); font-size: 13px; margin-left: 10px;">${date}</span>
                                <div style="color: #666; font-size: 13px; margin-top: 4px;">Product ID: ${review.productId}</div>
                            </div>
                            <div style="color: #ffc107;">
                                ${Array(5).fill(0).map((_, i) => `<i class="${i < review.rating ? 'fas' : 'far'} fa-star"></i>`).join('')}
                            </div>
                        </div>
                        <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 10px 0; font-style: italic;">"${review.comment}"</p>
                        <div style="display: flex; gap: 10px; margin-top: 5px;">
                            <button onclick="approveReview('${review.id}')" style="background: #2ecc71; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: 600; flex: 1; transition: opacity 0.3s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button onclick="deleteReview('${review.id}')" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: 600; flex: 1; transition: opacity 0.3s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `;
            });
            listContainer.innerHTML = html;

        } catch (err) {
            console.error('Error loading pending reviews:', err);
            listContainer.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Error: ${err.message}</p>`;
        }
    }

    window.approveReview = async (reviewId) => {
        if (!await showConfirm('Are you sure you want to approve this review?')) return;
        try {
            await db.collection('reviews').doc(reviewId).update({
                status: 'approved',
                approved: true
            });
            if (typeof showToast === 'function') showToast('Review approved successfully!', 'success'); else showTempMessage && showTempMessage('Review approved successfully!');
            loadPendingReviews();
        } catch (err) {
            console.error('Error approving review:', err);
            if (typeof showToast === 'function') showToast('Failed to approve review.', 'error'); else showTempMessage && showTempMessage('Failed to approve review.');
        }
    };

    window.deleteReview = async (reviewId) => {
        if (!await showConfirm('Are you sure you want to delete this review?')) return;
        try {
            await db.collection('reviews').doc(reviewId).delete();
            if (typeof showToast === 'function') showToast('Review deleted.', 'success'); else showTempMessage && showTempMessage('Review deleted.');
            loadPendingReviews();
        } catch (err) {
            console.error('Error deleting review:', err);
            if (typeof showToast === 'function') showToast('Failed to delete review.', 'error'); else showTempMessage && showTempMessage('Failed to delete review.');
        }
    };

    // Load when section becomes active
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.section === 'reviews') {
                loadPendingReviews();
            }
        });
    });
}
