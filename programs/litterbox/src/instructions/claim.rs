use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Config, Cycle, Contributor, ClaimReceipt};
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(cycle_id: u64)]
pub struct Claim<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.treasury_bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        seeds = [b"cycle", &cycle_id.to_le_bytes()],
        bump,
        constraint = cycle.cycle_id == cycle_id @ ErrorCode::InvalidCycle
    )]
    pub cycle: Account<'info, Cycle>,

    #[account(
        seeds = [b"contributor", authority.key().as_ref()],
        bump = contributor.bump
    )]
    pub contributor: Account<'info, Contributor>,

    /// Per-user, per-cycle claim receipt — created on first claim, prevents double claims.
    #[account(
        init,
        payer = authority,
        space = 8 + ClaimReceipt::INIT_SPACE,
        seeds = [b"receipt", cycle_id.to_le_bytes().as_ref(), authority.key().as_ref()],
        bump
    )]
    pub claim_receipt: Account<'info, ClaimReceipt>,

    /// Airdrop vault is the ATA of the config PDA for the platform mint.
    #[account(
        mut,
        associated_token::mint = platform_token_mint,
        associated_token::authority = config
    )]
    pub airdrop_vault: Account<'info, TokenAccount>,

    /// User's ATA for the platform token — must exist before claiming.
    #[account(
        mut,
        associated_token::mint = platform_token_mint,
        associated_token::authority = authority
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(address = config.platform_token_mint)]
    pub platform_token_mint: Account<'info, anchor_spl::token::Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Claim>, cycle_id: u64) -> Result<()> {
    let config = &ctx.accounts.config;
    require!(config.launched, ErrorCode::NotLaunched);

    let cycle = &ctx.accounts.cycle;
    let contributor = &ctx.accounts.contributor;

    // Must have litter allocated for this cycle
    require!(cycle.total_litter_owed > 0, ErrorCode::NoContributions);
    require!(cycle.total_sol_contributed > 0, ErrorCode::NoContributions);
    require!(contributor.total_sol_contributed > 0, ErrorCode::NoContributions);

    // Pro-rata share: contributor_sol / total_cycle_sol * total_litter
    // Use u128 for the intermediate multiplication to avoid overflow
    let litter_owed = (contributor.total_sol_contributed as u128)
        .checked_mul(cycle.total_litter_owed as u128)
        .unwrap()
        .checked_div(cycle.total_sol_contributed as u128)
        .unwrap() as u64;

    require!(litter_owed > 0, ErrorCode::NothingToClaim);

    // The airdrop vault is owned by the config PDA — sign with config seeds
    let config_bump = config.treasury_bump;
    let signer_seeds: &[&[&[u8]]] = &[&[b"config", &[config_bump]]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.airdrop_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, litter_owed)?;

    // Record the claim receipt (prevents double-claiming via init above)
    let receipt = &mut ctx.accounts.claim_receipt;
    receipt.cycle_id = cycle_id;
    receipt.claimant = ctx.accounts.authority.key();
    receipt.litter_claimed = litter_owed;
    receipt.bump = ctx.bumps.claim_receipt;

    msg!(
        "Claimed {} $LITTER for cycle {} (contributor share: {}/{})",
        litter_owed,
        cycle_id,
        contributor.total_sol_contributed,
        cycle.total_sol_contributed
    );

    Ok(())
}
