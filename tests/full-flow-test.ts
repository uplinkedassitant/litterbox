import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Litterbox } from "../target/types/litterbox";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { assert } from "chai";

describe("litterbox - full flow test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Litterbox as Program<Litterbox>;
  const authority = provider.wallet as anchor.Wallet;

  // Test token mint (created in setup)
  const TEST_TOKEN_MINT = new PublicKey("EMSLVVMt1x9GrTxMzWh5mu1VpVF17z6F2kdPJL8kwCsd");

  // PDAs
  let configPda: PublicKey;
  let currentCyclePda: PublicKey;
  let contributorPda: PublicKey;
  let feeVaultAuthorityPda: PublicKey;
  let tokenVaultPda: PublicKey;
  let feeVaultTokenAccountPda: PublicKey;
  let userTokenAccount: PublicKey;

  before(async () => {
    // Derive all PDAs
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    // Get current cycle from config (after launch, this should be 1)
    const config = await program.account.config.fetch(configPda);
    const currentCycleId = config.currentCycle.toNumber();
    
    // Derive PDA for the current active cycle (NOT hardcoded to 0!)
    [currentCyclePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("cycle"), Buffer.from(new anchor.BN(currentCycleId).toArrayLike(Buffer, "le", 8))],
      program.programId
    );

    [contributorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("contributor"), authority.publicKey.toBuffer()],
      program.programId
    );

    [feeVaultAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_vault_authority")],
      program.programId
    );

    [tokenVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), TEST_TOKEN_MINT.toBuffer()],
      program.programId
    );

    userTokenAccount = await getAssociatedTokenAddress(
      TEST_TOKEN_MINT,
      authority.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  });

  it("fetches config state", async () => {
    const config = await program.account.config.fetch(configPda);
    console.log("\n📊 Config State:");
    console.log(` Authority: ${config.authority.toString()}`);
    console.log(` Launched: ${config.launched}`);
    console.log(` Current Cycle: ${config.currentCycle.toNumber()}`);
    console.log(` Launch Threshold: ${config.launchThreshold.toNumber() / 1e9} SOL`);
    console.log(` Buyback Threshold: ${config.buybackThreshold.toNumber() / 1e9} SOL`);
    console.log(` Platform Fee: ${config.platformFeeBps / 100}%`);
    assert.equal(config.launched, true);
  });

  it("fetches cycle state", async () => {
    const cycle = await program.account.cycle.fetch(currentCyclePda);
    console.log("\n📊 Cycle State:");
    console.log(` Cycle ID: ${cycle.cycleId.toNumber()}`);
    console.log(` Total SOL Contributed: ${cycle.totalSolContributed.toNumber() / 1e9} SOL`);
    console.log(` Total LITTER Owed: ${cycle.totalLitterOwed.toNumber()}`);
    
    // Verify cycle ID matches config.current_cycle
    const config = await program.account.config.fetch(configPda);
    const expectedCycleId = config.currentCycle.toNumber();
    assert.equal(cycle.cycleId.toNumber(), expectedCycleId);
  });

  it("checks user token balance", async () => {
    const balance = await provider.connection.getTokenAccountBalance(userTokenAccount);
    console.log("\n💰 User Token Balance:");
    console.log(` Balance: ${balance.value.uiAmount} tokens`);
    assert.isTrue(balance.value.amount > "0");
  });

  it("deposits tokens", async () => {
    const depositAmount = new anchor.BN(100000); // 100,000 tokens
    console.log(`\n📥 Depositing ${depositAmount.toNumber().toLocaleString()} tokens...`);
    
    const tx = await program.methods
      .deposit(depositAmount)
      .accounts({
        config: configPda,
        currentCycle: currentCyclePda,
        contributor: contributorPda,
        depositTokenMint: TEST_TOKEN_MINT,
        userTokenAccount: userTokenAccount,
        tokenVault: tokenVaultPda,
        feeVaultTokenAccount: feeVaultTokenAccountPda,
        feeVaultAuthority: feeVaultAuthorityPda,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✓ Deposit successful!");
    console.log(` Signature: ${tx}`);

    // Check balance after deposit
    const balanceAfter = await provider.connection.getTokenAccountBalance(userTokenAccount);
    console.log(` User balance after: ${balanceAfter.value.uiAmount} tokens`);
  });

  it("fetches contributor state", async () => {
    try {
      const contributor = await program.account.contributor.fetch(contributorPda);
      console.log("\n👤 Contributor State:");
      console.log(` Authority: ${contributor.authority.toString()}`);
      console.log(` Total SOL Contributed: ${contributor.totalSolContributed.toNumber() / 1e9} SOL`);
      console.log(` Total LITTER Claimed: ${contributor.totalLitterClaimed.toNumber()}`);
    } catch (e: any) {
      console.log("\n⚠ Contributor not found (no deposits yet)");
    }
  });

  it("fetches updated cycle state", async () => {
    const cycle = await program.account.cycle.fetch(currentCyclePda);
    console.log("\n📊 Updated Cycle State:");
    console.log(` Cycle ID: ${cycle.cycleId.toNumber()}`);
    console.log(` Total SOL Contributed: ${cycle.totalSolContributed.toNumber() / 1e9} SOL`);
    console.log(` Total LITTER Owed: ${cycle.totalLitterOwed.toNumber()}`);
    const progress = (cycle.totalSolContributed.toNumber() / 5000000000) * 100;
    console.log(` Buyback Progress: ${progress.toFixed(2)}%`);
  });
});
