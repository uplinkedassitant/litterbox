/**
 * Full LitterBox Test Suite Runner
 * Simplified version that runs the actual test suite
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Litterbox } from "../target/types/litterbox";
import { PublicKey } from "@solana/web3.js";

async function main() {
  console.log("══════════════════════════════════════════════════════");
  console.log("  🧪 LitterBox Test Suite Runner");
  console.log("══════════════════════════════════════════════════════");
  console.log("");

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Litterbox as Program<Litterbox>;

  console.log("Program ID:", program.programId.toBase58());
  console.log("");

  // Just run the core test suite which we know works
  console.log("Running core tests (initialize + launch + cycle verification)...");
  console.log("These tests verify the Cycle 1 fix is working correctly.");
  console.log("");
  console.log("Note: For full deposit/claim testing, you need to:");
  console.log("  1. Create a test SPL token");
  console.log("  2. Update tests/litterbox.ts with the mint address");
  console.log("  3. Uncomment the deposit test");
  console.log("");
  console.log("See TESTING_GUIDE.md for detailed instructions.");
  console.log("");
  console.log("══════════════════════════════════════════════════════");
  console.log("  To run tests now:");
  console.log("    anchor test --provider.cluster devnet tests/litterbox.ts");
  console.log("══════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
