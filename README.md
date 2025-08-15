# EV Database - Electric Vehicle Information Platform

A comprehensive, community-driven platform for electric vehicle data management with contribution workflows, image galleries, and API access.

## 🚗 Overview

The EV Database is a modern web application that allows users to browse, contribute, and manage electric vehicle information. Built with a focus on data quality, user experience, and community collaboration, it features a robust contribution system with moderation workflows and comprehensive API access.

## ✨ Key Features

### 🔍 **Vehicle Database**
- **Comprehensive EV Catalog**: Browse electric vehicles with detailed specifications
- **Advanced Search & Filtering**: Find vehicles by make, model, year, and specifications
- **Multiple View Modes**: Switch between card grid and table views
- **Image Galleries**: Multi-image carousel with captions and alt text for accessibility

### 👥 **Community Contributions**
- **Multi-Step Contribution Form**: Guided process for submitting new vehicles or updates
- **Duplicate Detection**: Automatic checking to prevent duplicate entries
- **Variant Support**: Create vehicle variants (different trims, configurations)
- **Image Contributions**: Upload and manage vehicle images with metadata
- **Moderation Workflow**: Community voting and admin/moderator approval system

### 🔐 **User Management & Security**
- **Role-Based Access Control**: Member, Moderator, and Admin roles
- **API Key Authentication**: Secure API access with credit-based usage
- **JWT Authentication**: Secure user sessions
- **Rate Limiting**: Per-user rate limiting to prevent abuse

### 📊 **Admin & Analytics**
- **Admin Dashboard**: User management and system statistics
- **Contribution Management**: Review, approve, or reject submissions
- **API Usage Tracking**: Monitor API consumption and user activity
- **Image Moderation**: Review and approve user-submitted images

### 🎨 **Modern UI/UX**
- **DaisyUI Framework**: Beautiful, accessible components
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark/Light Theme Support**: User preference-based theming
- **Accessibility First**: WCAG compliant with proper ARIA labels and alt text

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **TailwindCSS 4** for styling
- **DaisyUI 5** for UI components
- **Heroicons** for iconography

### Backend
- **Hono** - Fast, lightweight web framework
- **TypeScript** for type safety
- **Drizzle ORM** with SQLite database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **File upload handling** for images

### Development Tools
- **pnpm** for package management
- **ESLint** for code quality
- **TypeScript** for type checking
- **Hot reload** for development

## 🚀 Development Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ev-db
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start the development servers**

   **Backend** (Terminal 1):
   ```bash
   pnpm --filter backend dev
   ```

   **Frontend** (Terminal 2):
   ```bash
   pnpm --filter frontend dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

### Default Users
The application comes with pre-seeded users for testing:

- **Admin**: `admin@example.com` / `password123`
- **Moderator**: `moderator@example.com` / `password123`
- **User**: `user@example.com` / `password123`

## 📁 Project Structure

```
ev-db/
├── packages/
│   ├── frontend/          # React frontend application
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/         # Page components
│   │   │   ├── services/      # API services
│   │   │   ├── context/       # React contexts
│   │   │   └── design-system/ # Design system components
│   │   └── public/            # Static assets
│   └── backend/           # Hono backend API
│       ├── src/
│       │   ├── middleware/    # Authentication & security
│       │   ├── services/      # Business logic
│       │   ├── db/           # Database schema & migrations
│       │   └── uploads/      # File storage
│       └── drizzle/          # Database migrations
├── docs/                  # Technical documentation
└── README.md             # This file
```

## 🔧 Development

### Available Scripts

**Root level:**
```bash
pnpm install              # Install all dependencies
```

**Frontend:**
```bash
pnpm --filter frontend dev      # Start development server
pnpm --filter frontend build    # Build for production
pnpm --filter frontend preview  # Preview production build
```

**Backend:**
```bash
pnpm --filter backend dev       # Start development server with hot reload
pnpm --filter backend db:seed   # Seed database with sample data
```

### Environment Setup

The application works out of the box with default settings. For production deployment, you may want to configure:

- Database connection (currently uses SQLite)
- File upload storage location
- JWT secret keys
- API rate limiting settings

### Database

The application uses SQLite with Drizzle ORM. The database is automatically created and seeded on first run with:
- Sample vehicles
- Default user accounts
- Basic configuration data

## 📚 Documentation

Comprehensive technical documentation is available in the `/docs` directory:

### Core Documentation
- **[API Security Implementation](docs/API_SECURITY_IMPLEMENTATION.md)** - Complete API security architecture and endpoints
- **[Multi-Step Contribution Form](docs/MULTI_STEP_CONTRIBUTION_FORM.md)** - Detailed form workflow and features
- **[Design System](docs/DESIGN_SYSTEM.md)** - UI components and design patterns
- **[Vehicle Card View](docs/VEHICLE_CARD_VIEW.md)** - Vehicle display components and layouts

### Key Features Documentation

#### Contribution System
- Multi-step form with validation
- Duplicate detection and prevention
- Image upload with metadata (captions, alt text)
- Community voting and moderation workflow
- Variant creation for different vehicle configurations

#### Security & API
- API key authentication with credit system
- Role-based access control (Member/Moderator/Admin)
- Rate limiting per user
- Comprehensive audit logging
- Frontend security exemptions

#### User Experience
- Responsive design with mobile support
- Accessibility-first approach (WCAG compliant)
- Dark/light theme support
- Intuitive navigation and search
- Real-time form validation

## 🎯 Usage Examples

### For End Users
1. **Browse Vehicles**: Explore the EV database with search and filters
2. **Contribute Data**: Submit new vehicles or updates through the guided form
3. **Upload Images**: Add vehicle photos with proper captions and alt text
4. **Vote on Proposals**: Help moderate community contributions

### For Developers
1. **API Access**: Use API keys to access vehicle data programmatically
2. **Extend Features**: Build on the modular component architecture
3. **Custom Themes**: Leverage DaisyUI theming system
4. **Add Integrations**: Connect with external EV data sources

### For Administrators
1. **User Management**: Control user roles and permissions
2. **Content Moderation**: Review and approve contributions
3. **System Monitoring**: Track API usage and system health
4. **Data Quality**: Maintain database integrity and accuracy

## 🤝 Contributing

We welcome contributions! The application is designed with extensibility in mind:

### Development Guidelines
- Follow TypeScript best practices
- Use the existing design system components
- Maintain accessibility standards
- Write comprehensive documentation
- Test thoroughly before submitting

### Areas for Contribution
- New vehicle data sources
- Enhanced search and filtering
- Mobile app development
- API integrations
- Performance optimizations
- Accessibility improvements

## 📄 License

This project is licensed under the ISC License.

## 🔗 Links

- **Frontend**: http://localhost:5173 (development)
- **Backend API**: http://localhost:3000 (development)
- **Documentation**: [/docs](docs/) directory
- **Design System**: Built with [DaisyUI](https://daisyui.com/)
- **Framework**: [Hono](https://hono.dev/) backend, [React](https://react.dev/) frontend

---

**Built with ❤️ for the electric vehicle community**
