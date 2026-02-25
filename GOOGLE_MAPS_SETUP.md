# Google Maps API Setup

The event creation wizard uses Google Places Autocomplete to help users search and select locations easily.

## Getting Your API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a new project** (or select an existing one)
   - Click on the project dropdown at the top
   - Click "New Project"
   - Give it a name (e.g., "Solu Events")

3. **Enable the Places API**
   - Go to: https://console.cloud.google.com/google/maps-apis
   - Click "Enable APIs and Services"
   - Search for "Places API"
   - Click on it and click "Enable"

4. **Create an API Key**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click "Create Credentials" → "API Key"
   - Copy your new API key

5. **Restrict your API key** (recommended for security)
   - Click on your API key to edit it
   - Under "Application restrictions":
     - Select "HTTP referrers (web sites)"
     - Add: `http://localhost:5173/*` (for development)
     - Add your production domain when deploying
   - Under "API restrictions":
     - Select "Restrict key"
     - Select "Places API"
   - Click "Save"

6. **Add the key to your project**
   - Open `frontend/.env`
   - Replace the empty value:
     ```
     VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
     ```
   - Save the file
   - Restart the dev server: `npm run dev`

## Billing Note

Google Maps Platform requires a billing account, but they provide:
- **$200 free credit per month**
- Places Autocomplete costs about $0.017 per session
- You'd need ~11,000+ autocomplete sessions per month to exceed the free tier

For a small to medium application, you'll likely stay within the free tier.

## Fallback

If you don't want to set up Google Maps right now, the address field will still work as a regular text input. Users just won't get the autocomplete suggestions.
