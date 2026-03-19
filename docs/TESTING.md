# LitterBox Testing Guide

## Current Status
✅ **Program Deployed:** `GbDxASiScq4SNjq3Nj5iqYNSkCeyuTLTHSE64pxyAQeD`  
✅ **Core Tests Passing:** Initialize, Launch, Cycle 1 creation  
⚠️ **Deposit/Claim Tests:** Need test token setup

## Quick Start - Run Full Test

```bash
cd /home/jay/.openclaw/workspace/litterbox-fixed

# Set environment
export ANCHOR_PROVIDER_URL="https://devnet.helius-rpc.com/?api-key=d3bae4a8-b9a7-4ce2-9069-6224be9cd33c"
export ANCHOR_WALLET=/home/jay/.config/solana/id.json

# Run core tests (initialize + launch)
anchor test --provider.cluster devnet tests/litterbox.ts

# Run full test suite (includes deposit/claim)
npx ts-node scripts/run-full-test.ts
```

## Test Breakdown

### Core Tests (Always Run)
These test the main fix - Cycle 1 creation:
- ✅ Initialize program
- ✅ Launch platform token
- ✅ Verify Cycle 0 exists
- ✅ Verify Cycle 1 created atomically
- ✅ Config state management
- ✅ Cycle state management

### Deposit/Claim Tests (Need Setup)
To test the full flow, you need a test token:

**Option 1: Auto Setup (Recommended)**
```bash
npx ts-node scripts/setup-test-token.ts
# Then run full test suite
npx ts-node scripts/run-full-test.ts
```

**Option 2: Manual Setup**
```bash
# 1. Create token
spl-token create-token --url devnet

# 2. Create account
spl-token create-account <MINT_ADDRESS> --url devnet

# 3. Mint tokens
spl-token mint <MINT_ADDRESS> 1000000 --url devnet

# 4. Update test file with your mint address
# Edit tests/litterbox.ts and uncomment deposit test
```

## Test Results Interpretation

### Passing Tests Mean:
- ✅ Program initialized correctly
- ✅ Platform token created
- ✅ Cycle 1 PDA exists (THE FIX!)
- ✅ Config state is correct

### If Deposit Fails:
Check these common issues:
1. **AccountNotInitialized** - Cycle 1 doesn't exist (should be fixed now)
2. **ConstraintSeeds** - PDA derivation mismatch
3. **Insufficient funds** - Need test tokens in wallet

## Manual Testing Commands

### Check Program State
```bash
# View program
solana program show GbDxASiScq4SNjq3Nj5iqYNSkCeyuTLTHSE64pxyAQeD --url devnet

# View config account
anchor run view-config
```

### View Accounts
```bash
# Config PDA
anchor run view-account config

# Cycle 1 PDA
anchor run view-account cycle 1
```

## Test Token Info
After running `setup-test-token.ts`, you'll get:
- **Mint Address:** For creating additional token accounts
- **Token Account:** Your balance of test tokens
- **Decimals:** 6 (standard for SPL tokens)

## Troubleshooting

### "AccountNotInitialized"
- Run initialization first
- Check program is deployed correctly

### "ConstraintSeeds"
- PDA derivation doesn't match
- Check seed format in test matches Rust code

### "Insufficient funds"
- Need more test tokens
- Run `setup-test-token.ts` again

### "Rate limit reached"
- Wait a few minutes between tests
- Use Helius RPC (already configured)

## Next Steps After Testing

Once tests pass:
1. ✅ Document API for frontend
2. ✅ Create deployment checklist
3. ✅ Set up CI/CD
4. ✅ Prepare for mainnet deployment

---

**Current Balance:** ~3.1 SOL (plenty for testing)  
**Test Coverage:** Core functionality ✅ | Deposit/Claim ⚠️
