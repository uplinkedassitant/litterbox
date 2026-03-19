use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{Config, Cycle, Contributor};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.treasury_bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"cycle", &config.current_cycle.to_le_bytes()],
        bump
    )]
    pub current_cycle: Account<'info, Cycle>,

    /// Contributor PDA — created on first deposit if it doesn't exist yet.
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Contributor::INIT_SPACE,
        seeds = [b"contributor", authority.key().as_ref()],
        bump
    )]
    pub contributor: Account<'info, Contributor>,

    /// The SPL token mint being deposited (any valid SPL mint).
    pub deposit_token_mint: Account<'info, Mint>,

    /// User's token account for the deposited mint.
    #[account(
        mut,
        associated_token::mint = deposit_token_mint,
        associated_token::authority = authority
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Program-owned vault that holds deposited tokens.
    /// Plain PDA token account (not an ATA) seeded with [b"vault", mint].
    #[account(
        init_if_needed,
        payer = authority,
        token::mint = deposit_token_mint,
        token::authority = config,
        seeds = [b"vault", deposit_token_mint.key().as_ref()],
        bump
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// Program-owned fee vault token account for the same mint.
    #[account(
        init_if_needed,
        payer = authority,
        token::mint = deposit_token_mint,
        token::authority = fee_vault_authority,
        seeds = [b"fee_vault", deposit_token_mint.key().as_ref()],
        bump
    )]
    pub fee_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Authority PDA for the fee vault — validated by seeds.
    #[account(
        seeds = [b"fee_vault_authority"],
        bump
    )]
    pub fee_vault_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);

    let config = &ctx.accounts.config;
    let fee_bps = config.platform_fee_bps;

    // Calculate fee and net amounts (total debit = amount, not amount + fee)
    let fee_amount = (amount as u128)
        .checked_mul(fee_bps as u128)
        .unwrap()
        .checked_div(10_000)
        .unwrap() as u64;
    let net_amount = amount.checked_sub(fee_amount).unwrap();

    // Transfer net_amount from user → token_vault
    let transfer_to_vault = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        },
    );
    token::transfer(transfer_to_vault, net_amount)?;

    // Transfer fee_amount from user → fee_vault_token_account
    let transfer_fee = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.fee_vault_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        },
    );
    token::transfer(transfer_fee, fee_amount)?;

    // Update cycle SOL-equivalent tracking
    let cycle = &mut ctx.accounts.current_cycle;
    cycle.total_sol_contributed = cycle
        .total_sol_contributed
        .checked_add(net_amount)
        .unwrap();

    // Update contributor state
    let contributor = &mut ctx.accounts.contributor;
    if contributor.authority == Pubkey::default() {
        contributor.authority = ctx.accounts.authority.key();
        contributor.bump = ctx.bumps.contributor;
    }
    contributor.total_sol_contributed = contributor
        .total_sol_contributed
        .checked_add(net_amount)
        .unwrap();

    msg!(
        "Deposited {} tokens | net: {} | fee: {}",
        amount, net_amount, fee_amount
    );

    Ok(())
}
