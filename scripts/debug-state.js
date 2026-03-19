const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const fs = require('fs');
const path = require('path');

async function main() {
  const provider = anchor.AnchorProvider.env();
  console.log("Wallet:", provider.wallet.publicKey.toString());
  
  const programId = new PublicKey("APJjaNsaFiED3UPHEPXacs1ck8dzskYTqbBapGqpVwzL");
  const idlPath = path.join(__dirname, '../target/idl/litterbox.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  const program = new anchor.Program(idl, programId, provider);
  
  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
  
  const [cycle0Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cycle"), Buffer.from(new anchor.BN(0).toArrayLike(Buffer, "le", 8))],
    programId
  );
  
  const [cycle1Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cycle"), Buffer.from(new anchor.BN(1).toArrayLike(Buffer, "le", 8))],
    programId
  );
  
  console.log("\n📊 Config PDA:", configPda.toString());
  console.log("Cycle 0 PDA:", cycle0Pda.toString());
  console.log("Cycle 1 PDA:", cycle1Pda.toString());
  
  // Fetch config
  console.log("\n=== Fetching Config ===");
  try {
    const config = await program.account.config.fetch(configPda);
    console.log("✓ Config found");
    console.log("  Current Cycle:", config.currentCycle.toNumber());
    console.log("  Launched:", config.launched);
    console.log("  Launch Threshold:", config.launchThreshold.toNumber() / 1e9, "SOL");
  } catch (e) {
    console.log("✗ Config error:", e.message);
  }
  
  // Check Cycle 0
  console.log("\n=== Checking Cycle 0 ===");
  try {
    const cycle0 = await program.account.cycle.fetch(cycle0Pda);
    console.log("✓ Cycle 0 exists");
    console.log("  Total SOL:", cycle0.totalSolContributed.toNumber() / 1e9);
    console.log("  Total LITTER:", cycle0.totalLitterOwed.toNumber());
  } catch (e) {
    console.log("✗ Cycle 0:", e.message);
  }
  
  // Check Cycle 1
  console.log("\n=== Checking Cycle 1 ===");
  try {
    const cycle1 = await program.account.cycle.fetch(cycle1Pda);
    console.log("✓ Cycle 1 exists");
  } catch (e) {
    console.log("✗ Cycle 1 does not exist:", e.message);
  }
}

main().catch(console.error);
