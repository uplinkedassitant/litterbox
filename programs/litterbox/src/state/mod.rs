use anchor_lang::prelude::*;

/// Global program configuration stored in a PDA seeded with [b"config"].
/// Allocated with 8 + Config::INIT_SPACE bytes (8 for the Anchor discriminator).
#[account]
#[derive(InitSpace)]
pub struct Config {

    pub authority: Pubkey,
    pub fee_vault: Pubkey,
    pub platform_token_mint: Pubkey,
    pub treasury_bump: u8,
    pub fee_vault_bump: u8,
    pub airdrop_vault_bump: u8,
    pub platform_token_bump: u8,
    pub launch_threshold: u64,
    pub buyback_threshold: u64,
    pub platform_fee_bps: u16,
    pub total_supply: u64,
    pub launched: bool,
    pub current_cycle: u64,
}

/// Tracks a single buyback/distribution cycle.
/// Seeded with [b"cycle", cycle_id.to_le_bytes()].
#[account]
#[derive(InitSpace)]
pub struct Cycle {
    pub cycle_id: u64,
    pub total_sol_contributed: u64,
    pub total_litter_owed: u64,
    pub start_timestamp: i64,
}

/// Per-user contribution state.
/// Seeded with [b"contributor", authority.key()].
#[account]
#[derive(InitSpace)]
pub struct Contributor {
    pub authority: Pubkey,
    pub total_sol_contributed: u64,
    pub total_litter_claimed: u64,
    pub bump: u8,
}

/// Per-user, per-cycle claim receipt — prevents double claims.
/// Seeded with [b"receipt", cycle_id.to_le_bytes(), authority.key()].
#[account]
#[derive(InitSpace)]
pub struct ClaimReceipt {
    pub cycle_id: u64,
    pub claimant: Pubkey,
    pub litter_claimed: u64,
    pub bump: u8,
}
