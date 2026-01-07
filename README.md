# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## Supabase Configuration

This project uses **Lovable Cloud** (powered by Supabase) for backend services.

### Configuration Files

| File | Purpose |
|------|---------|
| `supabase/config.toml` | Contains `project_id` and edge function configurations |
| `.env` | Environment variables (auto-generated, do not edit manually) |
| `src/integrations/supabase/client.ts` | Supabase client (auto-generated) |
| `src/integrations/supabase/types.ts` | Database types (auto-generated) |

### Environment Variables

The following environment variables are automatically configured:

```env
VITE_SUPABASE_PROJECT_ID    # Supabase project identifier
VITE_SUPABASE_URL           # Supabase API URL
VITE_SUPABASE_PUBLISHABLE_KEY  # Public anon key for client-side
```

### Environment Separation (Dev vs Prod)

For production deployments with separate environments:

1. **Development**: Uses the default Lovable Cloud project
2. **Production**: Create a separate Supabase project and configure:

```env
# Production environment example
VITE_SUPABASE_PROJECT_ID="your-prod-project-id"
VITE_SUPABASE_URL="https://your-prod-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-prod-anon-key"
```

### Edge Functions

Edge functions are located in `supabase/functions/` and are deployed automatically.

| Function | Purpose |
|----------|---------|
| `process-enrollment` | Handles course enrollment with rate limiting, logging, and soft delete |

### Database Features

- **Rate Limiting**: Prevents abuse with configurable limits per action
- **Activity Logging**: Tracks user actions for audit purposes
- **Error Tracking**: Logs errors with stack traces for debugging
- **Soft Delete**: Enrollments use soft delete (deleted_at column)

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Lovable Cloud (Supabase)

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
