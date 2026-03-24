# FBI Bot Frontend

A Vue.js + Tailwind CSS frontend for viewing Discord analytics data from the FBI Bot API

## Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Vue Router** - Client-side routing
- **Pinia** - State management
- **URQL** - GraphQL client
- **Vite** - Fast build tool

## Security Notes

### Current Setup
- **Password Protection**: Simple shared password for frontend access
- **API Key**: Stored in environment variable (hidden from users)
- **Session**: Password check stores session in sessionStorage


### For Better Security

If you want to improve security later:

1. **Move password check to backend** - Add a simple auth endpoint that validates password and returns a session token
2. **Use environment-based API key** - Have the backend issue temporary tokens instead of using a static key
3. **Add rate limiting** - Prevent brute force password attempts
4. **Use httpOnly cookies** - Store session tokens more securely

## Project Structure

```
src/
├── components/        # Reusable Vue components
│   └── StatCard.vue   # Statistics display card
├── composables/       # Composable functions
│   └── useGraphQL.ts  # GraphQL client setup
├── router/            # Vue Router configuration
│   └── index.ts       # Routes and auth guards
├── stores/            # Pinia state management
│   └── auth.ts        # Authentication state
├── types/             # TypeScript type definitions
│   └── discord.ts     # Discord data types
├── views/             # Page components
│   ├── LoginView.vue       # Login page
│   ├── DashboardView.vue   # Main dashboard
│   ├── UsersView.vue       # User list
│   └── UserDetailView.vue  # User detail page
├── App.vue            # Root component
└── main.ts            # Application entry point
```

## Available Pages

- **`/login`** - Password authentication
- **`/`** - Dashboard with server stats and recent activity
- **`/users`** - List of all Discord users with search
- **`/users/:userId`** - Detailed user activity view
