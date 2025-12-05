# Flowboard Store - Next.js

A modern e-commerce storefront built with Next.js 15, React, TypeScript, Supabase, and Tailwind CSS.

## 🚀 Quick Start

### 1. Environment Setup

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Update the values:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- `SUPABASE_DB_URL` - Database connection string

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Visit:
- **Storefront**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

## 📁 Project Structure

```
flowboard/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Storefront home
│   ├── admin/             # Admin routes
│   └── api/               # API routes
├── src/
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── pages/             # Admin pages
│   ├── services/          # API services
│   └── lib/               # Utilities
└── supabase/             # Database migrations
```

## 🔧 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google OAuth + Email/Password)

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Supabase Commands

- `npm run supabase:migrate` - Apply database migrations
- `npm run supabase:studio` - Open Supabase Studio
- `npm run supabase:status` - Check Supabase status

## 🔐 Authentication

- **Google OAuth** - One-click sign in
- **Email/Password** - Traditional authentication
- **User Profiles** - Stored in Supabase
- **Guest Support** - Cart persists for guests

## 🛍️ Features

- Product catalog with categories
- Shopping cart
- Favorites/Wishlist
- User profiles
- Order management
- Admin dashboard
- Product management (CRUD)
- CSV import/export
- Inventory tracking

## 🗄️ Database

Supabase PostgreSQL with:
- Row Level Security (RLS)
- Automatic user profiles
- Real-time subscriptions
- Migrations in `supabase/migrations/`

## 📚 Documentation

See `.cursor/` folder for detailed documentation:
- Migration guides
- Setup instructions
- API documentation

## 🚀 Deployment

The app is ready to deploy on:
- **Vercel** (recommended for Next.js)
- Any Node.js hosting platform

## 📄 License

Private project
