import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Litterbox } from "../target/types/litterbox";
import { PublicKey, SystemProgram, Keypair, } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, } from "@solana/spl-token";
import { assert } from "chai";

describe("litterbox", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Litterbox as Program<Litterbox>;
  const authority = provider.wallet as anchor.Wallet;

  // PDAs
  let configPda: PublicKey;
  let configBump: number;
  let cycle0Pda: PublicKey;
  let cycle1Pda: PublicKey;
  let platformMintPda: PublicKey;
  let airdropVault: PublicKey;

  // Devnet fee vault (authority wallet for testing)
  const feeVault = authority.publicKey;

  before(async () => {
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [cycle0Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("cycle"), Buffer.from(new anchor.BN(0).toArrayLike(Buffer, "le", 8))],
      program.programId
    );

    [cycle1Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("cycle"), Buffer.from(new anchor.BN(1).toArrayLike(Buffer, "le", 8))],
      program.programId
    );

    [platformMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_token")],
      program.programId
    );

    airdropVault = await getAssociatedTokenAddress(platformMintPda, configPda, true);

    console.log(" Program ID: ", program.programId.toBase58());
    console.log(" Config PDA: ", configPda.toBase58());
    console.log(" Cycle 0 PDA: ", cycle0Pda.toBase58());
    console.log(" Cycle 1 PDA: ", cycle1Pda.toBase58());
    console.log(" Platform Mint: ", platformMintPda.toBase58());
    console.log(" Airdrop Vault: ", airdropVault.toBase58());
  });

  // ─── Initialize ───────────────────────────────────────────────────────────
  it("initializes the program", async () => {
    let alreadyInitialized = false;
    
    try {
      const tx = await program.methods
        .initialize()
        .accounts({
          config: configPda,
          firstCycle: cycle0Pda,
          feeVault: feeVault,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(" ✔ initialize tx:", tx);
    } catch (e: any) {
      if (e.message?.includes("already in use")) {
        console.log(" ⚠ Already initialized — skipping");
        alreadyInitialized = true;
      } else {
        throw e;
      }
    }

    const config = await program.account.config.fetch(configPda);
    assert.equal(config.authority.toBase58(), authority.publicKey.toBase58());
    
    // Only check initial state if we just initialized (not if it was already initialized)
    if (!alreadyInitialized) {
      assert.equal(config.launched, false);
      assert.equal(config.currentCycle.toNumber(), 0);
    }
    
    console.log(" Config currentCycle:", config.currentCycle.toNumber());
  });

  // ─── Launch ───────────────────────────────────────────────────────────────
  it("launches the platform token and creates Cycle 1", async () => {
    try {
      const tx = await program.methods
        .launch()
        .accounts({
          config: configPda,
          platformTokenMint: platformMintPda,
          airdropVault: airdropVault,
          cycle1: cycle1Pda, // Fix: Cycle 1 created atomically in launch()
          authority: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(" ✔ launch tx:", tx);
    } catch (e: any) {
      if (e.message?.includes("AlreadyLaunched") || e.message?.includes("already in use")) {
        console.log(" ⚠ Already launched — skipping");
      } else {
        throw e;
      }
    }

    const config = await program.account.config.fetch(configPda);
    assert.equal(config.launched, true);
    assert.equal(config.currentCycle.toNumber(), 1);
    console.log(" Platform mint: ", config.platformTokenMint.toBase58());
    console.log(" Current cycle: ", config.currentCycle.toNumber());
  });

  // ─── Cycle state ──────────────────────────────────────────────────────────
  it("verifies Cycle 0 exists", async () => {
    const cycle = await program.account.cycle.fetch(cycle0Pda);
    assert.equal(cycle.cycleId.toNumber(), 0);
    console.log(" Cycle 0 SOL contributed:", cycle.totalSolContributed.toNumber());
  });

  it("verifies Cycle 1 was created by launch()", async () => {
    const cycle = await program.account.cycle.fetch(cycle1Pda);
    assert.equal(cycle.cycleId.toNumber(), 1);
    // Note: totalSolContributed may be > 0 if tests run after full-flow test
    // The important check is that Cycle 1 PDA exists (which proves atomic creation worked)
    console.log(` Cycle 1 exists ✔ | SOL contributed: ${cycle.totalSolContributed.toNumber() / 1e9} | start timestamp:`, cycle.startTimestamp.toNumber());
  });

  // ─── Deposit (requires a devnet SPL token) ────────────────────────────────
  //
  // To test deposit:
  // 1. spl-token create-token --url devnet
  // 2. spl-token create-account <MINT> --url devnet
  // 3. spl-token mint <MINT> 1000 --url devnet
  // 4. Paste MINT below and uncomment
  // it("deposits tokens into Cycle 1", async () => {
  //   const depositMint = new PublicKey("YOUR_DEVNET_MINT_HERE");
  //   // const userAta = await getAssociatedTokenAddress(depositMint, authority.publicKey);
  //   // const [tokenVault] = PublicKey.findProgramAddressSync(
  //   //   [Buffer.from("vault"), depositMint.toBuffer()],
  //   //   program.programId
  //   // );
  //   // const [feeVaultAta] = PublicKey.findProgramAddressSync(
  //   //   [Buffer.from("fee_vault"), depositMint.toBuffer()],
  //   //   program.programId
  //   // );
  //   // const [feeVaultAuthority] = PublicKey.findProgramAddressSync(
  //   //   [Buffer.from("fee_vault_authority")],
  //   //   program.programId
  //   // );
  //   // const [contributorPda] = PublicKey.findProgramAddressSync(
  //   //   [Buffer.from("contributor"), authority.publicKey.toBuffer()],
  //   //   program.programId
  //   // );
  //
  //   // const amount = new anchor.BN(1_000_000); // 1 token (6 decimals)
  //   // const tx = await program.methods
  //   //   .deposit(amount)
  //   //   .accounts({
  //   //     config: configPda,
  //   //     currentCycle: cycle1Pda,
  //   //     contributor: contributorPda,
  //   //     depositTokenMint: depositMint,
  //   //     userTokenAccount: userAta,
  //   //     tokenVault,
  //   //     feeVaultTokenAccount: feeVaultAta,
  //   //     feeVaultAuthority,
  //   //     authority: authority.publicKey,
  //   //     tokenProgram: TOKEN_PROGRAM_ID,
  //   //     associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //   //     systemProgram: SystemProgram.programId,
  //   //   })
  //   //   .rpc();
  //   // console.log(" ✔ deposit tx:", tx);
  //
  //   // const cycle = await program.account.cycle.fetch(cycle1Pda);
  //   // assert.ok(cycle.totalSolContributed.toNumber() > 0);
  //   // console.log(" Cycle 1 SOL contributed:", cycle.totalSolContributed.toNumber());
  // });

  // ─── Record Buyback (authority-only, simulates off-chain Jupiter swap) ────
  // it("records a simulated buyback for Cycle 1", async () => {
  //   const litterAmount = new anchor.BN(500_000_000); // 500 $LITTER
  //   const tx = await program.methods
  //     .recordBuyback(new anchor.BN(1), litterAmount)
  //     .accounts({
  //       config: configPda,
  //       cycle: cycle1Pda,
  //       authority: authority.publicKey,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .rpc();
  //   console.log(" ✔ recordBuyback tx:", tx);
  //
  //   const cycle = await program.account.cycle.fetch(cycle1Pda);
  //   assert.equal(cycle.totalLitterOwed.toNumber(), 500_000_000);
  // });
});
