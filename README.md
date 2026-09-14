# Limpopo WebAdmin

A modern, full-featured admin dashboard built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

✨ **Authentication System**
- Secure login page with email/password authentication
- Password visibility toggle
- Success modal with automatic redirect
- Protected routes with middleware

🎨 **Theme Support**
- Dark and Light mode
- Persistent theme preferences
- Default dark theme on first load

📊 **Dashboard Overview**
- Welcome message and greeting
- 4 Key metrics cards:
  - Total Bookings
  - Total Transactions
  - Total Available Drivers
  - Total Drivers Enroute
- 3 Statistics containers:
  - Revenue Trends
  - Driver Performance
  - Booking Analytics
- Quick Bookings sidebar

🧭 **Navigation**
- Fixed header with:
  - Profile avatar
  - Wallet balance display
  - Notifications icon
  - Dark/Light theme toggle
  - Logout button
- Responsive sidebar with 12 navigation items:
  1. Overview
  2. Booking
  3. Customers
  4. Transactions
  5. Analytics
  6. Account Settings
  7. Wallet
  8. Support
  9. Broadcast
  10. Emergency
  11. Driver Management
  12. Admin Management

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State Management:** React Context API

## Getting Started

### Prerequisites

Before running the project, you need to fix npm cache permissions:

\`\`\`bash
sudo chown -R 501:20 "/Users/APPLE/.npm"
\`\`\`

### Installation

1. Install dependencies:

\`\`\`bash
npm install
\`\`\`

2. Run the development server:

\`\`\`bash
npm run dev
\`\`\`

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Project Structure

\`\`\`
limpopo-webadmin/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── analytics/
│   │   │   ├── booking/
│   │   │   ├── broadcast/
│   │   │   ├── customers/
│   │   │   ├── driver-management/
│   │   │   ├── admin-management/
│   │   │   ├── emergency/
│   │   │   ├── settings/
│   │   │   ├── support/
│   │   │   ├── transactions/
│   │   │   ├── wallet/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx (Login)
│   ├── components/
│   │   ├── DashboardHeader.tsx
│   │   ├── DashboardSidebar.tsx
│   │   └── QuickBookings.tsx
│   ├── context/
│   │   └── ThemeContext.tsx
│   └── middleware.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
\`\`\`

## Authentication

Currently uses localStorage for demo purposes. For production:
- Implement proper JWT/session-based authentication
- Add secure HTTP-only cookies
- Integrate with a backend API
- Add password reset functionality

## Default Login

Any email and password combination will work for demonstration purposes.

## License

MIT
# limpopo-webadmin
# limpopo_web
