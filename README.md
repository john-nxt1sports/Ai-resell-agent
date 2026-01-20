# 🤖 AI Resell Agent

A sleek, modern, and professional **AI-powered listing automation platform** that automatically posts products to multiple marketplaces like **Poshmark**, **Mercari**, and **eBay**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Features

### 🎯 **Core Features**

- **📸 Drag & Drop Image Upload** - Upload product photos with automatic compression and preview
- **📦 Bulk Upload** - Create multiple listings at once with batch processing
- **🤖 AI-Powered Automation** - AI handles description generation, tagging, and listing optimization
- **🏪 Multi-Marketplace Support** - Post to Poshmark, Mercari, and eBay with a single click
- **📊 Dashboard Analytics** - Track listings, view stats, and monitor performance
- **🌓 Dark Mode** - Beautiful light and dark themes with system preference detection
- **📱 Fully Responsive** - Perfect experience on desktop, tablet, and mobile

### 🛠️ **Technical Features**

- **Next.js 14** with App Router and Server Components
- **TypeScript** for full type safety
- **Zustand** for lightweight state management
- **TailwindCSS** for modern, responsive styling
- **Image Compression** with browser-image-compression
- **Lucide Icons** for crisp, modern iconography

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd Ai-resell-agent
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your API keys and configuration.

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
Ai-resell-agent/
├── app/                      # Next.js app router
│   ├── layout.tsx           # Root layout with theme provider
│   ├── page.tsx             # Homepage (Dashboard)
│   ├── globals.css          # Global styles
│   ├── listings/
│   │   ├── new/
│   │   │   └── page.tsx     # New listing page
│   │   └── bulk/
│   │       └── page.tsx     # Bulk upload page
│   ├── analytics/
│   │   └── page.tsx         # Analytics page
│   └── settings/
│       └── page.tsx         # Settings page
│
├── components/              # React components
│   ├── layout/
│   │   ├── MainLayout.tsx   # Main app layout wrapper
│   │   ├── Navbar.tsx       # Top navigation bar
│   │   └── Sidebar.tsx      # Collapsible sidebar
│   ├── pages/
│   │   ├── Dashboard.tsx    # Dashboard page component
│   │   ├── NewListing.tsx   # Create listing form
│   │   ├── BulkListing.tsx  # Bulk upload page
│   │   ├── Analytics.tsx    # Analytics page
│   │   └── Settings.tsx     # Settings page
│   ├── ui/
│   │   ├── FileUploader.tsx       # Image upload with drag-drop
│   │   ├── BulkItemCard.tsx       # Individual bulk item card
│   │   └── MarketplaceSelector.tsx # Marketplace toggle selector
│   └── providers/
│       └── ThemeProvider.tsx      # Dark mode provider
│
├── store/                   # Zustand state management
│   ├── listingStore.ts      # Listings state
│   └── uiStore.ts           # UI state (sidebar, theme)
│
├── lib/                     # Utilities and services
│   ├── api.ts               # API service layer (ready for backend)
│   └── utils.ts             # Helper functions
│
├── types/                   # TypeScript type definitions
│   ├── index.ts             # Shared types
│   └── bulk.ts              # Bulk listing types
│
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
├── next.config.js           # Next.js configuration
└── package.json             # Dependencies
```

---

## 🎨 Design System

### Color Palette

- **Primary**: Blue gradient (`#0ea5e9` to `#0369a1`)
- **Dark Mode**: Custom dark grays (`dark-50` to `dark-950`)
- **Marketplace Colors**:
  - Poshmark: Red (`#ef4444`)
  - Mercari: Blue (`#3b82f6`)
  - eBay: Yellow (`#eab308`)

### Typography

- **Font**: Inter (Google Fonts)
- **Headings**: Bold, clean, generous spacing
- **Body**: Medium weight, comfortable reading

---

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_AI_API_KEY=your_ai_api_key_here
POSHMARK_API_KEY=
MERCARI_API_KEY=
EBAY_API_KEY=
NEXT_PUBLIC_MAX_IMAGE_SIZE=10485760
NEXT_PUBLIC_MAX_IMAGES=10
```

---

## 🧩 Key Components

### FileUploader

Drag-and-drop image uploader with:

- Automatic image compression
- Live preview grid
- Remove/reorder functionality
- Support for up to 10 images

### MarketplaceSelector

Toggle-style selector for:

- Poshmark
- Mercari
- eBay

### Dashboard

Analytics overview showing:

- Total listings
- Active listings
- Draft listings
- Total value

---

## 🛣️ Roadmap

### Phase 1: MVP (Current)

- [x] Core UI components
- [x] Image upload & compression
- [x] Marketplace selection
- [x] Dashboard with mock data
- [x] Dark mode support
- [x] Bulk listing upload

### Phase 2: Backend Integration

- [ ] Connect to backend API
- [ ] User authentication
- [ ] Real-time listing status updates
- [ ] AI description generation
- [ ] Marketplace API integration

### Phase 3: Advanced Features

- [ ] Bulk listing upload
- [ ] Listing templates
- [ ] Analytics & reporting
- [ ] Automated repricing
- [ ] Social media integration

---

## 📝 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 💡 Key Concepts

### Simple but Powerful

Users only need to:

1. 📸 **Drop in images**
2. ✍️ **Add title & price**
3. 🏪 **Select marketplaces**
4. ✨ **Let AI do the rest**

The AI agent automatically:

- Generates optimized descriptions
- Suggests relevant tags
- Posts to all selected marketplaces
- Notifies when complete

---

## 🙋 Support

For questions or issues, please open an issue on GitHub or contact the maintainers.

---

**Built with ❤️ using Next.js, TypeScript, and TailwindCSS**
