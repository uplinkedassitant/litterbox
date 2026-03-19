const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, Keypair } = require("@solana/web3.js");
const fs = require('fs');
const path = require('path');

async function main() {
  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  console.log("Wallet:", provider.wallet.publicKey.toString());
  console.log("Cluster:", provider.connection.rpcEndpoint);
  
  // Use hardcoded program ID
  const programId = new PublicKey("APJjaNsaFiED3UPHEPXacs1ck8dzskYTqbBapGqpVwzL");
  
  console.log("Program ID:", programId.toString());
  
  // Create program instance with minimal IDL
  const idl = {
    version: "0.1.0",
    name: "litterbox",
    instructions: [
      {
        name: "initialize",
        accounts: [
          { name: "config", isWritable: true, isSigner: false },
          { name: "firstCycle", isWritable: true, isSigner: false },
          { name: "feeVault", isWritable: true, isSigner: false },
          { name: "authority", isWritable: true, isSigner: true },
          { name: "systemProgram", isWritable: false, isSigner: false },
        ],
        args: [],
      }
    ],
    accounts: [
      { name: "Config", type: {} },
      { name: "Cycle", type: {} }
    ]
  };
  
  const program = new anchor.Program(idl, programId, provider);
  
  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
  
  const [firstCyclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cycle"), Buffer.from(new anchor.BN(0).toArrayLike(Buffer, "le", 8))],
    programId
  );
  
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
    
    // Try to fetch config
    try {
      const config = await provider.connection.getAccountInfo(configPda);
      if (config) {
        console.log("\n✅ Config account created successfully!");
        console.log("Config data size:", config.data.length, "bytes");
      }
    } catch (e) {
      console.log("\nConfig account check:", e.message);
    }
    
  } catch (error) {
    if (error.message?.includes("already in use")) {
      console.log("\n⚠️  Program already initialized!");
    } else {
      console.error("\n❌ Error:", error.message);
      throw error;
    }
  }
}

main().catch(console.error);
