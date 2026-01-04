// Security Utilities for VEGA E-Commerce Platform
// Add this file to sanitize user inputs and prevent XSS attacks

/**
 * Sanitizes HTML to prevent XSS attacks
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string
 */
function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Escapes HTML entities
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
function escapeHTML(str) {
    if (!str) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };
    return String(str).replace(/[&<>"'/]/g, (s) => map[s]);
}

/**
 * Validates email format
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates password strength
 * @param {string} password - The password to validate
 * @returns {object} - {valid: boolean, message: string}
 */
function validatePassword(password) {
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true, message: 'Password is strong' };
}

/**
 * Sanitizes user input for display
 * @param {string} input - The user input to sanitize
 * @returns {string} - The sanitized input
 */
function sanitizeUserInput(input) {
    if (!input) return '';
    // Remove any script tags
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Remove any event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    // Escape HTML entities
    return escapeHTML(sanitized);
}

/**
 * Validates and sanitizes review comment
 * @param {string} comment - The review comment
 * @returns {object} - {valid: boolean, sanitized: string, message: string}
 */
function validateReviewComment(comment) {
    if (!comment || comment.trim().length === 0) {
        return { valid: false, sanitized: '', message: 'Comment cannot be empty' };
    }
    if (comment.length > 1000) {
        return { valid: false, sanitized: '', message: 'Comment must be less than 1000 characters' };
    }
    const sanitized = sanitizeUserInput(comment);
    return { valid: true, sanitized, message: 'Comment is valid' };
}

/**
 * Validates product name
 * @param {string} name - The product name
 * @returns {boolean} - True if valid
 */
function isValidProductName(name) {
    return name && name.trim().length > 0 && name.length <= 100;
}

/**
 * Validates price
 * @param {number} price - The price to validate
 * @returns {boolean} - True if valid
 */
function isValidPrice(price) {
    return typeof price === 'number' && price > 0 && price < 1000000;
}

/**
 * Sanitizes URL to prevent javascript: and data: URIs
 * @param {string} url - The URL to sanitize
 * @returns {string} - The sanitized URL or empty string if invalid
 */
function sanitizeURL(url) {
    if (!url) return '';
    const urlLower = url.toLowerCase().trim();
    if (urlLower.startsWith('javascript:') || urlLower.startsWith('data:')) {
        return '';
    }
    return url;
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sanitizeHTML,
        escapeHTML,
        isValidEmail,
        validatePassword,
        sanitizeUserInput,
        validateReviewComment,
        isValidProductName,
        isValidPrice,
        sanitizeURL
    };
}
