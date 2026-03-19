# LitterBox Frontend

## Status: Ready for Integration ✅

### What's Done
- ✅ Program deployed to devnet: `GbDxASiScq4SNjq3Nj5iqYNSkCeyuTLTHSE64pxyAQeD`
- ✅ Core functionality verified (initialize, launch, cycle creation)
- ✅ IDL generated and copied to `src/lib/litterbox.json`
- ✅ Integration guide created
- ✅ UI shell built (Overview, Deposit, Claim, Admin views)
- ✅ Design system implemented (dark ink/amber, gold accents, grain texture)

### Next Steps for Frontend Developer

1. **Update Program Import** (CRITICAL)
   In `src/lib/program.ts`:
   ```typescript
   import IDL from "./litterbox.json";
   ```

2. **Implement PDA Helpers**
   Use the functions from `INTEGRATION_GUIDE.md` to derive PDAs

3. **Connect Views**
   - Overview: Fetch config + current cycle
   - Deposit: Scan wallet + Jupiter API
   - Claim: Load all cycles + claimable amounts
   - Admin: Authority checks + buyback controls

4. **Test Flow**
   ```bash
   # 1. Initialize
   # 2. Launch (creates Cycle 1)
   # 3. Deposit (to current cycle)
   # 4. Claim (after buyback)
   ```

### Important Notes

⚠️ **Cycle State Machine**:
- After `launch()`, `config.current_cycle = 1`
- All deposits go to the current cycle (Cycle 1+)
- Cycle 0 is the genesis cycle (pre-launch)

⚠️ **PDA Derivation**:
- Must use `config.current_cycle` value to derive the correct cycle PDA
- Don't hardcode cycle 0 - use the value from config!

### Files to Review

- `INTEGRATION_GUIDE.md` - Complete integration instructions
- `src/lib/litterbox.json` - Generated IDL (33KB)
- `../litterbox-fixed/FRONTEND_CONTEXT.md` - Program architecture
- `../litterbox-fixed/TESTING_GUIDE.md` - Testing instructions

### Testing

```bash
# Run tests
npm test

# Or use Anchor CLI
anchor test --provider.cluster devnet
```

### Questions?

1. **PDA derivation?** → See `INTEGRATION_GUIDE.md` section 2
2. **State machine?** → See `FRONTEND_CONTEXT.md` 
3. **Testing issues?** → See `TESTING_GUIDE.md`

---

**Ready to integrate!** 🚀
