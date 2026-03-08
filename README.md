# Marketplace V2 - Monorepo

A monorepo structure for the NFT Marketplace application using pnpm workspaces.

## Structure

```
marketplace-v2/
├── apps/
│   └── client-next/          # Next.js frontend application
├── packages/                  # Shared packages (utilities, configs, etc.)
├── smart-contract/           # Hardhat smart contracts
├── pnpm-workspace.yaml       # Workspace configuration
└── package.json              # Root package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0

### Installation

Install all dependencies for all workspaces:

```bash
pnpm install
```

## Available Scripts

### Root Level

- `pnpm dev` - Start the Next.js development server
- `pnpm build` - Build the Next.js application
- `pnpm start` - Start the production Next.js server
- `pnpm lint` - Lint the Next.js application
- `pnpm contracts:compile` - Compile smart contracts
- `pnpm contracts:test` - Run smart contract tests
- `pnpm contracts:deploy` - Deploy smart contracts
- `pnpm clean` - Remove all node_modules and build artifacts
- `pnpm install:all` - Install dependencies for all workspaces

### Workspace-Specific Scripts

Run scripts for specific workspaces using pnpm filters:

```bash
# Run dev server for client-next
pnpm --filter @marketplace/client-next dev

# Compile smart contracts
pnpm --filter @marketplace/smart-contract compile

# Run tests for smart contracts
pnpm --filter @marketplace/smart-contract test
```

## Workspaces

### `@marketplace/client-next`

Next.js frontend application for the NFT marketplace.

**Location:** `apps/client-next/`

**Key Features:**
- Next.js 16 with React 19
- TypeScript
- Tailwind CSS
- Web3 integration with ethers.js

### `@marketplace/smart-contract`

Hardhat-based smart contract development environment.

**Location:** `smart-contract/`

**Key Features:**
- Hardhat development environment
- Solidity smart contracts
- Contract testing and deployment

## Development Workflow

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start development:**
   ```bash
   pnpm dev
   ```

3. **Work on smart contracts:**
   ```bash
   pnpm contracts:compile
   pnpm contracts:test
   ```

## Adding New Packages

To add a new shared package:

1. Create a new directory in `packages/`
2. Add a `package.json` with name `@marketplace/your-package-name`
3. The workspace will automatically pick it up via `pnpm-workspace.yaml`

## Package Management

This monorepo uses pnpm workspaces. All packages are managed from the root:

- Dependencies are hoisted to the root `node_modules` when possible
- Use `pnpm add <package> -w` to add dependencies to the root
- Use `pnpm add <package> --filter @marketplace/client-next` to add to a specific workspace

## License

ISC

