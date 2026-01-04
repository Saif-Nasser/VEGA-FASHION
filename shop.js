
let allProducts = [];



document.addEventListener('DOMContentLoaded', async () => {
    await waitForProducts();

    renderAllProducts();
});

function waitForProducts() {
    return new Promise((resolve) => {

        const copyProducts = () => {
            if (typeof products !== 'undefined' && products.length > 0) {
                allProducts = [...products];
                return true;
            }
            return false;
        };

        if (copyProducts()) {
            resolve();
            return;
        }

        const onProductsLoaded = () => {
            if (copyProducts()) {
                document.removeEventListener('productsLoaded', onProductsLoaded);
                clearInterval(checkProducts);
                clearTimeout(timeoutHandle);
                resolve();
            }
        };

        document.addEventListener('productsLoaded', onProductsLoaded);
        const checkProducts = setInterval(() => {
            if (copyProducts()) {
                document.removeEventListener('productsLoaded', onProductsLoaded);
                clearInterval(checkProducts);
                clearTimeout(timeoutHandle);
                resolve();
            }
        }, 50);

        const timeoutHandle = setTimeout(() => {
            clearInterval(checkProducts);
            document.removeEventListener('productsLoaded', onProductsLoaded);

            if (copyProducts()) {
                resolve();
            } else {
                console.warn("⚠️ Products not loaded after 15 seconds.");
                console.warn("   Possible causes:");
                console.warn("   1. Firestore 'products' collection is empty");
                console.warn("   2. Firestore authentication/permissions issue");
                console.warn("   3. Firestore connection timeout");
                console.warn("   Check browser console for more details.");
                allProducts = [];
                resolve();
            }
        }, 15000);
    });
}

let currentPage = 1;
const productsPerPage = 6;

function renderAllProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) {
        console.error("❌ Products grid not found!");
        return;
    }

    productsGrid.innerHTML = '';

    if (allProducts.length === 0) {
        productsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-search" style="font-size: 64px; color: #ddd; margin-bottom: 20px;"></i>
                <h3 style="margin: 0 0 10px 0; color: #666;">No Products Found</h3>
                <p style="margin: 0; color: #999;">Please check back later</p>
            </div>
        `;
        return;
    }

    const totalPages = Math.ceil(allProducts.length / productsPerPage);
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const productsToShow = allProducts.slice(startIndex, endIndex);

    productsToShow.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });



    updatePaginationControls(currentPage, totalPages);

    setupPaginationListeners(totalPages);

    console.log(`✅ Rendered ${productsToShow.length} products (page ${currentPage} of ${totalPages})`);
}

function updatePaginationControls(current, total) {
    const prevButton = document.querySelector('.pagination-btn.prev');
    const nextButton = document.querySelector('.pagination-btn.next');

    if (prevButton) {
        prevButton.disabled = current <= 1;
    }
    if (nextButton) {
        nextButton.disabled = current >= total;
    }

    generatePageNumbers(current, total);
}

function generatePageNumbers(currentPageNum, totalPages) {
    const pageNumbersContainer = document.querySelector('.page-numbers');
    if (!pageNumbersContainer) return;

    pageNumbersContainer.innerHTML = '';

    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.className = 'page-number' + (i === currentPageNum ? ' active' : '');
            button.textContent = i;
            button.addEventListener('click', () => {
                currentPage = i;
                renderAllProducts();
                scrollToTop();
            });
            pageNumbersContainer.appendChild(button);
        }
    } else {

        for (let i = 1; i <= Math.min(3, totalPages); i++) {
            const button = document.createElement('button');
            button.className = 'page-number' + (i === currentPageNum ? ' active' : '');
            button.textContent = i;
            button.addEventListener('click', () => {
                currentPage = i;
                renderAllProducts();
                scrollToTop();
            });
            pageNumbersContainer.appendChild(button);
        }

        if (totalPages > 4) {
            const dots = document.createElement('span');
            dots.className = 'page-dots';
            dots.textContent = '...';
            pageNumbersContainer.appendChild(dots);
        }

        const lastButton = document.createElement('button');
        lastButton.className = 'page-number' + (totalPages === currentPageNum ? ' active' : '');
        lastButton.textContent = totalPages;
        lastButton.addEventListener('click', () => {
            currentPage = totalPages;
            renderAllProducts();
            scrollToTop();
        });
        pageNumbersContainer.appendChild(lastButton);
    }
}

function setupPaginationListeners(totalPages) {
    const prevButton = document.querySelector('.pagination-btn.prev');
    const nextButton = document.querySelector('.pagination-btn.next');

    if (prevButton) {
        const newPrevButton = prevButton.cloneNode(true);
        prevButton.parentNode.replaceChild(newPrevButton, prevButton);
        newPrevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderAllProducts();
                scrollToTop();
            }
        });
    }

    if (nextButton) {
        const newNextButton = nextButton.cloneNode(true);
        nextButton.parentNode.replaceChild(newNextButton, nextButton);
        newNextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderAllProducts();
                scrollToTop();
            }
        });
    }
}

function scrollToTop() {
    const shopContent = document.querySelector('.shop-content');
    if (shopContent) {
        shopContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        ? `<button class="notify-me-btn" data-id="${product.id}" onclick="window.handleNotifyMe('${product.id}', '${safeName}')" style="background-color: var(--black); color: white; border: none; padding: 14px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; margin-top: 15px;">Notify Me</button>`
        : `<button class="add-to-cart" data-id="${product.id}">Add to Cart</button>`;

    card.innerHTML = `
        <div class="product-image-container ${isOutOfStock ? 'out-of-stock-image' : ''}">
            <img src="${safeImage}" alt="${safeName}" class="product-img"
                 onerror="this.src='https://images.unsplash.com/photo-1539008835657-9e8e9680c956?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'">
            ${newBadge}
            ${soldOutBadge}
            <button class="wishlist-btn" data-id="${product.id}" title="Add to Wishlist">
                <i class="fas fa-heart"></i>
            </button>
            <div class="product-overlay" onclick="window.openProductModal('${product.id}')" style="position: absolute; top:0; left:0; width:100%; height:100%; cursor: pointer; z-index: 1;"></div>
        </div>
        <div class="product-info ${isOutOfStock ? 'out-of-stock' : ''}">
            <h3 class="product-title">${safeName}</h3>
            <p class="product-category">${safeCategory}</p>
            <p class="product-price">${safePrice} EGP</p>
            ${addToCartButtonHTML}
        </div>
    `;

    const addToCartBtn = card.querySelector('.add-to-cart');
    if (!isOutOfStock && typeof window.addToCart === 'function' && addToCartBtn) {
        addToCartBtn.addEventListener('click', function () {

            this.classList.add('ripple');

            this.classList.add('clicked');

            window.addToCart(product);

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
        wishlistBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const productId = this.dataset.id;

            this.classList.add('heart-beat');

            if (typeof window.addToWishlist === 'function') {
                window.addToWishlist(productId);
            }

            setTimeout(() => {
                this.classList.remove('heart-beat');
            }, 600);
        });
    }

    return card;
}

console.log("✅ Shop.js loaded");

async function openProductModal(productId) {
    console.log("Opening modal for product:", productId);
    const backdrop = document.getElementById('productModalBackdrop');
    if (!backdrop) return;

    try {
        const doc = await db.collection('products').doc(productId).get();
        if (!doc.exists) {
            console.error("Product not found in Firestore:", productId);
            return;
        }

        const product = doc.data();
        product.id = doc.id;

        // Populate Modal Fields with Fallbacks
        const headerTitle = document.getElementById('modalProductName');
        const bodyTitle = document.getElementById('modalProductTitle');
        const categoryLabel = document.getElementById('modalProductCategory');
        const priceLabel = document.getElementById('modalProductPrice');
        const descLabel = document.getElementById('modalProductDescription');
        const productImg = document.getElementById('modalProductImg');

        if (headerTitle) headerTitle.textContent = product.name || 'Product Details';
        if (bodyTitle) bodyTitle.textContent = product.name || 'Unnamed Product';
        if (categoryLabel) categoryLabel.textContent = product.category || 'Collection';
        if (priceLabel) priceLabel.textContent = `${(product.price || 0).toFixed(2)} EGP`;
        if (descLabel) descLabel.textContent = product.description || 'No description available for this item.';
        if (productImg) {
            productImg.src = (typeof normalizeImageUrl === 'function') ? normalizeImageUrl(product.image) : (product.image || 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80');
            productImg.alt = product.name || 'Product Image';
        }

        // Store productId for review submission
        const addToCartBtn = document.getElementById('modalAddToCartBtn');
        if (addToCartBtn) {
            addToCartBtn.dataset.productId = productId;
            addToCartBtn.onclick = () => {
                window.addToCart(product);
                addToCartBtn.textContent = '✓ Added to Cart';
                setTimeout(() => addToCartBtn.innerHTML = '<i class="fas fa-shopping-bag"></i> Add to Cart', 2000);
            };
        }

        const sizesContainer = document.getElementById('modalProductSizes');
        if (sizesContainer) {
            sizesContainer.innerHTML = '';
            const sizes = product.sizes || ['S', 'M', 'L']; // Default sizes if none defined
            sizes.forEach(size => {
                const span = document.createElement('span');
                span.className = 'size-visual';
                span.textContent = size;
                span.style.cursor = 'pointer';
                span.onclick = () => {
                    sizesContainer.querySelectorAll('.size-visual').forEach(s => s.classList.remove('active'));
                    span.classList.add('active');
                    product.selectedSize = size;
                };
                sizesContainer.appendChild(span);
            });
            // Select first size by default
            if (sizesContainer.firstChild) sizesContainer.firstChild.click();
        }

        backdrop.classList.add('active');
        document.body.classList.add('modal-open');

        // Ensure product modal isn't in image-view for a normal product open
        const productModalEl = document.getElementById('productModal');
        if (productModalEl) {
            productModalEl.classList.remove('image-view');
        }

        // Log computed sizes to help visual verification in browser console
        setTimeout(() => {
            try {
                const imgContainer = document.querySelector('#productModal .product-modal-image');
                const productImgEl = document.getElementById('modalProductImg');
                console.log('Modal open (normal) sizes -> container:', imgContainer ? imgContainer.clientHeight : 'n/a', 'img:', productImgEl ? productImgEl.clientHeight : 'n/a');
            } catch (e) {
                console.warn('Error measuring modal image size:', e);
            }
        }, 60);

        // Load Reviews
        loadReviews(productId);

        // Setup Review Form visibility
        const user = firebase.auth().currentUser;
        const writeSection = document.getElementById('writeReviewSection');
        const loginMsg = document.getElementById('loginToReviewMsg');

        if (user) {
            if (writeSection) writeSection.style.display = 'block';
            if (loginMsg) loginMsg.style.display = 'none';
        } else {
            if (writeSection) writeSection.style.display = 'none';
            if (loginMsg) loginMsg.style.display = 'block';
        }

    } catch (error) {
        console.error("Error opening product modal:", error);
    }
}

// Open an arbitrary image inside the product modal as a lightweight image viewer
function openImageInProductModal(url, title = '') {
    try {
        const backdrop = document.getElementById('productModalBackdrop');
        const productImg = document.getElementById('modalProductImg');
        const headerTitle = document.getElementById('modalProductName');
        const bodyTitle = document.getElementById('modalProductTitle');
        const categoryLabel = document.getElementById('modalProductCategory');
        const priceLabel = document.getElementById('modalProductPrice');
        const descLabel = document.getElementById('modalProductDescription');
        const sizesContainer = document.getElementById('modalProductSizes');
        const addToCartBtn = document.getElementById('modalAddToCartBtn');
        const writeSection = document.getElementById('writeReviewSection');
        const loginMsg = document.getElementById('loginToReviewMsg');

        if (productImg) {
            productImg.src = url;
            productImg.alt = title || 'Image';
        }
        if (headerTitle) headerTitle.textContent = title || '';
        if (bodyTitle) bodyTitle.textContent = title || '';
        if (categoryLabel) categoryLabel.textContent = '';
        if (priceLabel) priceLabel.textContent = '';
        if (descLabel) descLabel.textContent = '';

        if (sizesContainer) sizesContainer.innerHTML = '';
        if (addToCartBtn) addToCartBtn.style.display = 'none';
        if (writeSection) writeSection.style.display = 'none';
        if (loginMsg) loginMsg.style.display = 'none';

        backdrop.classList.add('active');
        document.body.classList.add('modal-open');
        const productModalEl = document.getElementById('productModal');
        if (productModalEl) {
            productModalEl.classList.add('image-view');
        }

        // Log computed sizes to help visual verification in browser console
        setTimeout(() => {
            try {
                const imgContainer = document.querySelector('#productModal .product-modal-image');
                const productImgEl = document.getElementById('modalProductImg');
                console.log('Modal open (image-view) sizes -> container:', imgContainer ? imgContainer.clientHeight : 'n/a', 'img:', productImgEl ? productImgEl.clientHeight : 'n/a');
            } catch (e) {
                console.warn('Error measuring modal image size:', e);
            }
        }, 60);
    } catch (err) {
        console.error('Error opening image in product modal:', err);
    }
}

window.openImageInProductModal = openImageInProductModal;

async function loadReviews(productId) {
    const reviewsList = document.getElementById('reviewsList');
    try {
        const snapshot = await db.collection('reviews')
            .where('productId', '==', productId)
            .where('status', '==', 'approved')
            .get();

        if (snapshot.empty) {
            reviewsList.innerHTML = '<p style="color: var(--dark-gray);">No reviews yet. Be the first to review!</p>';
            document.getElementById('modalAverageRating').textContent = '0.0';
            document.getElementById('modalReviewCount').textContent = '(0 reviews)';
            return;
        }

        // Collect reviews and sort in memory to avoid composite index requirement
        const reviews = [];
        let totalRating = 0;
        snapshot.forEach(doc => {
            const review = doc.data();
            reviews.push(review);
            totalRating += review.rating;
        });

        // Sort by createdAt descending (newest first)
        reviews.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        let html = '';
        reviews.forEach(review => {
            const date = review.createdAt ? new Date(review.createdAt.toDate()).toLocaleDateString() : 'N/A';

            html += `
                <div class="review-item" style="border-bottom: 1px solid #eee; padding: 15px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong style="color: var(--black);">${review.userName}</strong>
                        <span style="color: var(--dark-gray); font-size: 12px;">${date}</span>
                    </div>
                    <div style="color: #ffc107; margin-bottom: 10px;">
                        ${Array(5).fill(0).map((_, i) => `<i class="${i < review.rating ? 'fas' : 'far'} fa-star"></i>`).join('')}
                    </div>
                    <p style="color: #666; font-size: 14px; line-height: 1.5;">${review.comment}</p>
                </div>
            `;
        });

        reviewsList.innerHTML = html;
        const avg = (totalRating / reviews.length).toFixed(1);
        document.getElementById('modalAverageRating').textContent = avg;
        document.getElementById('modalReviewCount').textContent = `(${reviews.length} review${reviews.length !== 1 ? 's' : ''})`;

    } catch (error) {
        console.error("Error loading reviews:", error);
    }
}

// Global modal setup
document.addEventListener('DOMContentLoaded', () => {
    const backdrop = document.getElementById('productModalBackdrop');
    const closeBtn = document.getElementById('closeProductModal');

    if (closeBtn && backdrop) {
        const closeModal = () => {
            backdrop.classList.remove('active');
            document.body.classList.remove('modal-open');
            const productModalEl = document.getElementById('productModal');
            if (productModalEl) {
                productModalEl.classList.remove('image-view');
            }
        };
        closeBtn.onclick = closeModal;
        backdrop.onclick = (e) => {
            if (e.target === backdrop) closeModal();
        };
    }

    // Review Stars logic
    const stars = document.querySelectorAll('.rating-input i');
    stars.forEach(star => {
        star.onclick = function () {
            const val = parseInt(this.dataset.value);
            document.getElementById('reviewRating').value = val;
            stars.forEach((s, i) => {
                if (i < val) {
                    s.style.color = '#ffc107';
                } else {
                    s.style.color = '#ddd';
                }
            });
        };
    });

    // Review Form Submission
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.onsubmit = async (e) => {
            e.preventDefault();
            const user = firebase.auth().currentUser;
            if (!user) return;

            const productId = document.getElementById('modalAddToCartBtn').dataset.productId;
            const rating = parseInt(document.getElementById('reviewRating').value);
            const comment = document.getElementById('reviewComment').value.trim();

            if (!comment) return;

            try {
                const submitBtn = reviewForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Posting...';

                await db.collection('reviews').add({
                    productId: productId,
                    userId: user.uid,
                    userName: user.displayName || 'Anonymous',
                    rating: rating,
                    comment: comment,
                    status: 'pending',
                    approved: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                reviewForm.reset();
                stars.forEach(s => s.style.color = '#ddd');
                document.getElementById('reviewRating').value = 5;
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;

                if (typeof showToast === 'function') showToast("Thank you! Your review has been submitted and is awaiting moderation.", 'success'); else showTempMessage && showTempMessage("Thank you! Your review has been submitted and is awaiting moderation.");
                // We don't call loadReviews(productId) here because it's pending
            } catch (error) {
                console.error("Error posting review:", error);
                if (typeof showToast === 'function') showToast("Failed to post review. Please try again.", 'error'); else showTempMessage && showTempMessage("Failed to post review. Please try again.");
            }
        };
    }
});

window.openProductModal = openProductModal;

async function handleNotifyMe(productId, productName) {
    const user = firebase.auth().currentUser;
    let email = user ? user.email : null;

    if (!email) {
        email = prompt(`Please enter your email to be notified when "${productName}" is back in stock:`);
        if (!email || !email.includes('@')) {
            if (typeof showToast === 'function') showToast("Invalid email address.", 'error'); else showTempMessage && showTempMessage("Invalid email address.");
            return;
        }
    }

    try {
        // Check if already subscribed
        const existing = await db.collection('backInStockNotifications')
            .where('productId', '==', productId)
            .where('email', '==', email)
            .where('status', '==', 'pending')
            .get();

        if (!existing.empty) {
            if (typeof showToast === 'function') showToast("You are already signed up for notifications for this product!", 'info'); else showTempMessage && showTempMessage("You are already signed up for notifications for this product!");
            return;
        }

        await db.collection('backInStockNotifications').add({
            productId: productId,
            productName: productName,
            email: email,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (typeof showToast === 'function') showToast(`✓ Done! We'll notify you at ${email} as soon as "${productName}" is back in stock.`, 'success'); else showTempMessage && showTempMessage(`✓ Done! We'll notify you at ${email} as soon as "${productName}" is back in stock.`);
    } catch (error) {
        console.error("Error signing up for notification:", error);
        if (typeof showToast === 'function') showToast("Something went wrong. Please try again later.", 'error'); else showTempMessage && showTempMessage("Something went wrong. Please try again later.");
    }
}

window.handleNotifyMe = handleNotifyMe;
