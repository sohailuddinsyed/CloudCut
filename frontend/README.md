# URL Shortener Frontend

A modern, minimalistic frontend for the URL shortener service built with vanilla HTML, CSS, and JavaScript.

## Features

- 🎨 Modern, clean design with gradient background
- 📱 Fully responsive (mobile-friendly)
- ⚡ Fast and lightweight (no framework dependencies)
- 📋 One-click copy to clipboard
- ✨ Smooth animations and transitions
- 🔒 Input validation and error handling
- 🎯 Custom alias support
- ⌨️ Keyboard shortcuts (Ctrl/Cmd + Enter to submit)

## Local Development

1. Simply open `index.html` in your browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

2. Navigate to `http://localhost:8000` in your browser

## Deployment to AWS Amplify

### Option 1: Deploy from Git Repository

1. Push this frontend directory to a Git repository (GitHub, GitLab, or Bitbucket)

2. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)

3. Click "New app" → "Host web app"

4. Connect your repository and select the branch

5. Configure build settings:
   - Build command: (leave empty)
   - Base directory: `frontend`
   - Output directory: `/`

6. The `amplify.yml` file will be automatically detected

7. Click "Save and deploy"

### Option 2: Manual Deploy

1. Install AWS Amplify CLI:
```bash
npm install -g @aws-amplify/cli
```

2. Configure Amplify:
```bash
amplify configure
```

3. Initialize Amplify in the frontend directory:
```bash
cd frontend
amplify init
```

4. Add hosting:
```bash
amplify add hosting
```
   - Select "Hosting with Amplify Console"
   - Choose "Manual deployment"

5. Publish:
```bash
amplify publish
```

### Option 3: Drag and Drop Deploy

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)

2. Click "New app" → "Host web app" → "Deploy without Git provider"

3. Drag and drop the `frontend` folder or upload as a zip file

4. Click "Save and deploy"

## API Configuration

The frontend is pre-configured to use the API Gateway endpoint. You need to configure it:

1. Edit `frontend/index.html` and update the `window.ENV.API_BASE_URL` value:
```javascript
window.ENV = {
    API_BASE_URL: 'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod'
};
```

Or for production deployments, inject the environment variable at build time.

To change the API endpoint, edit the `API_BASE_URL` constant in `script.js`:

```javascript
const API_BASE_URL = 'your-api-endpoint-here';
```

## File Structure

```
frontend/
├── index.html      # Main HTML file
├── styles.css      # CSS styling
├── script.js       # JavaScript functionality
├── amplify.yml     # AWS Amplify build configuration
└── README.md       # This file
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Customization

### Colors

Edit CSS variables in `styles.css`:

```css
:root {
    --primary-color: #6366f1;
    --primary-hover: #4f46e5;
    --bg-gradient-start: #667eea;
    --bg-gradient-end: #764ba2;
    /* ... more variables */
}
```

### API Endpoint

Edit the constant in `script.js`:

```javascript
const API_BASE_URL = 'your-api-endpoint';
```

## Features Explained

### URL Validation
- Validates URL format before submission
- Ensures URLs start with http:// or https://
- Provides real-time feedback

### Custom Alias
- Optional custom short code
- Validates allowed characters (letters, numbers, hyphens, underscores)
- Shows error if alias is already taken

### Copy to Clipboard
- Modern clipboard API with fallback
- Visual feedback on successful copy
- Works on all modern browsers

### Error Handling
- Network errors
- Invalid URLs
- Duplicate aliases
- API errors
- User-friendly error messages

### Loading States
- Animated loader during API calls
- Disabled button to prevent double submission
- Clear visual feedback

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure your API Gateway has CORS enabled:
- Allow origin: `*` or your specific domain
- Allow methods: `POST, OPTIONS`
- Allow headers: `Content-Type`

### API Not Responding
- Check the API endpoint URL in `script.js`
- Verify the API Gateway is deployed and accessible
- Check browser console for error messages

### Clipboard Not Working
- Ensure you're using HTTPS (required for clipboard API)
- Check browser permissions
- The fallback method should work on older browsers

## License

MIT License - Feel free to use and modify as needed.
