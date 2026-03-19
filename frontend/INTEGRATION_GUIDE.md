# LitterBox Frontend Integration Guide

## Program Details
- **Program ID**: `GbDxASiScq4SNjq3Nj5iqYNSkCeyuTLTHSE64pxyAQeD`
- **Network**: Solana Devnet
- **IDL Location**: `src/lib/litterbox.json`
- **Program Types**: `src/lib/program.ts` (update with generated types)

## Quick Start

### 1. Update Program IDL Import
In `src/lib/program.ts`, replace the manual IDL:

```typescript
// OLD (manual IDL)
// const IDL = { ... };

// NEW (generated IDL)
import IDL from "./litterbox.json";
import { Program } from "@coral-xyz/anchor";
import { Litterbox } from "./litterbox";

export const LITTERBOX_PROGRAM_ID = "GbDxASiScq4SNjq3Nj5iqYNSkCeyuTLTHSE64pxyAQeD";

export function getLitterboxProgram(provider: AnchorProvider) {
  return new Program<Litterbox>(IDL, provider);
}
```

### 2. Program State Machine

```typescript
// State Flow
Initialize → Launch → Deposit → Claim
   ↓          ↓         ↓        ↓
 Cycle 0   Cycle 1   Current  Receipt
 created   created   Cycle    generated
```

### 3. Key PDAs Derivation

```typescript
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

const programId = new PublicKey("GbDxASiScq4SNjq3Nj5iqYNSkCeyuTLTHSE64pxyAQeD");

// Config PDA (global state)
const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  programId
);

// Cycle PDAs (one per cycle ID)
function getCyclePda(cycleId: number) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("cycle"),
      new BN(cycleId).toArrayLike(Buffer, "le", 8)
    ],
    programId
  );
}

// Platform Token Mint
const [platformMintPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("platform_token")],
  programId
);

// Contributor PDA (per user)
function getContributorPda(userPublicKey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("contributor"), userPublicKey.toBuffer()],
    programId
  );
}

// Token Vault (per token mint)
function getTokenVaultPda(tokenMint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), tokenMint.toBuffer()],
    programId
  );
}
```

## View-Specific Integration

### Overview View
Fetch current cycle state and display progress:

```typescript
// Fetch config
const config = await program.account.config.fetch(configPda);
const currentCycleId = config.currentCycle.toNumber();

// Fetch current cycle
const currentCyclePda = getCyclePda(currentCycleId);
const cycle = await program.account.cycle.fetch(currentCyclePda);

// Display
const solContributed = cycle.totalSolContributed.toNumber() / 1e9;
const litterOwed = cycle.totalLitterOwed.toNumber();
const progress = (solContributed / 5000) * 100; // Assuming 5000 SOL target
```

### Deposit View
Scan wallet for SPL tokens and deposit:

```typescript
// 1. Get all token accounts from wallet
const tokenAccounts = await connection.getTokenAccountsByOwner(
  userPublicKey,
  { programId: TOKEN_PROGRAM_ID }
);

// 2. For each token, get balance and metadata
const tokens = await Promise.all(
  tokenAccounts.value.map(async (account) => {
    const info = await connection.getAccountInfo(account.pubkey);
    const balance = parseTokenBalance(info);
    return { mint: account.pubkey, balance };
  })
);

// 3. Get prices from Jupiter API
const prices = await fetchJupiterPrices(tokens.map(t => t.mint));

// 4. On deposit, derive current cycle PDA
const config = await program.account.config.fetch(configPda);
const currentCycleId = config.currentCycle.toNumber();
const [currentCyclePda] = getCyclePda(currentCycleId);

// 5. Execute deposit
await program.methods
  .deposit(amount)
  .accounts({
    config: configPda,
    currentCycle: currentCyclePda,
    contributor: getContributorPda(userPublicKey),
    depositTokenMint: tokenMint,
    userTokenAccount: userTokenAccount,
    tokenVault: getTokenVaultPda(tokenMint),
    feeVaultTokenAccount: getFeeVaultPda(tokenMint),
    feeVaultAuthority: getFeeVaultAuthorityPda(),
    authority: userPublicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Claim View
Load past cycles and claimable amounts:

```typescript
// Fetch all cycles (0 to currentCycle)
const config = await program.account.config.fetch(configPda);
const cycles = [];

