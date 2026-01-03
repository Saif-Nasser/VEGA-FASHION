
let currentStep = 1;

window.addEventListener('load', initCheckout);

function addTestCart() {
    const cart = JSON.parse(localStorage.getItem('vegaCart')) || [];
    if (cart.length === 0) {
        const testCart = [
            {
                id: 'test1',
                name: 'Sample Dress',
                price: 89.99,
                quantity: 1,
                image: 'https://via.placeholder.com/100'
            },
            {
                id: 'test2',
                name: 'Sample Top',
                price: 49.99,
                quantity: 2,
                image: 'https://via.placeholder.com/100'
            }
        ];
        localStorage.setItem('vegaCart', JSON.stringify(testCart));
        console.log("Test cart added for demonstration");
    }
}

function initCheckout() {
    console.log("=== Checkout Page Initialized ===");

    loadOrderSummary();

    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const placeOrderBtn = document.getElementById('placeOrderBtn');

    console.log("Next Button:", nextBtn ? "Found" : "NOT FOUND");
    console.log("Prev Button:", prevBtn ? "Found" : "NOT FOUND");
    console.log("Place Order Button:", placeOrderBtn ? "Found" : "NOT FOUND");

    if (nextBtn) {
        nextBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log("Next clicked, current step:", currentStep);
            proceedToNextStep();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log("Previous clicked, current step:", currentStep);
            goToPreviousStep();
        });
    }

    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log("Place order clicked");
            completeOrder();
        });
    }

    showStep(1);
    setupPromoValidation();
    console.log("Checkout initialization complete");
}

let appliedPromo = null;

function setupPromoValidation() {
    const applyBtn = document.getElementById('applyPromoBtn');
    const removeBtn = document.getElementById('removePromoBtn');
    const promoInput = document.getElementById('promoCodeInput');
    const feedback = document.getElementById('promoFeedback');
    const promoInputGroup = document.getElementById('promoInputGroup');
    const appliedPromoInfo = document.getElementById('appliedPromoInfo');
    const appliedCodeText = document.getElementById('appliedCodeText');

    if (!applyBtn || !promoInput) return;

    applyBtn.addEventListener('click', async () => {
        const code = promoInput.value.trim().toUpperCase();
        if (!code) return;

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const snapshot = await db.collection('promoCodes').where('code', '==', code).get();

            if (snapshot.empty) {
                showPromoFeedback('Invalid promo code', 'error');
                resetPromo();
                return;
            }

            const promoData = snapshot.docs[0].data();
            const now = new Date();
            const expiry = new Date(promoData.expiry);

            if (now > expiry) {
                showPromoFeedback('This promo code has expired', 'error');
                resetPromo();
                return;
            }

            appliedPromo = { id: snapshot.docs[0].id, ...promoData };

            // UI Update
            promoInputGroup.style.display = 'none';
            appliedPromoInfo.style.display = 'flex';
            appliedCodeText.textContent = `${code} (${promoData.value}${promoData.type === 'percentage' ? '%' : ' EGP'} OFF)`;
            feedback.style.display = 'none';
            promoInput.value = '';

            const cart = JSON.parse(localStorage.getItem('vegaCart')) || [];
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            updateTotals(subtotal);

        } catch (err) {
            console.error('Error validating promo:', err);
            showPromoFeedback('Error applying promo code', 'error');
        } finally {
            applyBtn.disabled = false;
            applyBtn.textContent = 'Apply';
        }
    });

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            resetPromo();
            showPromoFeedback('Promo code removed', 'success');
            setTimeout(() => {
                feedback.style.display = 'none';
            }, 3000);
        });
    }

    function showPromoFeedback(msg, type) {
        if (!feedback) return;
        feedback.textContent = msg;
        feedback.style.color = type === 'success' ? '#27ae60' : '#e74c3c';
        feedback.style.display = 'block';
    }

    function resetPromo() {
        appliedPromo = null;
        if (promoInputGroup) promoInputGroup.style.display = 'flex';
        if (appliedPromoInfo) appliedPromoInfo.style.display = 'none';

        const cart = JSON.parse(localStorage.getItem('vegaCart')) || [];
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        updateTotals(subtotal);
    }
}

function getElValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function loadOrderSummary() {
    console.log("Loading order summary...");

    const cart = JSON.parse(localStorage.getItem('vegaCart')) || [];
    const orderItemsContainer = document.getElementById('orderItems');

    console.log("Cart items:", cart.length);

    if (!orderItemsContainer) {
        console.error("Order items container not found!");
        return;
    }

    if (cart.length === 0) {
        orderItemsContainer.innerHTML = `
            <p style="text-align: center; color: var(--dark-gray); padding: 20px;">
                Your cart is empty. <a href="index.html">Continue shopping</a>
            </p>
        `;
        updateTotals(0);
        return;
    }

    let itemsHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        itemsHTML += `
            <div class="order-item">
                <img src="${normalizeImageUrl(item.image)}" alt="${item.name}" loading="lazy" decoding="async" onerror="this.src='https://via.placeholder.com/60'">
                <div class="order-item-info">
                    <h4>${item.name}</h4>
                    <p>Qty: ${item.quantity}</p>
                </div>
                <div class="order-item-price">${itemTotal.toFixed(2)} EGP</div>
            </div>
        `;
    });

    orderItemsContainer.innerHTML = itemsHTML;
    updateTotals(subtotal);
    updateCartCount();
    console.log("Order summary loaded, subtotal:", subtotal);
}

function updateTotals(subtotal) {
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('finalTotal');
    const orderTotalsContainer = document.querySelector('.order-totals');

    if (subtotalEl) subtotalEl.textContent = `${subtotal.toFixed(2)} EGP`;

    let finalTotal = subtotal;

    // Remove old discount row if it exists
    const oldDiscountRow = document.getElementById('discountRow');
    if (oldDiscountRow) oldDiscountRow.remove();

    if (appliedPromo) {
        let discount = 0;
        if (appliedPromo.type === 'percentage') {
            discount = subtotal * (appliedPromo.value / 100);
        } else {
            discount = appliedPromo.value;
        }

        finalTotal = Math.max(0, subtotal - discount);

        const discountRow = document.createElement('div');
        discountRow.className = 'total-row';
        discountRow.id = 'discountRow';
        discountRow.style.color = '#27ae60';
        discountRow.style.fontWeight = '600';
        discountRow.innerHTML = `
            <span>Discount (${appliedPromo.code})</span>
            <span>-${discount.toFixed(2)} EGP</span>
        `;

        // Insert before final total
        const finalRow = document.querySelector('.total-row.final');
        if (finalRow) {
            finalRow.parentNode.insertBefore(discountRow, finalRow);
        }
    }

    if (totalEl) totalEl.textContent = `${finalTotal.toFixed(2)} EGP`;
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('vegaCart')) || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.querySelector('.cart-count');
    if (cartCountEl) cartCountEl.textContent = count;
}

function proceedToNextStep() {
    console.log("Validating step", currentStep);

    if (currentStep === 1) {

        const firstName = document.getElementById('firstName');
        const lastName = document.getElementById('lastName');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const address = document.getElementById('address');
        const city = document.getElementById('city');

        if (!firstName || !lastName || !email || !phone || !address || !city) {
            console.error("Form fields not found");
            return;
        }

        const fNameVal = firstName.value.trim();
        const lNameVal = lastName.value.trim();
        const emailVal = email.value.trim();
        const phoneVal = phone.value.trim();
        const addressVal = address.value.trim();
        const cityVal = city.value.trim();

        if (!fNameVal || !lNameVal || !emailVal || !phoneVal || !addressVal || !cityVal) {
            showTempMessage && showTempMessage('Please fill in all required fields in Step 1');
            console.warn("Missing required fields");
            return;
        }

        if (!emailVal.includes('@')) {
            showTempMessage && showTempMessage('Please enter a valid email address');
            return;
        }

        console.log("Step 1 validation passed");
    } else if (currentStep === 2) {

        console.log("Step 2 validation passed");
    }

    if (currentStep < 3) {
        currentStep++;
        showStep(currentStep);
    }
}

function goToPreviousStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function showStep(stepNumber) {
    console.log("Showing step:", stepNumber);

    const sections = document.querySelectorAll('.checkout-section');
    console.log("Total sections found:", sections.length);

    sections.forEach(section => {
        section.classList.remove('active');
    });

    const currentSection = document.querySelector(`.checkout-section[data-section="${stepNumber}"]`);
    if (currentSection) {
        currentSection.classList.add('active');
        console.log("Step", stepNumber, "section activated");
    } else {
        console.error("Section not found for step", stepNumber);
    }

    const steps = document.querySelectorAll('.checkout-step');
    steps.forEach((step, index) => {
        if (index + 1 <= stepNumber) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const placeOrderBtn = document.getElementById('placeOrderBtn');

    if (prevBtn) prevBtn.style.display = stepNumber > 1 ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = stepNumber < 3 ? 'flex' : 'none';
    if (placeOrderBtn) placeOrderBtn.style.display = stepNumber === 3 ? 'flex' : 'none';

    console.log("Buttons updated - Step:", stepNumber);

    if (stepNumber === 3) {
        showConfirmation();

        applyGuestCheckoutRestrictions();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyGuestCheckoutRestrictions() {
    try {
        const isGuest = localStorage.getItem('vegaGuest') === 'true';
        const isUser = !!localStorage.getItem('vegaUser');
        const placeOrderBtn = document.getElementById('placeOrderBtn');

        if (!placeOrderBtn) return;

        if (isGuest && !isUser) {

            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = '<i class="fas fa-lock"></i> Login to complete purchase';
            placeOrderBtn.style.opacity = '0.6';
            placeOrderBtn.style.cursor = 'not-allowed';

            placeOrderBtn.removeEventListener('click', completeOrder);
            placeOrderBtn.addEventListener('click', function (e) {
                e.preventDefault();
                window.location.href = 'login.html?redirect=checkout';
            });
        } else {

            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = '<i class="fas fa-check"></i> Place Order';
            placeOrderBtn.style.opacity = '';
            placeOrderBtn.style.cursor = '';

            placeOrderBtn.removeEventListener('click', function (e) { e.preventDefault(); window.location.href = 'login.html?redirect=checkout'; });

        }
    } catch (err) {
        console.error('Error applying guest checkout restrictions', err);
    }
}

function showConfirmation() {
    console.log("Showing confirmation details");

    const confirmDiv = document.getElementById('confirmationReview');
    if (!confirmDiv) {
        console.error("Confirmation div not found");
        return;
    }

    const firstName = getElValue('firstName');
    const lastName = getElValue('lastName');
    const email = getElValue('email');
    const phone = getElValue('phone');
    const address = getElValue('address');
    const address2 = getElValue('address2');
    const city = getElValue('city');
    const notes = getElValue('notes');

    const subtotal = document.getElementById('subtotal').textContent;
    const total = document.getElementById('finalTotal').textContent;

    let fullAddress = address;
    if (address2) {
        fullAddress += ', ' + address2;
    }
    fullAddress += ', ' + city;

    const html = `
        <div class="confirmation-section">
            <h3 style="margin-top: 0; margin-bottom: 15px;">Shipping Address</h3>
            <div class="confirmation-row">
                <span class="confirmation-label">Name</span>
                <span class="confirmation-value">${firstName} ${lastName}</span>
            </div>
            <div class="confirmation-row">
                <span class="confirmation-label">Email</span>
                <span class="confirmation-value">${email}</span>
            </div>
            <div class="confirmation-row">
                <span class="confirmation-label">Phone</span>
                <span class="confirmation-value">${phone}</span>
            </div>
            <div class="confirmation-row">
                <span class="confirmation-label">Address</span>
                <span class="confirmation-value">${fullAddress}</span>
            </div>
            ${notes ? `<div class="confirmation-row">
                <span class="confirmation-label">Special Notes</span>
                <span class="confirmation-value">${notes}</span>
            </div>` : ''}
        </div>

        <div class="confirmation-section">
            <h3 style="margin-top: 0; margin-bottom: 15px;">Payment Method</h3>
            <div class="confirmation-row">
                <span class="confirmation-label">Method</span>
                <span class="confirmation-value">Cash on Delivery</span>
            </div>
            <div class="confirmation-row">
                <span class="confirmation-label">Status</span>
                <span class="confirmation-value">Pay on Delivery</span>
            </div>
        </div>

        <div class="confirmation-section">
            <h3 style="margin-top: 0; margin-bottom: 15px;">Order Total</h3>
            <div class="confirmation-row">
                <span class="confirmation-label">Subtotal</span>
                <span class="confirmation-value">${subtotal}</span>
            </div>
            <div class="confirmation-row">
                <span class="confirmation-label">Shipping</span>
                <span class="confirmation-value">FREE</span>
            </div>
            <div class="confirmation-row" style="border-bottom: none; font-size: 16px;">
                <span class="confirmation-label" style="font-weight: 700;">Total Amount</span>
                <span class="confirmation-value" style="font-size: 18px;">${total}</span>
            </div>
        </div>
    `;

    confirmDiv.innerHTML = html;
}

async function completeOrder() {
    console.log("Processing order placement");

    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const cart = JSON.parse(localStorage.getItem('vegaCart')) || [];

    if (cart.length === 0) {
        showTempMessage && showTempMessage('Your cart is empty!');
        return;
    }

    if (placeOrderBtn) {
        placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        placeOrderBtn.disabled = true;
    }

    try {

        const isGuest = localStorage.getItem('vegaGuest') === 'true';
        const isUser = !!localStorage.getItem('vegaUser');

        if (isGuest && !isUser && !(typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser)) {
            showTempMessage && showTempMessage('You must log in or create an account to complete the purchase.');
            window.location.href = 'login.html?redirect=checkout';

            const placeOrderBtn = document.getElementById('placeOrderBtn');
            if (placeOrderBtn) {
                placeOrderBtn.innerHTML = '<i class="fas fa-check"></i> Place Order';
                placeOrderBtn.disabled = false;
            }
            return;
        }

        const orderData = {
            firstName: getElValue('firstName'),
            lastName: getElValue('lastName'),
            fullName: `${getElValue('firstName')} ${getElValue('lastName')}`,
            email: getElValue('email'),
            phone: getElValue('phone'),
            address: getElValue('address'),
            city: getElValue('city'),
            postal: getElValue('postal'),
            country: getElValue('country'),
            notes: getElValue('notes'),
            paymentMethod: 'Cash on Delivery',
            shippingAddress: {
                firstName: getElValue('firstName'),
                lastName: getElValue('lastName'),
                fullName: `${getElValue('firstName')} ${getElValue('lastName')}`,
                email: getElValue('email'),
                phone: getElValue('phone'),
                address: getElValue('address'),
                address2: getElValue('address2'),
                city: getElValue('city')
            },
            items: cart,
            subtotal: parseFloat(document.getElementById('subtotal').textContent.replace(/[^\d.]/g, '')),
            discount: appliedPromo ? {
                code: appliedPromo.code,
                value: appliedPromo.value,
                type: appliedPromo.type
            } : null,
            total: parseFloat(document.getElementById('finalTotal').textContent.replace(/[^\d.]/g, '')),
            orderId: 'VEGA-' + Date.now(),
            date: new Date().toISOString(),
            createdAt: new Date(),
            status: 'Pending'
        };

        console.log("Order data prepared:", orderData);

        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            const user = firebase.auth().currentUser;
            orderData.userId = user.uid;
            orderData.userEmail = user.email;

            if (typeof db !== 'undefined') {
                await db.collection('orders').add(orderData);
                console.log('Order saved to Firestore');
            }
        } else {
            // Check if localUser exists even without Firebase auth
            const localUser = JSON.parse(localStorage.getItem('vegaUser'));
            if (localUser && localUser.uid) {
                orderData.userId = localUser.uid;
                orderData.userEmail = localUser.email;
                if (typeof db !== 'undefined') {
                    await db.collection('orders').add(orderData);
                }
            }
        }

        localStorage.removeItem('vegaCart');

        const form = document.getElementById('checkoutForm');
        const summary = document.querySelector('.order-summary');
        const steps = document.querySelector('.checkout-steps');

        if (form) form.style.display = 'none';
        if (summary) summary.style.display = 'none';
        if (steps) steps.style.display = 'none';

        const successPage = document.getElementById('successPage');
        if (successPage) {
            document.getElementById('orderId').textContent = orderData.orderId;
            successPage.style.display = 'block';
        }

        console.log("Order completed successfully");

    } catch (error) {
        console.error('Error placing order:', error);
        showTempMessage && showTempMessage(`Error: ${error.message}`);

        if (placeOrderBtn) {
            placeOrderBtn.innerHTML = '<i class="fas fa-check"></i> Place Order';
            placeOrderBtn.disabled = false;
        }
    }
}