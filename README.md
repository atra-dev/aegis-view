# Aegis View

A modern web application built with Next.js, providing advanced analytics and visualization capabilities.

## 🚀 Features

- Real-time data visualization with Chart.js
- Interactive maps using Leaflet
- PDF generation capabilities
- Authentication system
- Responsive design with Material-UI and Tailwind CSS
- Analytics integration with Vercel
- Firebase integration
- Date handling with date-fns and moment-timezone

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- Git

## 🛠️ Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd ATRA-Platform
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory with the following variables:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Authentication
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Other API Keys
[Add other required API keys]
```

## 🚀 Development

To start the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🏗️ Building for Production

```bash
npm run build
# or
yarn build
```

To start the production server:

```bash
npm run start
# or
yarn start
```

## 📦 Project Structure

```
src/
├── app/          # Next.js app directory
├── components/   # Reusable UI components
├── contexts/     # React context providers
├── hooks/        # Custom React hooks
├── pages/        # Page components
├── services/     # API and service integrations
└── utils/        # Utility functions
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run generate-sw` - Generate service worker

## 🛠️ Technologies Used

- **Framework**: Next.js 15
- **UI Libraries**: 
  - Material-UI
  - Tailwind CSS
  - Framer Motion
- **Data Visualization**: 
  - Chart.js
  - React-Chartjs-2
- **Maps**: 
  - Leaflet
  - React-Leaflet
- **Authentication**: NextAuth.js
- **Database**: Firebase
- **PDF Generation**: jsPDF, html2canvas
- **Date Handling**: date-fns, moment-timezone
- **Analytics**: Vercel Analytics & Speed Insights

## 🔐 Security

- All sensitive information should be stored in environment variables
- API keys and credentials should never be committed to the repository
- Follow security best practices for authentication and data handling

## 👥 Support

For support, please contact:
- Name: Mart Angelo Martinez
- Phone: 09552980907
- Email: martangelomartinez@gmail.com

## 🔄 Deployment

The application is configured for deployment on Vercel. For deployment instructions, refer to the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
