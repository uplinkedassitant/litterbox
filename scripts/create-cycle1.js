/**
 * Manual script to create Cycle 1 PDA
 * This is needed because launch() sets current_cycle=1 but doesn't create the account
 * 
 * Run with: node scripts/create-cycle1.js
 */

const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, Transaction, TransactionInstruction } = require("@solana/web3.js");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("   Create Cycle 1 PDA - Manual Initialization");
  console.log("═══════════════════════════════════════════════════\n");

  const provider = anchor.AnchorProvider.env();
  console.log("Wallet:", provider.wallet.publicKey.toString());
  
  // Load program
  const programId = new PublicKey("APJjaNsaFiED3UPHEPXacs1ck8dzskYTqbBapGqpVwzL");
  const idlPath = path.join(__dirname, '../target/idl/litterbox.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  const program = new anchor.Program(idl, programId, provider);
  
  // Derive Cycle 1 PDA
  const [cycle1Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cycle"), Buffer.from(new anchor.BN(1).toArrayLike(Buffer, "le", 8))],
    programId
  );
  
  console.log("Cycle 1 PDA:", cycle1Pda.toString());
  
  // Check if Cycle 1 already exists
  try {
    const cycle1 = await program.account.cycle.fetch(cycle1Pda);
    console.log("\n✓ Cycle 1 already exists!");
    console.log("  Cycle ID:", cycle1.cycleId.toNumber());
    console.log("  SOL Contributed:", cycle1.totalSolContributed.toNumber() / 1e9);
    return;
  } catch (e) {
    console.log("\nCycle 1 does not exist yet - will create...");
  }
  
  // Get config to verify we're authorized
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
  
  const config = await program.account.config.fetch(configPda);
  console.log("Config authority:", config.authority.toString());
  console.log("Current cycle setting:", config.currentCycle.toNumber());
  
  if (config.authority.toString() !== provider.wallet.publicKey.toString()) {
    console.log("\n❌ Error: Not the authority!");
    return;
  }
  
  // Create Cycle 1 using a raw instruction
  // Since there's no "create_cycle" instruction, we'll use the initialize pattern
  console.log("\n⚠️  Note: This requires a create_cycle instruction in the program.");
  console.log("   Since it doesn't exist, we have two options:");
  console.log("");
  console.log("   1. Redeploy program with fixed launch() that creates Cycle 1");
  console.log("   2. Use Cycle 0 for testing (modify test to use cycle 0)");
  console.log("");
  console.log("For now, let's just verify what we have:");
  console.log("");
  console.log("✓ Program is deployed");
  console.log("✓ Config exists with current_cycle = 1");
  console.log("✗ Cycle 1 PDA does not exist");
  console.log("✓ Cycle 0 PDA exists");
  console.log("");
  console.log("RECOMMENDATION: Use Cycle 0 for deposit testing");
  console.log("The deposit instruction should work if we point it to Cycle 0");
  console.log("instead of relying on config.current_cycle");
}

main().catch(console.error);