for (let i = 0; i <= config.currentCycle.toNumber(); i++) {
  const [cyclePda] = getCyclePda(i);
  const cycle = await program.account.cycle.fetch(cyclePda);
  cycles.push(cycle);
}

// For each cycle, calculate claimable amount
cycles.forEach(cycle => {
  const claimable = cycle.totalLitterOwed.sub(cycle.totalLitterClaimed);
  // Display in UI
});

// Claim tokens
await program.methods
  .claim()
  .accounts({
    config: configPda,
    cycle: cyclePda,
    contributor: contributorPda,
    platformTokenMint: platformMintPda,
    airdropVault: airdropVault,
    authority: userPublicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Admin View
Authority-only functions:

```typescript
// Check if user is authority
const config = await program.account.config.fetch(configPda);
const isAuthority = config.authority.equals(userPublicKey);

if (!isAuthority) {
  // Show admin view disabled
  return;
}

// Trigger buyback
await program.methods
  .buyback()
  .accounts({
    config: configPda,
    currentCycle: currentCyclePda,
    platformTokenMint: platformMintPda,
    airdropVault: airdropVault,
    raydiumPool: raydiumPoolPda,
    authority: userPublicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Record buyback result
await program.methods
  .recordBuyback(solAmount, litterAmount)
  .accounts({
    config: configPda,
    cycle: cyclePda,
    authority: userPublicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Error Handling

```typescript
try {
  await program.methods.deposit(amount).rpc();
} catch (error: any) {
  if (error.message?.includes("AccountNotInitialized")) {
    // Program not initialized yet
    showToast("Please initialize the platform first");
  } else if (error.message?.includes("ConstraintSeeds")) {
    // PDA derivation mismatch
    showToast("Invalid cycle - please refresh");
  } else if (error.message?.includes("InsufficientFunds")) {
    showToast("Insufficient token balance");
  } else {
    showToast("Transaction failed");
  }
}
```

## Testing Checklist

- [ ] Overview view shows correct SOL contributed
- [ ] Progress bar updates in real-time
- [ ] Deposit view scans wallet tokens correctly
- [ ] Jupiter API prices display
- [ ] Deposit transaction succeeds
- [ ] Claim view shows all past cycles
- [ ] Claim amounts calculate correctly
- [ ] Admin view only visible to authority
- [ ] Buyback trigger works (admin only)
- [ ] State updates after each action

## Design System Tokens

```css
:root {
  /* Colors */
  --color-ink: #0a0a0a;
  --color-amber: #fbbf24;
  --color-gold: #d4af37;
  
  /* Typography */
  --font-playfair: "Playfair Display", serif;
  --font-dm-sans: "DM Sans", sans-serif;
  --font-dm-mono: "DM Mono", monospace;
  
  /* Effects */
  --grain-overlay: url("/grain.png");
  --gold-glow: 0 0 20px rgba(251, 191, 36, 0.3);
  --frosted-glass: backdrop-filter: blur(12px);
}
```

## Next Steps

1. ✅ Copy generated IDL to `src/lib/litterbox.json`
2. ✅ Update `program.ts` import
3. ⏳ Implement PDA derivation helpers
4. ⏳ Connect Overview view to program state
5. ⏳ Implement wallet scanner for Deposit view
6. ⏳ Add Jupiter API integration
7. ⏳ Wire up Claim view
8. ⏳ Add admin controls
9. ⏳ Test full flow on devnet

## Resources

- **IDL File**: `src/lib/litterbox.json`
- **Program ID**: `GbDxASiScq4SNjq3Nj5iqYNSkCeyuTLTHSE64pxyAQeD`
- **Devnet RPC**: `https://api.devnet.solana.com` (or Helius)
- **Explorer**: https://explorer.solana.com/?cluster=devnet

---

**Questions?** Check `FRONTEND_CONTEXT.md` for detailed program architecture.
**Issues?** See `TESTING_GUIDE.md` for troubleshooting.
