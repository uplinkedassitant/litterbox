/**
 * Setup Test Token Script
 * 
 * Creates a devnet SPL token for testing LitterBox deposits
 * Run this once before running deposit/claim tests
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Litterbox } from "../target/types/litterbox";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

async function main() {
  console.log("══════════════════════════════════════════════════════");
  console.log("  🪙 Creating Test Token for LitterBox");
  console.log("══════════════════════════════════════════════════════");
  console.log("");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = provider.wallet as anchor.Wallet;

  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Balance:", await provider.connection.getBalance(wallet.publicKey));
  console.log("");

  // Create test token mint
  console.log("Creating test token mint...");
  const mint = await createMint(
    provider.connection,
    wallet.payer,
    wallet.publicKey,
    wallet.publicKey,
    6, // decimals
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );
  console.log("✅ Token Mint:", mint.toBase58());

  // Create ATA for wallet
  console.log("Creating associated token account...");
  const ata = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    wallet.payer,
    mint,
    wallet.publicKey,
    undefined,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("✅ Token Account:", ata.address.toBase58());

  // Mint tokens
  console.log("Minting 1,000,000 tokens...");
  const mintAmount = 1_000_000_000; // 1 million tokens (6 decimals)
  await mintTo(
    provider.connection,
    wallet.payer,
    mint,
    ata.address,
    wallet.publicKey,
    mintAmount,
    undefined,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );
  console.log("✅ Minted:", mintAmount / 1_000_000, "tokens");

  console.log("");
  console.log("══════════════════════════════════════════════════════");
  console.log("  Test Token Created Successfully!");
  console.log("══════════════════════════════════════════════════════");
  console.log("");
  console.log("Add this to your test file:");
  console.log("─────────────────────────────────────────────────────");
  console.log(`const TEST_TOKEN_MINT = new PublicKey("${mint.toBase58()}");`);
  console.log(`const TEST_TOKEN_ACCOUNT = new PublicKey("${ata.address.toBase58()}");`);
  console.log("");
  console.log("Then uncomment the deposit test and paste these values!");
  console.log("");
  console.log("Token Info:");
  console.log("  Mint:", mint.toBase58());
  console.log("  Account:", ata.address.toBase58());
  console.log("  Balance:", mintAmount / 1_000_000, "tokens");
  console.log("");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
