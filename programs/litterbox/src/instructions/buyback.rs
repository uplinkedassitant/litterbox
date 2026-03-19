use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::{Config, Cycle};
use crate::error::ErrorCode;

// ─── Buyback trigger ─────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct BuybackAndDistribute<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.treasury_bump,
        constraint = config.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"cycle", &config.current_cycle.to_le_bytes()],
        bump
    )]
    pub current_cycle: Account<'info, Cycle>,

    #[account(address = config.platform_token_mint)]
    pub platform_token_mint: Account<'info, anchor_spl::token::Mint>,

    /// CHECK: Jupiter aggregator program (v6 on devnet: JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4).
    /// The actual swap is composed client-side; this account is recorded for auditability.
    pub jupiter_program: UncheckedAccount<'info>,

    /// Airdrop vault — ATA of the config PDA for the platform token.
    #[account(
        mut,
        associated_token::mint = platform_token_mint,
        associated_token::authority = config
    )]
    pub airdrop_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BuybackAndDistribute>) -> Result<()> {
    let config = &ctx.accounts.config;
    require!(config.launched, ErrorCode::NotLaunched);

    let cycle = &ctx.accounts.current_cycle;
    let sol_amount = cycle.total_sol_contributed;

    require!(
        sol_amount >= config.buyback_threshold,
        ErrorCode::ThresholdNotReached
    );

    msg!(
        "Buyback approved for cycle {} | {} lamports available",
        cycle.cycle_id,
        sol_amount
    );
    msg!("Step 1: Swap SOL -> $LITTER off-chain via Jupiter (devnet endpoint).");
    msg!("Step 2: Call record_buyback with the $LITTER amount received.");

    Ok(())
}

// ─── Record buyback result (authority-gated) ─────────────────────────────────

#[derive(Accounts)]
#[instruction(cycle_id: u64)]
pub struct RecordBuyback<'info> {
    /// Config is included so we can verify the caller is the program authority.
    #[account(
        seeds = [b"config"],
        bump = config.treasury_bump,
        constraint = config.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"cycle", &cycle_id.to_le_bytes()],
        bump,
        constraint = cycle.cycle_id == cycle_id @ ErrorCode::InvalidCycle
    )]
    pub cycle: Account<'info, Cycle>,

    /// Must be the program authority — enforced by the config constraint above.
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn record_buyback_handler(
    ctx: Context<RecordBuyback>,
    cycle_id: u64,
    litter_received: u64,
) -> Result<()> {
    require!(litter_received > 0, ErrorCode::NothingToClaim);

    let cycle = &mut ctx.accounts.cycle;
    cycle.total_litter_owed = litter_received;

    msg!(
        "Recorded buyback: cycle {} | {} $LITTER available for claims",
        cycle_id,
        litter_received
    );

    Ok(())
}
