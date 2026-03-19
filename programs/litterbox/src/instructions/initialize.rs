use anchor_lang::prelude::*;
use crate::state::{Config, Cycle};

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Global config PDA — seeded [b"config"].
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    /// First cycle (cycle 0) — seeded [b"cycle", 0u64.to_le_bytes()].
    #[account(
        init,
        payer = authority,
        space = 8 + Cycle::INIT_SPACE,
        seeds = [b"cycle", 0u64.to_le_bytes().as_ref()],
        bump
    )]
    pub first_cycle: Account<'info, Cycle>,

    /// SOL account that receives platform fees.
    /// CHECK: This is a plain system account (fee recipient). No data is read from it.
    #[account(mut)]
    pub fee_vault: SystemAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let config = &mut ctx.accounts.config;

    config.authority = ctx.accounts.authority.key();
    config.fee_vault = ctx.accounts.fee_vault.key();
    config.platform_token_mint = Pubkey::default();
    config.treasury_bump = ctx.bumps.config;
    config.fee_vault_bump = 0;
    config.airdrop_vault_bump = 0;
    config.platform_token_bump = 0;
    config.launch_threshold = 10_000_000_000; // 10 SOL in lamports
    config.buyback_threshold = 5_000_000_000;  // 5 SOL in lamports
    config.platform_fee_bps = 100;             // 1%
    config.total_supply = 1_000_000_000_000;  // 1 billion $LITTER (6 decimals)
    config.launched = false;
    config.current_cycle = 0;

    let first_cycle = &mut ctx.accounts.first_cycle;
    first_cycle.cycle_id = 0;
    first_cycle.total_sol_contributed = 0;
    first_cycle.total_litter_owed = 0;
    first_cycle.start_timestamp = Clock::get()?.unix_timestamp;

    msg!("LitterBox initialized. Fee vault: {}", ctx.accounts.fee_vault.key());
    msg!("Launch threshold: {} lamports, Buyback threshold: {} lamports",
        config.launch_threshold, config.buyback_threshold);

    Ok(())
}
