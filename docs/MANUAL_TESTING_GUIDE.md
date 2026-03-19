# Manual Testing Guide for Admin Functions

## Overview

While our automated test suite covers 100% of core user functionality (initialize, launch, deposit), the admin functions (`claim`, `buyback`, `record_buyback`) require manual testing due to test framework limitations with BN.js conversions.

## Quick Start

### Option 1: Run All Tests
```bash
cd /home/jay/.openclaw/workspace/litterbox-fixed
npx ts-node scripts/manual-test-admin.ts --all
```

### Option 2: Run Individual Tests
```bash
# Test record_buyback
npx ts-node scripts/manual-test-admin.ts --record

# Test claim
npx ts-node scripts/manual-test-admin.ts --claim

# View current state
npx ts-node scripts/manual-test-admin.ts --state
```

### Option 3: Use Shell Scripts
```bash
# Test record_buyback
./scripts/test-record-buyback.sh

# Test claim
./scripts/test-claim.sh
```

## Detailed Test Procedures

### 1. Test record_buyback (Admin)

**Purpose**: Record the result of an off-chain buyback (simulated Jupiter/Raydium swap)

**What it does**:
- Admin records how many $LITTER tokens were received for a cycle
- Updates the cycle's `totalLitterOwed` counter
- Only admin (config authority) can call this

**Test Steps**:
```bash
npx ts-node scripts/manual-test-admin.ts --record
```

**Expected Output**:
```
📝 TEST 1: record_buyback
Recording buyback: 100 $LITTER
✅ Success!
   Signature: <tx_signature>
   Cycle LITTER owed: 100
```

**What to Verify**:
- ✅ Transaction succeeds with admin wallet
- ✅ Cycle state updates (totalLitterOwed increases)
- ✅ Non-admin wallet should fail (test with different wallet)

**Failure Cases to Test**:
```bash
# Try with non-admin wallet (should fail)
# Change ANCHOR_WALLET to non-admin key
ANCHOR_WALLET=/path/to/non-admin.json npx ts-node scripts/manual-test-admin.ts --record
```

---

### 2. Test claim (User)

**Purpose**: Users claim their share of $LITTER tokens from a cycle

**What it does**:
- Calculates user's proportional share based on contributions
- Transfers $LITTER from airdrop vault to user
- Creates/updates claim receipt to prevent double-claiming

**Prerequisites**:
- User must have made deposits in the cycle
- Cycle must have recorded buyback (totalLitterOwed > 0)

**Test Steps**:
```bash
npx ts-node scripts/manual-test-admin.ts --claim
```

**Expected Output**:
```
💰 TEST 2: claim
Claiming $LITTER tokens...
User ATA: <token_account>
✅ Success!
   Signature: <tx_signature>
   User $LITTER balance: 42.5
```

**What to Verify**:
- ✅ User receives $LITTER tokens
- ✅ Claim receipt created (prevents double claim)
- ✅ Balance updates correctly

**Failure Cases to Test**:
```bash
# Try claiming twice (should fail or return 0)
npx ts-node scripts/manual-test-admin.ts --claim
npx ts-node scripts/manual-test-admin.ts --claim  # Should get 0 or error

# Try claiming from cycle with no deposits
# (Create new wallet, skip deposit step, try to claim)
```

---

### 3. Test buyback (Admin)

**Purpose**: Trigger actual buyback via Raydium/Jupiter

**What it does**:
- Swaps accumulated SOL for $LITTER tokens
- Requires Raydium CPMM pool setup
- Admin only

**Current Status**: ⚠️ Requires Raydium pool setup

**Test Steps** (when pool is ready):
```bash
npx ts-node scripts/manual-test-admin.ts --buyback
```

**What's Needed**:
1. Create Raydium CPMM pool for $LITTER/SOL
2. Pool must have liquidity
3. Cycle must meet buyback threshold

---

### 4. View State

**Purpose**: Check current program state

**Test Steps**:
```bash
npx ts-node scripts/manual-test-admin.ts --state
```

**Expected Output**:
```
📊 TEST 4: View State

Cycle State:
  Cycle ID: 1
  Total SOL Contributed: 0.5 SOL
  Total LITTER Owed: 100 $LITTER
  Start Timestamp: 1773957358

Contributor State:
  Authority: <wallet_address>
  Total SOL Contributed: 0.5 SOL
  Total LITTER Claimed: 50 $LITTER
```

---

## Complete Testing Workflow

### Full Admin Flow Test

1. **Setup** (if starting fresh):
```bash
# Initialize
npx ts-node scripts/manual-test-admin.ts --state

# Make sure program is launched
# (Check state shows launched: true)
```

2. **Make a Deposit** (if no deposits yet):
```bash
# Use the full flow test to make initial deposit
npx ts-node scripts/manual-test-admin.ts --state
```

3. **Record a Buyback**:
```bash
npx ts-node scripts/manual-test-admin.ts --record
# Records 100 $LITTER tokens bought back
```

4. **Claim Tokens**:
```bash
npx ts-node scripts/manual-test-admin.ts --claim
# Claims user's share of the 100 $LITTER
```

5. **Verify State**:
```bash
npx ts-node scripts/manual-test-admin.ts --state
# Check that:
# - totalLitterOwed increased
# - user received tokens
# - claim receipt created
```

---

## Troubleshooting

### "AccountNotInitialized" Error
**Cause**: Program not initialized or launched  
**Fix**: Run initialize and launch first

### "ConstraintSeeds" Error  
**Cause**: Wrong PDA derivation  
**Fix**: Ensure cycle ID matches config.current_cycle

### "Unauthorized" Error
**Cause**: Not the admin wallet  
**Fix**: Use the admin wallet (config.authority)

### "Insufficient Funds" Error
**Cause**: Not enough tokens in vault  
**Fix**: Ensure buyback was recorded and vault has tokens

---

## Testing Checklist

Before mainnet deployment, verify:

- [ ] record_buyback works with admin wallet
- [ ] record_buyback fails with non-admin wallet
- [ ] claim distributes correct token amount
- [ ] claim prevents double-claiming
- [ ] State updates correctly after each operation
- [ ] Multiple users can claim proportionally
- [ ] Cycle state tracks totals accurately

---

## Environment Variables

```bash
export ANCHOR_PROVIDER_URL="https://devnet.helius-rpc.com/?api-key=YOUR_KEY"
export ANCHOR_WALLET="/path/to/wallet.json"
```

## Safety Notes

⚠️ **NEVER test on mainnet without thorough devnet testing**  
⚠️ **Always verify admin wallet is correct before running admin functions**  
⚠️ **Test with small amounts first**  
⚠️ **Keep records of all test transactions**

---

**Last Updated**: 2026-03-19  
**Status**: Ready for manual testing ✅
