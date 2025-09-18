# ThisTracker

A modern time tracking application built with Next.js and integrated with Google's productivity suite.

## Features

- ⏱️ **Time Tracking** - Start/stop timer with task descriptions
- 📅 **Google Calendar Integration** - Save time entries as calendar events
- 📊 **Google Sheets Export** - Export time tracking data to spreadsheets
- 💾 **Google Drive Storage** - Store time tracking files in the cloud
- 📄 **Google Docs Integration** - Generate time tracking reports
- 🔐 **Google OAuth Authentication** - Secure login with Google account

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Google Cloud Project with OAuth credentials

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Google OAuth credentials
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Google OAuth Setup

See [GOOGLE_APIS_SETUP.md](./GOOGLE_APIS_SETUP.md) for detailed instructions on setting up Google OAuth and API access.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

ThisTracker is configured for deployment on Google Cloud Run with GitHub Actions CI/CD.

### Prerequisites for Deployment

- Google Cloud Project
- Google Cloud CLI installed and authenticated
- Docker installed
- GitHub repository with Actions enabled

### Quick Setup

1. **Run the setup script:**

   ```bash
   pnpm run deploy:setup
   ```

2. **Add GitHub Secrets:**

   - Go to your GitHub repository settings
   - Navigate to Secrets and Variables > Actions
   - Add these secrets:
     - `GCP_PROJECT_ID`: Your Google Cloud Project ID
     - `GCP_SA_KEY`: Contents of the generated service account key

3. **Push to main branch:**
   ```bash
   git add .
   git commit -m "Add Cloud Run deployment configuration"
   git push origin main
   ```

### Manual Deployment

For local testing or manual deployment:

```bash
# Build and deploy locally
pnpm run deploy:local

# Or use Docker directly
pnpm run docker:build
pnpm run docker:run
```

### Environment Variables

Set these environment variables in Cloud Run:

- `NEXTAUTH_URL`: Your Cloud Run service URL
- `NEXTAUTH_SECRET`: A random secret for NextAuth
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
- `GOOGLE_SHEETS_SPREADSHEET_ID`: Your Google Sheets spreadsheet ID

### CI/CD Pipeline

The GitHub Actions workflow will:

1. Run tests and linting on every push
2. Build and deploy to Cloud Run on pushes to main branch
3. Use Docker for consistent builds
4. Automatically scale based on traffic

### Monitoring

- View logs in Google Cloud Console > Cloud Run > Your Service > Logs
- Monitor performance in Cloud Run metrics
- Set up alerts for errors or high latency

### Custom Domain (Optional)

1. Go to Cloud Run service settings
2. Click "Manage Custom Domains"
3. Add your domain and configure DNS
4. Update `NEXTAUTH_URL` environment variable
