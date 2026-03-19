use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Program has already been launched")]
    AlreadyLaunched,

    #[msg("Program has not been initialized")]
    NotInitialized,

    #[msg("Program has not been launched yet")]
    NotLaunched,

    #[msg("Invalid cycle ID")]
    InvalidCycle,

    #[msg("Tokens already claimed for this cycle")]
    AlreadyClaimed,

    #[msg("No contributions recorded for this cycle")]
    NoContributions,

    #[msg("Nothing to claim")]
    NothingToClaim,

    #[msg("Buyback threshold has not been reached")]
    ThresholdNotReached,

    #[msg("Unauthorized: caller is not the program authority")]
    Unauthorized,

    #[msg("Invalid amount: must be greater than zero")]
    InvalidAmount,
}
