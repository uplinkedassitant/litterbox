use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Mint, TokenAccount, MintTo};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{Config, Cycle};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct Launch<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.treasury_bump,
        constraint = config.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    /// Platform token mint — PDA seeded [b"platform_token"].
    /// The PDA itself is the mint authority so it can sign MintTo via CpiContext::new_with_signer.
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = platform_token_mint,
        seeds = [b"platform_token"],
        bump
    )]
    pub platform_token_mint: Account<'info, Mint>,

    /// ATA owned by the config PDA — holds 100% of supply for distribution.
    #[account(
        init,
        payer = authority,
        associated_token::mint = platform_token_mint,
        associated_token::authority = config
    )]
    pub airdrop_vault: Account<'info, TokenAccount>,

    /// First post-launch cycle — seeded [b"cycle", 1u64.to_le_bytes()].
    /// MUST be created here because handler sets current_cycle = 1.
    /// Without this, all deposit() calls fail with AccountNotInitialized.
    #[account(
        init,
        payer = authority,
        space = 8 + Cycle::INIT_SPACE,
        seeds = [b"cycle", 1u64.to_le_bytes().as_ref()],
        bump
    )]
    pub cycle_1: Account<'info, Cycle>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Launch>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    require!(!config.launched, ErrorCode::AlreadyLaunched);
    require!(config.treasury_bump > 0, ErrorCode::NotInitialized);

    let platform_token_bump = ctx.bumps.platform_token_mint;
    let supply = config.total_supply;

    // The mint authority is the platform_token_mint PDA itself.
    // Sign the CPI with PDA seeds so the runtime accepts the signature.
    let signer_seeds: &[&[&[u8]]] = &[&[b"platform_token", &[platform_token_bump]]];
    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.platform_token_mint.to_account_info(),
            to: ctx.accounts.airdrop_vault.to_account_info(),
            authority: ctx.accounts.platform_token_mint.to_account_info(),
        },
        signer_seeds,
    );
    token::mint_to(mint_ctx, supply)?;

    // Initialize Cycle 1 — the first post-launch deposit cycle
    let cycle_1 = &mut ctx.accounts.cycle_1;
    cycle_1.cycle_id = 1;
    cycle_1.total_sol_contributed = 0;
    cycle_1.total_litter_owed = 0;
    cycle_1.start_timestamp = Clock::get()?.unix_timestamp;

    // Record mint details in config
    config.platform_token_mint = ctx.accounts.platform_token_mint.key();
    config.platform_token_bump = platform_token_bump;
    config.airdrop_vault_bump = 0;
    config.launched = true;
    config.current_cycle = 1; // Cycle 0 = pre-launch; Cycle 1 = first live cycle

    msg!(
        "Launched! Mint: {} | Supply: {} | Cycle 1 created",
        ctx.accounts.platform_token_mint.key(),
        supply
    );

    Ok(())
}

// ─── Create Raydium CPMM Pool ────────────────────────────────────────────────
#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.treasury_bump,
        constraint = config.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,

    #[account(
        seeds = [b"platform_token"],
        bump = config.platform_token_bump,
        mint::authority = platform_token_mint
    )]
    pub platform_token_mint: Account<'info, Mint>,

    /// CHECK: Raydium CPMM program — verified off-chain before calling.
    pub raydium_cpmm: UncheckedAccount<'info>,

    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn create_pool_handler(
    _ctx: Context<CreatePool>,
    sol_amount: u64,
    token_amount: u64,
) -> Result<()> {
    msg!(
        "Pool creation hook: {} lamports SOL + {} $LITTER",
        sol_amount,
        token_amount
    );
    msg!("LP tokens should be burned immediately for permanent liquidity.");
    Ok(())
}
