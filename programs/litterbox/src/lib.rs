use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

pub use error::ErrorCode;
pub use instructions::*;

// After running `anchor build`, replace this with the output of:
//   solana address -k target/deploy/litterbox-keypair.json
// Or simply run: anchor keys sync
declare_id!("GbDxASiScq4SNjq3Nj5iqYNSkCeyuTLTHSE64pxyAQeD");

#[program]
pub mod litterbox {
    use super::*;

    /// Initialize global config and the genesis cycle (cycle 0).
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    /// Deposit SPL tokens into the current cycle's vault.
    /// Fee is deducted and sent to the fee vault; net amount is tracked.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    /// Mint 100% of the $LITTER supply to the airdrop vault and mark the program as launched.
    pub fn launch(ctx: Context<Launch>) -> Result<()> {
        instructions::launch::handler(ctx)
    }

    /// Hook for Raydium CPMM pool creation (composed client-side).
    pub fn create_pool(ctx: Context<CreatePool>, sol_amount: u64, token_amount: u64) -> Result<()> {
        instructions::launch::create_pool_handler(ctx, sol_amount, token_amount)
    }

    /// Claim the caller's pro-rata $LITTER allocation for a completed cycle.
    /// Creates a ClaimReceipt PDA to prevent double claims.
    pub fn claim(ctx: Context<Claim>, cycle_id: u64) -> Result<()> {
        instructions::claim::handler(ctx, cycle_id)
    }

    /// Verify buyback threshold is met and emit an off-chain swap instruction.
    pub fn buyback(ctx: Context<BuybackAndDistribute>) -> Result<()> {
        instructions::buyback::handler(ctx)
    }

    /// Record the $LITTER received from an off-chain Jupiter swap (authority only).
    pub fn record_buyback(ctx: Context<RecordBuyback>, cycle_id: u64, litter_received: u64) -> Result<()> {
        instructions::buyback::record_buyback_handler(ctx, cycle_id, litter_received)
    }
}
