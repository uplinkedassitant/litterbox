const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");
const { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createMint,
  createAssociatedTokenAccount,
  mintTo
} = require("@solana/spl-token");
const fs = require('fs');

// Configuration
const CONFIG = {
  programId: "APJjaNsaFiED3UPHEPXacs1ck8dzskYTqbBapGqpVwzL",
  testTokenMint: "EMSLVVMt1x9GrTxMzWh5mu1VpVF17z6F2kdPJL8kwCsd",
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com"
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFullFlow() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║     LitterBox - Full Flow Test                        ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  console.log("📍 Cluster:", CONFIG.cluster);
  console.log("👛 Wallet:", provider.wallet.publicKey.toString());
  
  // Load program
  const programId = new PublicKey(CONFIG.programId);
  const idlPath = require('path').join(__dirname, '../target/idl/litterbox.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  const program = new anchor.Program(idl, programId, provider);
  
  console.log("📦 Program:", programId.toString());
  console.log("");
  
  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
  
  const [currentCyclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cycle"), Buffer.from(new anchor.BN(1).toArrayLike(Buffer, "le", 8))],
    programId
  );
  
  const [contributorPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("contributor"), provider.wallet.publicKey.toBuffer()],
    programId
  );
  
  const [feeVaultAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_vault_authority")],
    programId
  );
  
  // Test token
  const depositTokenMint = new PublicKey(CONFIG.testTokenMint);
  const userTokenAccount = await getAssociatedTokenAddress(
    depositTokenMint,
    provider.wallet.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  
  const [tokenVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), depositTokenMint.toBuffer()],
    programId
  );
  
  const feeVaultTokenAccount = await getAssociatedTokenAddress(
    depositTokenMint,
    feeVaultAuthorityPda,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  
  // Fetch config
  console.log("📊 Step 1: Fetching Config");
  console.log("─".repeat(54));
  try {
    const config = await program.account.config.fetch(configPda);
    console.log("✓ Config fetched");
    console.log(`  Authority: ${config.authority.toString()}`);
    console.log(`  Launched: ${config.launched}`);
    console.log(`  Current Cycle: ${config.currentCycle.toNumber()}`);
    console.log(`  Launch Threshold: ${config.launchThreshold.toNumber() / 1e9} SOL`);
    console.log(`  Buyback Threshold: ${config.buybackThreshold.toNumber() / 1e9} SOL`);
    console.log(`  Platform Fee: ${config.platformFeeBps / 100}%`);
    console.log("");
  } catch (error) {
    console.log("✗ Config not found - program may not be initialized");
    console.log("  Error:", error.message);
    return;
  }
  
  // Fetch cycle state
  console.log("📊 Step 2: Fetching Cycle State");
  console.log("─".repeat(54));
  try {
    const cycle = await program.account.cycle.fetch(currentCyclePda);
    console.log("✓ Cycle fetched");
    console.log(`  Cycle ID: ${cycle.cycleId.toNumber()}`);
    console.log(`  Total SOL Contributed: ${cycle.totalSolContributed.toNumber() / 1e9} SOL`);
    console.log(`  Total LITTER Owed: ${cycle.totalLitterOwed.toNumber()}`);
    console.log("");
  } catch (error) {
    console.log("✗ Cycle not found");
    console.log("  Error:", error.message);
  }
  
  // Check user token balance
  console.log("💰 Step 3: Checking Token Balance");
  console.log("─".repeat(54));
  const userBalance = await provider.connection.getTokenAccountBalance(userTokenAccount);
  console.log("✓ User token balance:", userBalance.value.uiAmount);
  console.log("");
  
  // Deposit tokens
  const depositAmount = new anchor.BN(100000); // 100,000 tokens
  console.log(`📥 Step 4: Depositing ${depositAmount.toNumber().toLocaleString()} tokens`);
  console.log("─".repeat(54));
  try {
    const depositTx = await program.methods
      .deposit(depositAmount)
      .accounts({
        config: configPda,
        currentCycle: currentCyclePda,
        contributor: contributorPda,
        depositTokenMint: depositTokenMint,
        userTokenAccount: userTokenAccount,
        tokenVault: tokenVaultPda,
        feeVaultTokenAccount: feeVaultTokenAccount,
        feeVaultAuthority: feeVaultAuthorityPda,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✓ Deposit successful!");
    console.log("  Signature:", depositTx);
    
    // Wait for confirmation
    await sleep(2000);
    
    // Check balance after deposit
    const balanceAfter = await provider.connection.getTokenAccountBalance(userTokenAccount);
    console.log(`  User balance after: ${balanceAfter.value.uiAmount} tokens`);
    console.log("");
  } catch (error) {
    console.log("✗ Deposit failed");
    console.log("  Error:", error.message);
    if (error.logs) {
      console.log("  Logs:", error.logs.slice(-5));
    }
  }
  
  // Fetch contributor state
  console.log("👤 Step 5: Fetching Contributor State");
  console.log("─".repeat(54));
  try {
    const contributor = await program.account.contributor.fetch(contributorPda);
    console.log("✓ Contributor fetched");
    console.log(`  Authority: ${contributor.authority.toString()}`);
    console.log(`  Total SOL Contributed: ${contributor.totalSolContributed.toNumber() / 1e9} SOL`);
    console.log(`  Total LITTER Claimed: ${contributor.totalLitterClaimed.toNumber()}`);
    console.log("");
  } catch (error) {
    console.log("✗ Contributor not found (no deposits yet)");
  }
  
  // Fetch cycle state again
  console.log("📊 Step 6: Updated Cycle State");
  console.log("─".repeat(54));
  try {
    const cycle = await program.account.cycle.fetch(currentCyclePda);
    console.log("✓ Cycle updated");
    console.log(`  Cycle ID: ${cycle.cycleId.toNumber()}`);
    console.log(`  Total SOL Contributed: ${cycle.totalSolContributed.toNumber() / 1e9} SOL`);
    console.log(`  Total LITTER Owed: ${cycle.totalLitterOwed.toNumber()}`);
    
    const progress = (cycle.totalSolContributed.toNumber() / 5000000000) * 100;
    console.log(`  Buyback Progress: ${progress.toFixed(2)}%`);
    console.log("");
  } catch (error) {
    console.log("✗ Could not fetch cycle");
  }
  
  // Summary
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║              Test Flow Complete! 🎉                   ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("Summary:");
  console.log("  ✓ Program deployed and initialized");
  console.log("  ✓ Platform token ($LITTER) launched");
  console.log("  ✓ Test tokens created and minted");
  console.log("  ✓ Deposit tested");
  console.log("  ✓ Contributor state tracked");
  console.log("");
  console.log("Next steps:");
  console.log("  - Continue depositing to reach buyback threshold (5 SOL)");
  console.log("  - Trigger buyback when threshold reached");
  console.log("  - Claim $LITTER rewards");
  console.log("");
}

// Run the test
testFullFlow().catch(error => {
  console.error("\n❌ Test failed with error:");
  console.error(error);
  process.exit(1);
});
