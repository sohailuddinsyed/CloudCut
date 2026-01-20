// API Configuration
const API_BASE_URL = 'https://kign8kfdd7.execute-api.us-east-1.amazonaws.com/prod';

// DOM Elements
const form = document.getElementById('shortenForm');
const longUrlInput = document.getElementById('longUrl');
const customAliasInput = document.getElementById('customAlias');
const shortenBtn = document.getElementById('shortenBtn');
const btnText = document.querySelector('.btn-text');
const loader = document.querySelector('.loader');
const resultDiv = document.getElementById('result');
const shortUrlInput = document.getElementById('shortUrl');
const copyBtn = document.getElementById('copyBtn');
const messageDiv = document.getElementById('message');

// Validate URL format
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
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
async function shortenUrl(longUrl, customAlias = '') {
    const requestBody = {
        longUrl: longUrl
    };
    
    if (customAlias && customAlias.trim() !== '') {
        requestBody.customAlias = customAlias.trim();
    }
    
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
    
    // Validate URL
    if (!isValidUrl(longUrl)) {
        showMessage('Please enter a valid URL (must start with http:// or https://)', 'error');
        return;
    }
    
    // Validate custom alias if provided
    if (customAlias && !/^[a-zA-Z0-9-_]+$/.test(customAlias)) {
        showMessage('Custom alias can only contain letters, numbers, hyphens, and underscores', 'error');
        return;
    }
    
    // Hide previous results and messages
    resultDiv.style.display = 'none';
    messageDiv.style.display = 'none';
    
    // Set loading state
    setLoading(true);
    
    try {
        const result = await shortenUrl(longUrl, customAlias);
        
        // Display the shortened URL
        shortUrlInput.value = result.shortUrl;
        resultDiv.style.display = 'block';
        
        showMessage('URL shortened successfully! 🎉', 'success');
        
        // Clear the form
        longUrlInput.value = '';
        customAliasInput.value = '';
        
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
