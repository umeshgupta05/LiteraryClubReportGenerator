# Literary Club Report Generator 📚

A Supabase-first web application designed for the Siddhartha Academy of Higher Education (SAHE) Literary Club. It empowers administrators and coordinators to create, manage, collaborate on, and export event reports end to end directly from the frontend.

## ✨ Features

- **Interactive Report Builder:** Dynamically build event reports with custom sections, photo galleries (circular & poster images), and dynamically generated winner tables.
- **DOCX / PDF Exporting:** Reports are exportable directly in-browser as Microsoft Word (`.docx`) and PDF.
- **Vercel & Supabase Ready:** Highly scalable infrastructure natively configured for Vercel deployment with a Supabase PostgreSQL and Storage backend. No local data bloat!
- **Shareable Links:** Collaborators can edit and finalize draft reports securely via uniquely generated 8-character invite codes without needing formal log-in credentials.
- **Document Uploads:** Skip the dynamic editor and attach raw `.docx` files natively.
- **Account Tiers:** Strict role-based access control (RBAC) separating features securely between `Admin` and standard `Coordinator` accounts.

## 🛠 Tech Stack

- **Frontend:** React, Vite, React Router DOM, Custom CSS (Aesthetic Glassmorphism & Modern Layouts)
- **Database & Storage:** Supabase (PostgreSQL), Supabase Storage SDK
- **Document Generation:** `docx`, `jspdf`, `jspdf-autotable`
- **Authentication:** Application-level auth using users stored in Supabase (`bcryptjs` password hashing)

## 🚀 Getting Started

### Prerequisites

1. Node.js (v18+)
2. NPM or Yarn
3. A Free [Supabase](https://supabase.com) Account.

### Environment Setup

Create a `.env` file in the `client` directory:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
```

### Supabase Initialization

1. In your Supabase Dashboard SQL Editor, run the `supabase_schema.sql` found at the root of the repo to instantly structure your database tables.
2. In Supabase Storage, create a single **Public** bucket named `uploads`.
3. Ensure your table/storage policies allow the operations your app needs for `users`, `reports`, and `uploads`.

### Installation & Run

Install and run the client app:

```bash
# Install dependencies
cd client && npm install

# Start app
npm run dev
```

The app runs at `http://localhost:5173`.

## 🤝 Contribution

Contributions, issues, and feature requests are welcome! Feel free to check the issues page or submit a pull request.
