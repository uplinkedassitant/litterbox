# 🗑️ LitterBox

**Consolidate dust tokens into real value on Solana**

LitterBox is a platform that allows users to deposit their "dust" tokens (small, otherwise useless token balances) into a collective pool. The platform periodically buybacks $LITTER tokens from the market and distributes them proportionally to contributors.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-purple?logo=solana)](https://solana.com/)
[![Anchor Framework](https://img.shields.io/badge/Anchor-0.32.1-blue)](https://www.anchor-lang.com/)

## 📖 Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Program Architecture](#program-architecture)
- [Development](#development)
- [Testing](#testing)
- [Frontend Integration](#frontend-integration)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **Dust Token Consolidation**: Convert useless dust tokens into valuable $LITTER tokens
- **Automated Buybacks**: Platform automatically buybacks tokens when threshold is met
- **Proportional Rewards**: Contributors receive $LITTER proportional to their contribution
- **Transparent Cycles**: Each cycle tracks contributions and rewards transparently
- **Low Fees**: Minimal platform fee (configurable, default 1%)
- **Upgradeable**: Program is upgradeable for future improvements

## 🔄 How It Works

### 1. Initialize
Platform administrator initializes the program, creating:
- Config PDA (global state)
- Cycle 0 (genesis cycle, pre-launch)

### 2. Launch
Administrator launches the platform:
- Creates $LITTER token mint (platform token)
- Creates Cycle 1 (first active cycle)
- Mints total supply to airdrop vault

### 3. Deposit
Users deposit dust tokens:
- User approves token transfer
- Tokens transferred to program vault
- User's contribution tracked in Contributor PDA
- Cycle tracks total SOL-equivalent contributed

### 4. Buyback (Admin)
When threshold met, admin triggers buyback:
- Off-chain swap via Jupiter/Raydium
- $LITTER tokens purchased
- Result recorded on-chain

### 5. Claim
Users claim their $LITTER rewards:
- Proportional to their contribution
- Based on cycle's total LITTER owed
- Receipts generated for tracking

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- Rust v1.70+
- Solana CLI v1.16+
- Anchor CLI v0.32+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/litterbox.git
cd litterbox

# Install dependencies
yarn install

# Build the program
anchor build

# Deploy to devnet (optional)
anchor deploy --provider.cluster devnet
```

### Quick Start

```bash
# Initialize the program
anchor run initialize

# Launch the platform
anchor run launch

# Run tests
anchor test
```

## 🏗️ Program Architecture

### Accounts

- **Config**: Global state (authority, thresholds, fees)
- **Cycle**: Per-cycle state (contributions, rewards)
- **Contributor**: User-specific state (contributions, claims)
- **Token Vaults**: Program-owned vaults for deposited tokens
- **Platform Mint**: $LITTER token mint (PDA-controlled)

### Instructions

- `initialize`: Initialize program state
- `launch`: Launch platform and create Cycle 1
- `deposit`: Deposit dust tokens
- `claim`: Claim $LITTER rewards
- `buyback`: Trigger buyback (admin only)
- `record_buyback`: Record buyback result (admin only)

### PDAs

```typescript
// Config
const [configPda] = findProgramAddress([b"config"]);

// Cycles
const [cyclePda] = findProgramAddress([b"cycle", cycleId.to_le_bytes()]);

// Contributor
const [contributorPda] = findProgramAddress([b"contributor", userPublicKey]);

// Token Vault
const [vaultPda] = findProgramAddress([b"vault", mintPublicKey]);
```

## 🛠️ Development

### Project Structure

```
litterbox/
├── programs/           # Anchor program (Rust)
│   └── litterbox/
│       ├── src/
│       │   ├── instructions/
│       │   │   ├── initialize.rs
│       │   │   ├── launch.rs
│       │   │   ├── deposit.rs
│       │   │   ├── claim.rs
│       │   │   ├── buyback.rs
│       │   │   └── mod.rs
│       │   ├── state/
│       │   │   ├── config.rs
│       │   │   ├── cycle.rs
│       │   │   ├── contributor.rs
│       │   │   └── mod.rs
│       │   ├── error.rs
│       │   └── lib.rs
│       └── Cargo.toml
├── tests/              # Test suite (TypeScript)
│   ├── litterbox.ts
│   └── full-flow-test.ts
├── migrations/         # Deploy scripts
├── scripts/            # Utility scripts
├── frontend/           # React frontend
└── docs/               # Documentation
```

### Build Commands

```bash
# Build program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run local validator
anchor localnet
```

## 🧪 Testing

```bash
# Run all tests
anchor test

# Run specific test file
anchor test tests/litterbox.ts

# Run with coverage
anchor test --coverage
```

### Test Coverage

- ✅ Initialize program
- ✅ Launch platform
- ✅ Create cycles
- ✅ Deposit tokens
- ✅ Claim rewards
- ✅ Buyback mechanics
- ✅ Admin controls

## 🎨 Frontend Integration

See [Frontend Guide](docs/FRONTEND.md) for complete integration instructions.

Quick start:

```bash
cd frontend
yarn install
yarn dev
```

## 📚 Documentation

- [Program Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Frontend Guide](docs/FRONTEND.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Testing Guide](docs/TESTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. Make changes to program or tests
2. Run `anchor build`
3. Run `anchor test`
4. Ensure all tests pass
5. Submit PR with description

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [litterbox.finance](https://litterbox.finance) (coming soon)
- **Documentation**: [docs.litterbox.finance](https://docs.litterbox.finance)
- **Discord**: [Discord](https://discord.gg/litterbox) (coming soon)
- **Twitter**: [@litterbox](https://twitter.com/litterbox) (coming soon)

## 🙏 Acknowledgments

- Solana Foundation for the ecosystem
- Anchor Framework for the development framework
- Jupiter Aggregator for swap functionality
- Raydium for liquidity pools

---

**Built with ❤️ on Solana**
