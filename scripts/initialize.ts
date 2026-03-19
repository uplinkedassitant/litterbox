import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Litterbox } from "../target/types/litterbox";
import { PublicKey, SystemProgram } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  console.log("Provider:", provider.wallet.publicKey.toString());
  console.log("Cluster:", (provider.connection as any)._rpcEndpoint);

  const program = anchor.workspace.Litterbox as Program<Litterbox>;
  console.log("Program ID:", program.programId.toString());

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const [firstCyclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cycle"), Buffer.from(new anchor.BN(0).toArrayLike(Buffer, "le", 8))],
    program.programId
  );

  // Use wallet as fee vault
  const feeVault = provider.wallet.publicKey;

  console.log("\n=== Initializing Program ===");
  console.log("Config PDA:", configPda.toString());
  console.log("First Cycle PDA:", firstCyclePda.toString());
  console.log("Fee Vault:", feeVault.toString());

  try {
    const tx = await program.methods
      .initialize()
      .accounts({
        config: configPda,
        firstCycle: firstCyclePda,
        feeVault: feeVault,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("\n✅ Initialize transaction successful!");
    console.log("Signature:", tx);

    // Fetch and display config
    const config = await program.account.config.fetch(configPda);
    console.log("\n=== Config State ===");
    console.log("Authority:", config.authority.toString());
    console.log("Fee Vault:", config.feeVault.toString());
    console.log("Launched:", config.launched);
    console.log("Current Cycle:", config.currentCycle.toNumber());
    console.log("Launch Threshold:", config.launchThreshold.toNumber() / 1e9, "SOL");
    console.log("Buyback Threshold:", config.buybackThreshold.toNumber() / 1e9, "SOL");

  } catch (error: any) {
    if (error.message?.includes("already in use")) {
      console.log("\n⚠️  Program already initialized!");
      
      // Fetch existing config
      const config = await program.account.config.fetch(configPda);
      console.log("\n=== Existing Config State ===");
      console.log("Authority:", config.authority.toString());
      console.log("Launched:", config.launched);
      console.log("Current Cycle:", config.currentCycle.toNumber());
    } else {
      console.error("\n❌ Error:", error.message);
      throw error;
    }
  }
}

main().catch(console.error);
