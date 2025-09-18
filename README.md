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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
