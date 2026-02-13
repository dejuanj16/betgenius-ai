# BetGenius AI - Scheduled Tests

## NHL Filter Test - February 26, 2026

**Purpose:** Test completed games filtering when NHL resumes from Olympic Break

**Why this date:** NHL is on Olympic Break from Feb 10-25, 2026. Regular season resumes Feb 26.

### Test Commands

```bash
# Full test suite (run on Feb 26 or later)
node scripts/testNHLFilter.js

# Quick status check
node scripts/testNHLFilter.js --check

# Monitor mode (watch games go FINAL in real-time)
node scripts/testNHLFilter.js --monitor

# Custom interval (every 60 seconds)
node scripts/testNHLFilter.js --monitor --interval=60
```

### What the test verifies

1. ✅ NHL games are being fetched (no longer Olympic Break)
2. ✅ Props are being served before games go FINAL
3. ✅ When a game goes FINAL, props for those teams are filtered out
4. ✅ Team abbreviation normalization works (e.g., LA/LAK)

### Expected Results

- **PASS:** 0 props from completed teams after games go FINAL
- **FAIL:** Props found for teams whose games are completed

### Related Code

- `server.js` - `filterCompletedGameProps()` function
- `server.js` - `COMPLETED_TEAMS_CACHE` object
- `server.js` - `normalizeTeamAbbr()` function
- `server.js` - `fetchTodaysGames()` updates cache when games complete

---

## NBA Filter Test - ~February 17, 2026

**Purpose:** Test filtering when NBA resumes after All-Star Weekend

**Status:** NBA All-Star Weekend is Feb 14-16, 2026. Regular season resumes ~Feb 17.

```bash
# Use the general monitoring script
node scripts/monitorProps.js nba --watch
```

---

## Future Test Schedule

| Date | Sport | Event | Test |
|------|-------|-------|------|
| Feb 17, 2026 | NBA | Resume after All-Star | Filter test |
| Feb 26, 2026 | NHL | Resume from Olympic Break | Filter test |
| Late March 2026 | MLB | Opening Day | Verify offseason detection clears |
| September 2026 | NFL | Regular season starts | Full props test |
