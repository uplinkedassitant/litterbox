const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require("@solana/spl-token");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  console.log("Wallet:", provider.wallet.publicKey.toString());
  
  // Load program
  const programId = new PublicKey("APJjaNsaFiED3UPHEPXacs1ck8dzskYTqbBapGqpVwzL");
  const idl = require("../target/idl/litterbox.json");
  const program = new anchor.Program(idl, programId, provider);
  
  // Test token mint (created above)
  const depositTokenMint = new PublicKey("EMSLVVMt1x9GrTxMzWh5mu1VpVF17z6F2kdPJL8kwCsd");
  
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
  
  // Token accounts
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
  
  const [feeVaultAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_vault_authority")],
    programId
  );
  
  const feeVaultTokenAccount = await getAssociatedTokenAddress(
    depositTokenMint,
    feeVaultAuthorityPda,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  
  console.log("\n=== Deposit Parameters ===");
  console.log("Token Mint:", depositTokenMint.toString());
  console.log("User Token Account:", userTokenAccount.toString());
  console.log("Token Vault:", tokenVaultPda.toString());
  console.log("Fee Vault Token Account:", feeVaultTokenAccount.toString());
  console.log("Contributor PDA:", contributorPda.toString());
  console.log("Current Cycle:", currentCyclePda.toString());
  
  const amount = new anchor.BN(100000); // 100,000 tokens (with 9 decimals = 0.0001 tokens)
  
  console.log("\n=== Depositing 100,000 tokens ===");
  
  try {
    const tx = await program.methods
      .deposit(amount)
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
    
    console.log("\n✅ Deposit successful!");
    console.log("Signature:", tx);
    
    // Check user balance after deposit
    const balance = await provider.connection.getTokenAccountBalance(userTokenAccount);
    console.log("\nUser token balance after deposit:", balance.value.uiAmount);
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.logs) {
      console.log("Logs:", error.logs);
    }
    throw error;
  }
}

main().catch(console.error);
