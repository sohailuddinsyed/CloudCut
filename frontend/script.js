// API Configuration - loaded from config.js
const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod';

// DOM Elements
const form = document.getElementById('shortenForm');
const longUrlInput = document.getElementById('longUrl');
const customAliasInput = document.getElementById('customAlias');
const expirationDateInput = document.getElementById('expirationDate');
const shortenBtn = document.getElementById('shortenBtn');
const btnText = document.querySelector('.btn-text');
const loader = document.querySelector('.loader');
const resultDiv = document.getElementById('result');
const shortUrlInput = document.getElementById('shortUrl');
const copyBtn = document.getElementById('copyBtn');
const messageDiv = document.getElementById('message');
const expirationInfo = document.getElementById('expirationInfo');

// Validate URL format
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Calculate default expiration (30 days from now) in Unix timestamp (seconds)
function getDefaultExpiration() {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    return now + thirtyDaysInSeconds;
}

// Convert datetime-local value to Unix timestamp (seconds)
function datetimeToUnixTimestamp(datetimeValue) {
    if (!datetimeValue) return null;
    const date = new Date(datetimeValue);
    return Math.floor(date.getTime() / 1000); // Convert milliseconds to seconds
}

// Format Unix timestamp to human-readable date
function formatExpirationDate(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    };
    return date.toLocaleString('en-US', options);
}

// Show message (success or error)
function showMessage(text, type = 'success') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Set loading state
function setLoading(isLoading) {
    if (isLoading) {
        shortenBtn.disabled = true;
        btnText.style.display = 'none';
        loader.style.display = 'block';
    } else {
        shortenBtn.disabled = false;
        btnText.style.display = 'block';
        loader.style.display = 'none';
    }
}

// Shorten URL API call
async function shortenUrl(longUrl, customAlias = '', expiresAt = null) {
    const requestBody = {
        longUrl: longUrl
    };
    
    if (customAlias && customAlias.trim() !== '') {
        requestBody.customAlias = customAlias.trim();
    }
    
    // Add expiration: use provided value or default to 30 days
    requestBody.expiresAt = expiresAt || getDefaultExpiration();
    
    try {
        const response = await fetch(`${API_BASE_URL}/shorten`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to shorten URL');
        }
        
        return data;
    } catch (error) {
        throw error;
    }
}

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const longUrl = longUrlInput.value.trim();
    const customAlias = customAliasInput.value.trim();
    const expirationDateValue = expirationDateInput.value;
    
    // Validate URL
    if (!isValidUrl(longUrl)) {
        showMessage('Please enter a valid URL (must start with http:// or https://)', 'error');
        return;
    }
    
    // Validate custom alias if provided
    if (customAlias && !/^[a-zA-Z0-9_-]{4,32}$/.test(customAlias)) {
        showMessage('Custom alias must be 4-32 characters (letters, numbers, hyphens, and underscores only)', 'error');
        return;
    }
    
    // Convert expiration date to Unix timestamp if provided
    let expiresAt = null;
    if (expirationDateValue) {
        expiresAt = datetimeToUnixTimestamp(expirationDateValue);
        
        // Validate that expiration is in the future
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt <= now) {
            showMessage('Expiration date must be in the future', 'error');
            return;
        }
    }
    
    // Hide previous results and messages
    resultDiv.style.display = 'none';
    messageDiv.style.display = 'none';
    
    // Set loading state
    setLoading(true);
    
    try {
        const result = await shortenUrl(longUrl, customAlias, expiresAt);
        
        // Display the shortened URL
        shortUrlInput.value = result.shortUrl;
        
        // Display expiration information
        if (result.expiresAt) {
            const formattedDate = formatExpirationDate(result.expiresAt);
            expirationInfo.textContent = `Expires: ${formattedDate}`;
            expirationInfo.style.display = 'block';
        }
        
        resultDiv.style.display = 'block';
        
        showMessage('URL shortened successfully! 🎉', 'success');
        
        // Clear the form
        longUrlInput.value = '';
        customAliasInput.value = '';
        expirationDateInput.value = '';
        
    } catch (error) {
        console.error('Error shortening URL:', error);
        showMessage(error.message || 'Failed to shorten URL. Please try again.', 'error');
    } finally {
        setLoading(false);
    }
});

// Copy to clipboard functionality
copyBtn.addEventListener('click', async () => {
    const shortUrl = shortUrlInput.value;
    
    try {
        await navigator.clipboard.writeText(shortUrl);
        
        // Visual feedback
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        
        showMessage('Copied to clipboard! ✓', 'success');
        
        // Reset button after 2 seconds
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
        }, 2000);
        
    } catch (error) {
        console.error('Failed to copy:', error);
        
        // Fallback for older browsers
        shortUrlInput.select();
        document.execCommand('copy');
        showMessage('Copied to clipboard! ✓', 'success');
    }
});

// Add input validation feedback
longUrlInput.addEventListener('input', () => {
    const url = longUrlInput.value.trim();
    if (url && !isValidUrl(url)) {
        longUrlInput.style.borderColor = 'var(--error-color)';
    } else {
        longUrlInput.style.borderColor = 'var(--border-color)';
    }
});

// Clear border color on focus
longUrlInput.addEventListener('focus', () => {
    longUrlInput.style.borderColor = 'var(--primary-color)';
});

// Add keyboard shortcut (Ctrl/Cmd + Enter to submit)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        form.dispatchEvent(new Event('submit'));
    }
});
