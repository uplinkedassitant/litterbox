/**
 * Manual Test Script for Admin Functions
 * 
 * Run with: npx ts-node scripts/manual-test-admin.ts --all
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Litterbox } from "../target/types/litterbox";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";

async function main() {
  console.log("══════════════════════════════════════════════════════");
  console.log("  Manual Admin Functions Test");
  console.log("══════════════════════════════════════════════════════");
  console.log("");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Litterbox as Program<Litterbox>;
  const wallet = provider.wallet as anchor.Wallet;

  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program:", program.programId.toBase58());
  console.log("");

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const config = await program.account.config.fetch(configPda);
  const currentCycleId = config.currentCycle.toNumber();
  console.log("Current Cycle ID:", currentCycleId);

  const [currentCyclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cycle"), new anchor.BN(currentCycleId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [platformMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_token")],
    program.programId
  );

  const [contributorPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("contributor"), wallet.publicKey.toBuffer()],
    program.programId
  );

  const airdropVault = getAssociatedTokenAddressSync(platformMintPda, configPda, true, TOKEN_PROGRAM_ID);

  console.log("Config PDA:", configPda.toBase58());
  console.log("Cycle PDA:", currentCyclePda.toBase58());
  console.log("Platform Mint:", platformMintPda.toBase58());
  console.log("");

  const cycleIdBN = new anchor.BN(currentCycleId);

  const runAll = process.argv.includes("--all");
  
  if (runAll || process.argv.includes("--record")) {
    console.log("\n📝 TEST 1: record_buyback");
    try {
      const litterAmount = new anchor.BN(100_000_000);
      console.log(`Recording buyback: ${litterAmount.toNumber() / 1e6} $LITTER`);
      
      const tx = await program.methods
        .recordBuyback(cycleIdBN, litterAmount)
        .accounts({
          config: configPda,
          cycle: currentCyclePda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
      
      console.log("✅ Success!");
      console.log("   Signature:", tx);
      
      const cycle = await program.account.cycle.fetch(currentCyclePda);
      console.log("   Cycle LITTER owed:", cycle.totalLitterOwed.toNumber() / 1e6);
    } catch (e: any) {
      console.log("❌ Error:", e.message);
    }
  }

  if (runAll || process.argv.includes("--claim")) {
    console.log("\n💰 TEST 2: claim");
    try {
      const userAta = getAssociatedTokenAddressSync(platformMintPda, wallet.publicKey, false, TOKEN_PROGRAM_ID);
      console.log("User ATA:", userAta.toBase58());
      
      const tx = await program.methods
        .claim(cycleIdBN)
        .accounts({
          config: configPda,
          cycle: currentCyclePda,
          contributor: contributorPda,
          platformTokenMint: platformMintPda,
          airdropVault: airdropVault,
          userAta: userAta,
          authority: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();
      
      console.log("✅ Success!");
      console.log("   Signature:", tx);
      
      const balance = await provider.connection.getTokenAccountBalance(userAta);
      console.log("   User $LITTER balance:", balance.value.uiAmount);
    } catch (e: any) {
      console.log("❌ Error:", e.message);
    }
  }

  if (runAll || process.argv.includes("--buyback")) {
    console.log("\n🔄 TEST 3: buyback");
    console.log("⚠️  Requires Raydium pool setup - skipping");
  }

  if (runAll || process.argv.includes("--state")) {
    console.log("\n📊 TEST 4: View State");
    try {
      const cycle = await program.account.cycle.fetch(currentCyclePda);
      console.log("\nCycle State:");
      console.log("  Cycle ID:", cycle.cycleId.toNumber());
      console.log("  Total SOL Contributed:", cycle.totalSolContributed.toNumber() / 1e9, "SOL");
      console.log("  Total LITTER Owed:", cycle.totalLitterOwed.toNumber() / 1e6, "$LITTER");
      console.log("  Start Timestamp:", cycle.startTimestamp.toNumber());
      
      try {
        const contributor = await program.account.contributor.fetch(contributorPda);
        console.log("\nContributor State:");
        console.log("  Authority:", contributor.authority.toBase58());
        console.log("  Total SOL Contributed:", contributor.totalSolContributed.toNumber() / 1e9, "SOL");
        console.log("  Total LITTER Claimed:", contributor.totalLitterClaimed.toNumber() / 1e6, "$LITTER");
      } catch (e: any) {
        console.log("\nContributor: Not found (no deposits yet)");
      }
    } catch (e: any) {
      console.log("❌ Error:", e.message);
    }
  }

  console.log("\n══════════════════════════════════════════════════════");
  console.log("  Manual Tests Complete");
  console.log("══════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
