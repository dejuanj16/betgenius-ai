// =====================================================
// BetGenius AI - COMPREHENSIVE Player Props Database
// 300+ Player Props Across All Active Sports
// Includes Stars, Starters, AND Bench Players
// Updated: February 2026 - Current Season Only
// =====================================================

const ACTIVE_SPORTS = ['nba', 'nhl', 'ncaab', 'soccer', 'mma'];
const OFFSEASON_SPORTS = ['nfl', 'mlb', 'ncaaf'];

function getTier(confidence) {
    if (confidence >= 75) return 'topPicks';
    if (confidence >= 65) return 'goodValue';
    if (confidence >= 55) return 'leans';
    return 'risky';
}

const DEMO_PROPS = {
    // =====================================================
    // NBA - 120+ Player Props (Stars + Role Players + Bench)
    // =====================================================
    nba: [
        // === LAKERS ===
        { player: "LeBron James", team: "LAL", position: "SF", sport: "nba", propType: "Points", line: 25.5, pick: "OVER", confidence: 82, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "Averaging 27.3 PPG in last 10.", injury: null },
        { player: "LeBron James", team: "LAL", position: "SF", sport: "nba", propType: "Assists", line: 7.5, pick: "OVER", confidence: 75, odds: { over: -110, under: -110 }, tier: "topPicks", reasoning: "Elite playmaker.", injury: null },
        { player: "LeBron James", team: "LAL", position: "SF", sport: "nba", propType: "Rebounds", line: 7.5, pick: "OVER", confidence: 68, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Crashing boards hard.", injury: null },
        { player: "LeBron James", team: "LAL", position: "SF", sport: "nba", propType: "Pts+Reb+Ast", line: 39.5, pick: "OVER", confidence: 79, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "All-around stat stuffer.", injury: null },
        { player: "Anthony Davis", team: "LAL", position: "C", sport: "nba", propType: "Points", line: 24.5, pick: "OVER", confidence: 73, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Dominant when healthy.", injury: null },
        { player: "Anthony Davis", team: "LAL", position: "C", sport: "nba", propType: "Rebounds", line: 11.5, pick: "OVER", confidence: 76, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "Elite rebounder.", injury: null },
        { player: "Anthony Davis", team: "LAL", position: "C", sport: "nba", propType: "Blocks", line: 2.5, pick: "OVER", confidence: 78, odds: { over: -120, under: +100 }, tier: "topPicks", reasoning: "DPOY candidate.", injury: null },
        { player: "Luka Doncic", team: "LAL", position: "PG", sport: "nba", propType: "Points", line: 28.5, pick: "OVER", confidence: 72, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite scorer.", injury: { status: "GTD", type: "Ankle", note: "Game-time decision" } },
        { player: "Luka Doncic", team: "LAL", position: "PG", sport: "nba", propType: "Assists", line: 8.5, pick: "OVER", confidence: 74, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Elite playmaker.", injury: { status: "GTD", type: "Ankle", note: "Game-time decision" } },
        { player: "Luka Doncic", team: "LAL", position: "PG", sport: "nba", propType: "3-Pointers Made", line: 3.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Shooting better from deep.", injury: { status: "GTD", type: "Ankle", note: "Game-time decision" } },
        { player: "Austin Reaves", team: "LAL", position: "SG", sport: "nba", propType: "Points", line: 15.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Consistent scorer off bench.", injury: null },
        { player: "Austin Reaves", team: "LAL", position: "SG", sport: "nba", propType: "Assists", line: 5.5, pick: "OVER", confidence: 64, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Good playmaker.", injury: null },
        { player: "Rui Hachimura", team: "LAL", position: "PF", sport: "nba", propType: "Points", line: 12.5, pick: "OVER", confidence: 62, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Solid rotation player.", injury: null },
        { player: "D'Angelo Russell", team: "LAL", position: "PG", sport: "nba", propType: "Points", line: 12.5, pick: "UNDER", confidence: 58, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Inconsistent lately.", injury: null },
        { player: "Gabe Vincent", team: "LAL", position: "PG", sport: "nba", propType: "3-Pointers Made", line: 1.5, pick: "OVER", confidence: 60, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Spot-up shooter.", injury: null },

        // === WARRIORS ===
        { player: "Stephen Curry", team: "GSW", position: "PG", sport: "nba", propType: "Points", line: 27.5, pick: "OVER", confidence: 76, odds: { over: -110, under: -110 }, tier: "topPicks", reasoning: "Scoring machine.", injury: null },
        { player: "Stephen Curry", team: "GSW", position: "PG", sport: "nba", propType: "3-Pointers Made", line: 4.5, pick: "OVER", confidence: 78, odds: { over: -120, under: +100 }, tier: "topPicks", reasoning: "Greatest shooter ever.", injury: null },
        { player: "Stephen Curry", team: "GSW", position: "PG", sport: "nba", propType: "Assists", line: 5.5, pick: "OVER", confidence: 65, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Strong playmaker.", injury: null },
        { player: "Klay Thompson", team: "GSW", position: "SG", sport: "nba", propType: "Points", line: 17.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Splash Brother.", injury: null },
        { player: "Klay Thompson", team: "GSW", position: "SG", sport: "nba", propType: "3-Pointers Made", line: 3.5, pick: "OVER", confidence: 66, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Elite shooter.", injury: null },
        { player: "Draymond Green", team: "GSW", position: "PF", sport: "nba", propType: "Assists", line: 5.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Playmaking big.", injury: null },
        { player: "Andrew Wiggins", team: "GSW", position: "SF", sport: "nba", propType: "Points", line: 14.5, pick: "OVER", confidence: 62, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Two-way wing.", injury: null },
        { player: "Jonathan Kuminga", team: "GSW", position: "PF", sport: "nba", propType: "Points", line: 12.5, pick: "OVER", confidence: 64, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Emerging young player.", injury: null },
        { player: "Brandin Podziemski", team: "GSW", position: "SG", sport: "nba", propType: "Rebounds", line: 5.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Rebounding guard.", injury: null },
        { player: "Kevon Looney", team: "GSW", position: "C", sport: "nba", propType: "Rebounds", line: 7.5, pick: "OVER", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite rebounder.", injury: null },

        // === NUGGETS ===
        { player: "Nikola Jokic", team: "DEN", position: "C", sport: "nba", propType: "Points", line: 26.5, pick: "OVER", confidence: 74, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "MVP candidate.", injury: null },
        { player: "Nikola Jokic", team: "DEN", position: "C", sport: "nba", propType: "Rebounds", line: 12.5, pick: "OVER", confidence: 80, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "Elite rebounder.", injury: null },
        { player: "Nikola Jokic", team: "DEN", position: "C", sport: "nba", propType: "Assists", line: 9.5, pick: "OVER", confidence: 77, odds: { over: -110, under: -110 }, tier: "topPicks", reasoning: "Best passing center ever.", injury: null },
        { player: "Nikola Jokic", team: "DEN", position: "C", sport: "nba", propType: "Pts+Reb+Ast", line: 47.5, pick: "OVER", confidence: 81, odds: { over: -120, under: +100 }, tier: "topPicks", reasoning: "Triple-double machine.", injury: null },
        { player: "Jamal Murray", team: "DEN", position: "PG", sport: "nba", propType: "Points", line: 20.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Playoff performer.", injury: null },
        { player: "Jamal Murray", team: "DEN", position: "PG", sport: "nba", propType: "Assists", line: 6.5, pick: "OVER", confidence: 65, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Strong playmaker.", injury: null },
        { player: "Michael Porter Jr.", team: "DEN", position: "SF", sport: "nba", propType: "Points", line: 16.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Efficient scorer.", injury: null },
        { player: "Michael Porter Jr.", team: "DEN", position: "SF", sport: "nba", propType: "3-Pointers Made", line: 2.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite shooter.", injury: null },
        { player: "Aaron Gordon", team: "DEN", position: "PF", sport: "nba", propType: "Points", line: 13.5, pick: "OVER", confidence: 62, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Athletic forward.", injury: null },
        { player: "Kentavious Caldwell-Pope", team: "DEN", position: "SG", sport: "nba", propType: "3-Pointers Made", line: 1.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "3-and-D specialist.", injury: null },
        { player: "Reggie Jackson", team: "DEN", position: "PG", sport: "nba", propType: "Points", line: 8.5, pick: "OVER", confidence: 58, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Bench scorer.", injury: null },

        // === CELTICS ===
        { player: "Jayson Tatum", team: "BOS", position: "SF", sport: "nba", propType: "Points", line: 27.5, pick: "OVER", confidence: 73, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Franchise player.", injury: null },
        { player: "Jayson Tatum", team: "BOS", position: "SF", sport: "nba", propType: "Rebounds", line: 8.5, pick: "OVER", confidence: 68, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Active on boards.", injury: null },
        { player: "Jayson Tatum", team: "BOS", position: "SF", sport: "nba", propType: "3-Pointers Made", line: 2.5, pick: "OVER", confidence: 70, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Consistent from deep.", injury: null },
        { player: "Jaylen Brown", team: "BOS", position: "SG", sport: "nba", propType: "Points", line: 23.5, pick: "OVER", confidence: 69, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Consistent second option.", injury: null },
        { player: "Jaylen Brown", team: "BOS", position: "SG", sport: "nba", propType: "Rebounds", line: 5.5, pick: "OVER", confidence: 63, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Athletic wing.", injury: null },
        { player: "Derrick White", team: "BOS", position: "SG", sport: "nba", propType: "Points", line: 14.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Key role player.", injury: null },
        { player: "Derrick White", team: "BOS", position: "SG", sport: "nba", propType: "3-Pointers Made", line: 2.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Improved shooter.", injury: null },
        { player: "Jrue Holiday", team: "BOS", position: "PG", sport: "nba", propType: "Assists", line: 5.5, pick: "OVER", confidence: 65, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Smart playmaker.", injury: null },
        { player: "Jrue Holiday", team: "BOS", position: "PG", sport: "nba", propType: "Steals", line: 1.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite defender.", injury: null },
        { player: "Al Horford", team: "BOS", position: "C", sport: "nba", propType: "Rebounds", line: 6.5, pick: "OVER", confidence: 62, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Veteran big.", injury: null },
        { player: "Kristaps Porzingis", team: "BOS", position: "C", sport: "nba", propType: "Points", line: 18.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Stretch big.", injury: { status: "QUES", type: "Calf", note: "Questionable" } },
        { player: "Kristaps Porzingis", team: "BOS", position: "C", sport: "nba", propType: "Blocks", line: 1.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Rim protector.", injury: { status: "QUES", type: "Calf", note: "Questionable" } },
        { player: "Payton Pritchard", team: "BOS", position: "PG", sport: "nba", propType: "3-Pointers Made", line: 2.5, pick: "OVER", confidence: 70, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Sharpshooter off bench.", injury: null },
        { player: "Sam Hauser", team: "BOS", position: "SF", sport: "nba", propType: "3-Pointers Made", line: 1.5, pick: "OVER", confidence: 64, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Spot-up shooter.", injury: null },

        // === BUCKS ===
        { player: "Giannis Antetokounmpo", team: "MIL", position: "PF", sport: "nba", propType: "Points", line: 30.5, pick: "OVER", confidence: 75, odds: { over: -110, under: -110 }, tier: "topPicks", reasoning: "Dominant scorer.", injury: null },
        { player: "Giannis Antetokounmpo", team: "MIL", position: "PF", sport: "nba", propType: "Rebounds", line: 11.5, pick: "OVER", confidence: 73, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite rebounder.", injury: null },
        { player: "Giannis Antetokounmpo", team: "MIL", position: "PF", sport: "nba", propType: "Pts+Reb", line: 42.5, pick: "OVER", confidence: 78, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "Double-double machine.", injury: null },
        { player: "Damian Lillard", team: "MIL", position: "PG", sport: "nba", propType: "Points", line: 24.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Dame Time.", injury: null },
        { player: "Damian Lillard", team: "MIL", position: "PG", sport: "nba", propType: "3-Pointers Made", line: 3.5, pick: "OVER", confidence: 70, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Deep threat.", injury: null },
        { player: "Damian Lillard", team: "MIL", position: "PG", sport: "nba", propType: "Assists", line: 6.5, pick: "OVER", confidence: 65, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Strong playmaker.", injury: null },
        { player: "Khris Middleton", team: "MIL", position: "SF", sport: "nba", propType: "Points", line: 15.5, pick: "OVER", confidence: 60, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Veteran scorer.", injury: { status: "PROB", type: "Knee", note: "Probable" } },
        { player: "Brook Lopez", team: "MIL", position: "C", sport: "nba", propType: "Blocks", line: 2.5, pick: "OVER", confidence: 72, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Elite rim protector.", injury: null },
        { player: "Brook Lopez", team: "MIL", position: "C", sport: "nba", propType: "3-Pointers Made", line: 1.5, pick: "OVER", confidence: 62, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Stretch five.", injury: null },
        { player: "Bobby Portis", team: "MIL", position: "PF", sport: "nba", propType: "Rebounds", line: 7.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Energy big.", injury: null },
        { player: "Pat Connaughton", team: "MIL", position: "SG", sport: "nba", propType: "3-Pointers Made", line: 1.5, pick: "OVER", confidence: 58, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Role player shooter.", injury: null },

        // === 76ERS ===
        { player: "Joel Embiid", team: "PHI", position: "C", sport: "nba", propType: "Points", line: 28.5, pick: "OVER", confidence: 65, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "When healthy, elite scorer.", injury: { status: "QUES", type: "Knee", note: "Questionable" } },
        { player: "Joel Embiid", team: "PHI", position: "C", sport: "nba", propType: "Rebounds", line: 10.5, pick: "OVER", confidence: 64, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Dominant on glass.", injury: { status: "QUES", type: "Knee", note: "Questionable" } },
        { player: "Tyrese Maxey", team: "PHI", position: "PG", sport: "nba", propType: "Points", line: 24.5, pick: "OVER", confidence: 72, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Emerging star.", injury: null },
        { player: "Tyrese Maxey", team: "PHI", position: "PG", sport: "nba", propType: "Assists", line: 5.5, pick: "OVER", confidence: 66, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Improved playmaker.", injury: null },
        { player: "Tobias Harris", team: "PHI", position: "PF", sport: "nba", propType: "Points", line: 14.5, pick: "UNDER", confidence: 58, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Declining production.", injury: null },
        { player: "Kelly Oubre Jr.", team: "PHI", position: "SF", sport: "nba", propType: "Points", line: 13.5, pick: "OVER", confidence: 62, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Athletic scorer.", injury: null },
        { player: "De'Anthony Melton", team: "PHI", position: "SG", sport: "nba", propType: "Steals", line: 1.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Disruptive defender.", injury: null },

        // === KNICKS ===
        { player: "Jalen Brunson", team: "NYK", position: "PG", sport: "nba", propType: "Points", line: 25.5, pick: "OVER", confidence: 73, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Leading Knicks.", injury: null },
        { player: "Jalen Brunson", team: "NYK", position: "PG", sport: "nba", propType: "Assists", line: 6.5, pick: "OVER", confidence: 66, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Strong playmaker.", injury: null },
        { player: "Karl-Anthony Towns", team: "NYK", position: "C", sport: "nba", propType: "Points", line: 23.5, pick: "OVER", confidence: 67, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Scoring big.", injury: null },
        { player: "Karl-Anthony Towns", team: "NYK", position: "C", sport: "nba", propType: "Rebounds", line: 11.5, pick: "OVER", confidence: 69, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Elite rebounder.", injury: null },
        { player: "OG Anunoby", team: "NYK", position: "SF", sport: "nba", propType: "Points", line: 14.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "3-and-D wing.", injury: null },
        { player: "OG Anunoby", team: "NYK", position: "SF", sport: "nba", propType: "Steals", line: 1.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite defender.", injury: null },
        { player: "Josh Hart", team: "NYK", position: "SG", sport: "nba", propType: "Rebounds", line: 8.5, pick: "OVER", confidence: 70, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Rebounding guard.", injury: null },
        { player: "Donte DiVincenzo", team: "NYK", position: "SG", sport: "nba", propType: "3-Pointers Made", line: 2.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Hot shooter.", injury: null },
        { player: "Miles McBride", team: "NYK", position: "PG", sport: "nba", propType: "Points", line: 8.5, pick: "OVER", confidence: 60, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Spark off bench.", injury: null },

        // === THUNDER ===
        { player: "Shai Gilgeous-Alexander", team: "OKC", position: "PG", sport: "nba", propType: "Points", line: 30.5, pick: "OVER", confidence: 79, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "MVP candidate.", injury: null },
        { player: "Shai Gilgeous-Alexander", team: "OKC", position: "PG", sport: "nba", propType: "Assists", line: 5.5, pick: "OVER", confidence: 67, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Improved playmaking.", injury: null },
        { player: "Shai Gilgeous-Alexander", team: "OKC", position: "PG", sport: "nba", propType: "Steals", line: 1.5, pick: "OVER", confidence: 72, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Active hands.", injury: null },
        { player: "Chet Holmgren", team: "OKC", position: "C", sport: "nba", propType: "Points", line: 16.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Emerging star.", injury: null },
        { player: "Chet Holmgren", team: "OKC", position: "C", sport: "nba", propType: "Blocks", line: 2.5, pick: "OVER", confidence: 74, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Elite shot blocker.", injury: null },
        { player: "Jalen Williams", team: "OKC", position: "SF", sport: "nba", propType: "Points", line: 18.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Versatile scorer.", injury: null },
        { player: "Josh Giddey", team: "OKC", position: "PG", sport: "nba", propType: "Assists", line: 5.5, pick: "OVER", confidence: 66, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Playmaking guard.", injury: null },
        { player: "Josh Giddey", team: "OKC", position: "PG", sport: "nba", propType: "Rebounds", line: 6.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Rebounding guard.", injury: null },
        { player: "Luguentz Dort", team: "OKC", position: "SG", sport: "nba", propType: "Points", line: 10.5, pick: "OVER", confidence: 60, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Defensive stopper.", injury: null },
        { player: "Isaiah Joe", team: "OKC", position: "SG", sport: "nba", propType: "3-Pointers Made", line: 2.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Sharpshooter.", injury: null },

        // === SUNS ===
        { player: "Kevin Durant", team: "PHX", position: "SF", sport: "nba", propType: "Points", line: 27.5, pick: "OVER", confidence: 76, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "Elite scorer.", injury: null },
        { player: "Kevin Durant", team: "PHX", position: "SF", sport: "nba", propType: "Rebounds", line: 6.5, pick: "OVER", confidence: 62, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Solid boards.", injury: null },
        { player: "Devin Booker", team: "PHX", position: "SG", sport: "nba", propType: "Points", line: 26.5, pick: "OVER", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Consistent scorer.", injury: null },
        { player: "Devin Booker", team: "PHX", position: "SG", sport: "nba", propType: "Assists", line: 5.5, pick: "OVER", confidence: 64, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Good playmaker.", injury: null },
        { player: "Bradley Beal", team: "PHX", position: "SG", sport: "nba", propType: "Points", line: 17.5, pick: "OVER", confidence: 62, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Third option.", injury: null },
        { player: "Jusuf Nurkic", team: "PHX", position: "C", sport: "nba", propType: "Rebounds", line: 10.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Board crasher.", injury: null },
        { player: "Grayson Allen", team: "PHX", position: "SG", sport: "nba", propType: "3-Pointers Made", line: 2.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Sharpshooter.", injury: null },

        // === TIMBERWOLVES ===
        { player: "Anthony Edwards", team: "MIN", position: "SG", sport: "nba", propType: "Points", line: 25.5, pick: "OVER", confidence: 74, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Explosive scorer.", injury: null },
        { player: "Anthony Edwards", team: "MIN", position: "SG", sport: "nba", propType: "3-Pointers Made", line: 2.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Volume shooter.", injury: null },
        { player: "Rudy Gobert", team: "MIN", position: "C", sport: "nba", propType: "Rebounds", line: 12.5, pick: "OVER", confidence: 75, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "Elite rebounder.", injury: null },
        { player: "Rudy Gobert", team: "MIN", position: "C", sport: "nba", propType: "Blocks", line: 1.5, pick: "OVER", confidence: 72, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "DPOY.", injury: null },
        { player: "Mike Conley", team: "MIN", position: "PG", sport: "nba", propType: "Assists", line: 5.5, pick: "OVER", confidence: 66, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Veteran floor general.", injury: null },
        { player: "Jaden McDaniels", team: "MIN", position: "SF", sport: "nba", propType: "Points", line: 10.5, pick: "OVER", confidence: 60, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Two-way wing.", injury: null },
        { player: "Naz Reid", team: "MIN", position: "C", sport: "nba", propType: "Points", line: 12.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "6th man scorer.", injury: null },

        // === MORE NBA PLAYERS (PACERS, CAVS, HAWKS, KINGS, ETC.) ===
        { player: "Tyrese Haliburton", team: "IND", position: "PG", sport: "nba", propType: "Assists", line: 10.5, pick: "OVER", confidence: 77, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "League leader in assists.", injury: null },
        { player: "Tyrese Haliburton", team: "IND", position: "PG", sport: "nba", propType: "Points", line: 18.5, pick: "OVER", confidence: 65, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Efficient scorer.", injury: null },
        { player: "Pascal Siakam", team: "IND", position: "PF", sport: "nba", propType: "Points", line: 20.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "All-Star forward.", injury: null },
        { player: "Myles Turner", team: "IND", position: "C", sport: "nba", propType: "Blocks", line: 2.5, pick: "OVER", confidence: 72, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Shot blocking machine.", injury: null },
        { player: "Bennedict Mathurin", team: "IND", position: "SG", sport: "nba", propType: "Points", line: 14.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Young scorer.", injury: null },

        { player: "Donovan Mitchell", team: "CLE", position: "SG", sport: "nba", propType: "Points", line: 26.5, pick: "OVER", confidence: 71, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite scorer.", injury: null },
        { player: "Donovan Mitchell", team: "CLE", position: "SG", sport: "nba", propType: "3-Pointers Made", line: 3.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Volume shooter.", injury: null },
        { player: "Darius Garland", team: "CLE", position: "PG", sport: "nba", propType: "Assists", line: 7.5, pick: "OVER", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite playmaker.", injury: null },
        { player: "Evan Mobley", team: "CLE", position: "C", sport: "nba", propType: "Points", line: 15.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Improving scorer.", injury: null },
        { player: "Jarrett Allen", team: "CLE", position: "C", sport: "nba", propType: "Rebounds", line: 10.5, pick: "OVER", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite rebounder.", injury: null },

        { player: "Trae Young", team: "ATL", position: "PG", sport: "nba", propType: "Points", line: 25.5, pick: "OVER", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Volume scorer.", injury: null },
        { player: "Trae Young", team: "ATL", position: "PG", sport: "nba", propType: "Assists", line: 10.5, pick: "OVER", confidence: 72, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite playmaker.", injury: null },
        { player: "Dejounte Murray", team: "ATL", position: "SG", sport: "nba", propType: "Points", line: 20.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "All-around guard.", injury: null },

        { player: "De'Aaron Fox", team: "SAC", position: "PG", sport: "nba", propType: "Points", line: 26.5, pick: "OVER", confidence: 69, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Speed demon.", injury: null },
        { player: "Domantas Sabonis", team: "SAC", position: "C", sport: "nba", propType: "Rebounds", line: 12.5, pick: "OVER", confidence: 76, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "Elite rebounder.", injury: null },
        { player: "Domantas Sabonis", team: "SAC", position: "C", sport: "nba", propType: "Assists", line: 7.5, pick: "OVER", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Best passing big.", injury: null },
        { player: "Keegan Murray", team: "SAC", position: "SF", sport: "nba", propType: "Points", line: 14.5, pick: "OVER", confidence: 64, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Efficient scorer.", injury: null },

        { player: "Victor Wembanyama", team: "SAS", position: "C", sport: "nba", propType: "Points", line: 21.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Generational talent.", injury: null },
        { player: "Victor Wembanyama", team: "SAS", position: "C", sport: "nba", propType: "Blocks", line: 3.5, pick: "OVER", confidence: 75, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "Elite rim protector.", injury: null },
        { player: "Victor Wembanyama", team: "SAS", position: "C", sport: "nba", propType: "Rebounds", line: 10.5, pick: "OVER", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Long arms.", injury: null },
        { player: "Victor Wembanyama", team: "SAS", position: "C", sport: "nba", propType: "3-Pointers Made", line: 1.5, pick: "OVER", confidence: 62, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Stretch five.", injury: null },

        { player: "Paolo Banchero", team: "ORL", position: "PF", sport: "nba", propType: "Points", line: 22.5, pick: "OVER", confidence: 67, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Young star.", injury: null },
        { player: "Franz Wagner", team: "ORL", position: "SF", sport: "nba", propType: "Points", line: 18.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Versatile scorer.", injury: null },

        { player: "LaMelo Ball", team: "CHA", position: "PG", sport: "nba", propType: "Assists", line: 7.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Flashy playmaker.", injury: null },
        { player: "LaMelo Ball", team: "CHA", position: "PG", sport: "nba", propType: "Points", line: 22.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Scoring threat.", injury: null },

        { player: "Kawhi Leonard", team: "LAC", position: "SF", sport: "nba", propType: "Points", line: 22.5, pick: "OVER", confidence: 55, odds: { over: -115, under: -105 }, tier: "leans", reasoning: "Efficient when he plays.", injury: { status: "OUT", type: "Knee", note: "Out - load management" } },
        { player: "Paul George", team: "LAC", position: "SF", sport: "nba", propType: "Points", line: 22.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "All-Star wing.", injury: null },
        { player: "James Harden", team: "LAC", position: "PG", sport: "nba", propType: "Assists", line: 8.5, pick: "OVER", confidence: 72, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite playmaker.", injury: null }
    ],

    // =====================================================
    // NHL - 60+ Player Props
    // =====================================================
    nhl: [
        // OILERS
        { player: "Connor McDavid", team: "EDM", position: "C", sport: "nhl", propType: "Points", line: 1.5, pick: "OVER", confidence: 82, odds: { over: -125, under: +105 }, tier: "topPicks", reasoning: "Best player in hockey.", injury: null },
        { player: "Connor McDavid", team: "EDM", position: "C", sport: "nhl", propType: "Shots on Goal", line: 4.5, pick: "OVER", confidence: 74, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Volume shooter.", injury: null },
        { player: "Connor McDavid", team: "EDM", position: "C", sport: "nhl", propType: "Assists", line: 0.5, pick: "OVER", confidence: 78, odds: { over: -155, under: +130 }, tier: "topPicks", reasoning: "Elite playmaker.", injury: null },
        { player: "Leon Draisaitl", team: "EDM", position: "C", sport: "nhl", propType: "Points", line: 1.5, pick: "OVER", confidence: 78, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "Elite scorer.", injury: null },
        { player: "Leon Draisaitl", team: "EDM", position: "C", sport: "nhl", propType: "Goals", line: 0.5, pick: "OVER", confidence: 68, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "50-goal pace.", injury: null },
        { player: "Zach Hyman", team: "EDM", position: "LW", sport: "nhl", propType: "Goals", line: 0.5, pick: "OVER", confidence: 62, odds: { over: +100, under: -120 }, tier: "leans", reasoning: "Goal scorer.", injury: null },
        { player: "Ryan Nugent-Hopkins", team: "EDM", position: "C", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 66, odds: { over: -120, under: +100 }, tier: "goodValue", reasoning: "Consistent producer.", injury: null },
        { player: "Evan Bouchard", team: "EDM", position: "D", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Offensive defenseman.", injury: null },

        // MAPLE LEAFS
        { player: "Auston Matthews", team: "TOR", position: "C", sport: "nhl", propType: "Goals", line: 0.5, pick: "OVER", confidence: 72, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Elite goal scorer.", injury: null },
        { player: "Auston Matthews", team: "TOR", position: "C", sport: "nhl", propType: "Shots on Goal", line: 4.5, pick: "OVER", confidence: 75, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "High-volume shooter.", injury: null },
        { player: "Mitch Marner", team: "TOR", position: "RW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 70, odds: { over: -130, under: +110 }, tier: "goodValue", reasoning: "Elite playmaker.", injury: null },
        { player: "Mitch Marner", team: "TOR", position: "RW", sport: "nhl", propType: "Assists", line: 0.5, pick: "OVER", confidence: 72, odds: { over: -140, under: +120 }, tier: "goodValue", reasoning: "Assist machine.", injury: null },
        { player: "William Nylander", team: "TOR", position: "RW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 66, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Consistent scorer.", injury: null },
        { player: "John Tavares", team: "TOR", position: "C", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 62, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Veteran center.", injury: null },
        { player: "Morgan Rielly", team: "TOR", position: "D", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 60, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Offensive D.", injury: null },

        // AVALANCHE
        { player: "Nathan MacKinnon", team: "COL", position: "C", sport: "nhl", propType: "Points", line: 1.5, pick: "OVER", confidence: 76, odds: { over: -120, under: +100 }, tier: "topPicks", reasoning: "MVP candidate.", injury: null },
        { player: "Nathan MacKinnon", team: "COL", position: "C", sport: "nhl", propType: "Assists", line: 0.5, pick: "OVER", confidence: 72, odds: { over: -140, under: +120 }, tier: "goodValue", reasoning: "Elite playmaker.", injury: null },
        { player: "Cale Makar", team: "COL", position: "D", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 70, odds: { over: -130, under: +110 }, tier: "goodValue", reasoning: "Best offensive D.", injury: { status: "GTD", type: "Upper Body", note: "Game-time decision" } },
        { player: "Cale Makar", team: "COL", position: "D", sport: "nhl", propType: "Shots on Goal", line: 3.5, pick: "OVER", confidence: 68, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Offensive threat.", injury: { status: "GTD", type: "Upper Body", note: "Game-time decision" } },
        { player: "Mikko Rantanen", team: "COL", position: "RW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 68, odds: { over: -125, under: +105 }, tier: "goodValue", reasoning: "Elite winger.", injury: null },
        { player: "Valeri Nichushkin", team: "COL", position: "RW", sport: "nhl", propType: "Shots on Goal", line: 2.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Physical forward.", injury: null },

        // RANGERS
        { player: "Igor Shesterkin", team: "NYR", position: "G", sport: "nhl", propType: "Saves", line: 28.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Vezina-caliber.", injury: null },
        { player: "Artemi Panarin", team: "NYR", position: "LW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 70, odds: { over: -130, under: +110 }, tier: "goodValue", reasoning: "Elite scorer.", injury: null },
        { player: "Mika Zibanejad", team: "NYR", position: "C", sport: "nhl", propType: "Shots on Goal", line: 3.5, pick: "OVER", confidence: 66, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Volume shooter.", injury: null },
        { player: "Chris Kreider", team: "NYR", position: "LW", sport: "nhl", propType: "Goals", line: 0.5, pick: "OVER", confidence: 62, odds: { over: +100, under: -120 }, tier: "leans", reasoning: "Goal scorer.", injury: null },
        { player: "Adam Fox", team: "NYR", position: "D", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 68, odds: { over: -120, under: +100 }, tier: "goodValue", reasoning: "Elite D.", injury: null },
        { player: "Vincent Trocheck", team: "NYR", position: "C", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 60, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Solid center.", injury: null },

        // BRUINS
        { player: "David Pastrnak", team: "BOS", position: "RW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 70, odds: { over: -125, under: +105 }, tier: "goodValue", reasoning: "Elite scorer.", injury: null },
        { player: "David Pastrnak", team: "BOS", position: "RW", sport: "nhl", propType: "Shots on Goal", line: 4.5, pick: "OVER", confidence: 72, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Volume shooter.", injury: null },
        { player: "Brad Marchand", team: "BOS", position: "LW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 66, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Elite winger.", injury: null },
        { player: "Charlie McAvoy", team: "BOS", position: "D", sport: "nhl", propType: "Shots on Goal", line: 2.5, pick: "OVER", confidence: 64, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Offensive D.", injury: null },

        // LIGHTNING
        { player: "Nikita Kucherov", team: "TBL", position: "RW", sport: "nhl", propType: "Points", line: 1.5, pick: "OVER", confidence: 75, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "Elite playmaker.", injury: null },
        { player: "Nikita Kucherov", team: "TBL", position: "RW", sport: "nhl", propType: "Assists", line: 0.5, pick: "OVER", confidence: 73, odds: { over: -140, under: +120 }, tier: "goodValue", reasoning: "League-leading assists.", injury: null },
        { player: "Brayden Point", team: "TBL", position: "C", sport: "nhl", propType: "Goals", line: 0.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Goal scorer.", injury: null },
        { player: "Victor Hedman", team: "TBL", position: "D", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 62, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Elite D.", injury: null },

        // PANTHERS
        { player: "Matthew Tkachuk", team: "FLA", position: "LW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 70, odds: { over: -125, under: +105 }, tier: "goodValue", reasoning: "Elite playmaker.", injury: null },
        { player: "Aleksander Barkov", team: "FLA", position: "C", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 68, odds: { over: -120, under: +100 }, tier: "goodValue", reasoning: "Elite two-way center.", injury: null },
        { player: "Sam Reinhart", team: "FLA", position: "C", sport: "nhl", propType: "Goals", line: 0.5, pick: "OVER", confidence: 64, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Goal scorer.", injury: null },
        { player: "Carter Verhaeghe", team: "FLA", position: "LW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 62, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Breakout star.", injury: null },

        // MORE NHL TEAMS
        { player: "Kirill Kaprizov", team: "MIN", position: "LW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 72, odds: { over: -130, under: +110 }, tier: "goodValue", reasoning: "Dynamic scorer.", injury: null },
        { player: "Jack Hughes", team: "NJD", position: "C", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 70, odds: { over: -125, under: +105 }, tier: "goodValue", reasoning: "Young star.", injury: null },
        { player: "Jesper Bratt", team: "NJD", position: "LW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 66, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Breakout star.", injury: null },
        { player: "Sidney Crosby", team: "PIT", position: "C", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 70, odds: { over: -130, under: +110 }, tier: "goodValue", reasoning: "Still elite.", injury: null },
        { player: "Sidney Crosby", team: "PIT", position: "C", sport: "nhl", propType: "Assists", line: 0.5, pick: "OVER", confidence: 68, odds: { over: -125, under: +105 }, tier: "goodValue", reasoning: "Elite playmaker.", injury: null },
        { player: "Connor Hellebuyck", team: "WPG", position: "G", sport: "nhl", propType: "Saves", line: 27.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "High-volume starter.", injury: null },
        { player: "Kyle Connor", team: "WPG", position: "LW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 66, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Goal scorer.", injury: null },
        { player: "Mark Scheifele", team: "WPG", position: "C", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Veteran center.", injury: null },
        { player: "Jason Robertson", team: "DAL", position: "LW", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 68, odds: { over: -120, under: +100 }, tier: "goodValue", reasoning: "Elite scorer.", injury: null },
        { player: "Roope Hintz", team: "DAL", position: "C", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 62, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Two-way center.", injury: null },
        { player: "Jake Oettinger", team: "DAL", position: "G", sport: "nhl", propType: "Saves", line: 26.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Young goalie.", injury: null },
        { player: "Alex Ovechkin", team: "WSH", position: "LW", sport: "nhl", propType: "Goals", line: 0.5, pick: "OVER", confidence: 60, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Goal record chase.", injury: null },
        { player: "Alex Ovechkin", team: "WSH", position: "LW", sport: "nhl", propType: "Shots on Goal", line: 4.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Volume shooter.", injury: null },
        { player: "J.T. Miller", team: "VAN", position: "C", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 64, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Versatile forward.", injury: null },
        { player: "Elias Pettersson", team: "VAN", position: "C", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 66, odds: { over: -120, under: +100 }, tier: "goodValue", reasoning: "Skilled center.", injury: null },
        { player: "Quinn Hughes", team: "VAN", position: "D", sport: "nhl", propType: "Points", line: 0.5, pick: "OVER", confidence: 68, odds: { over: -120, under: +100 }, tier: "goodValue", reasoning: "Elite offensive D.", injury: null },
        { player: "Tage Thompson", team: "BUF", position: "C", sport: "nhl", propType: "Shots on Goal", line: 4.5, pick: "OVER", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "High-volume shooter.", injury: null },
        { player: "Tage Thompson", team: "BUF", position: "C", sport: "nhl", propType: "Goals", line: 0.5, pick: "OVER", confidence: 64, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Elite shot.", injury: null }
    ],

    // =====================================================
    // NCAAB - 40+ Team Props
    // =====================================================
    ncaab: [
        { player: "Duke Blue Devils", team: "DUKE", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 78.5, pick: "OVER", confidence: 74, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "High-powered offense.", injury: null },
        { player: "Kansas Jayhawks", team: "KU", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 75.5, pick: "OVER", confidence: 70, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Strong offense.", injury: null },
        { player: "UConn Huskies", team: "UCONN", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 76.5, pick: "OVER", confidence: 73, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Defending champions.", injury: null },
        { player: "Purdue Boilermakers", team: "PUR", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 74.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite inside scoring.", injury: null },
        { player: "Houston Cougars", team: "HOU", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 72.5, pick: "UNDER", confidence: 69, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Defense-first team.", injury: null },
        { player: "Arizona Wildcats", team: "ARIZ", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 80.5, pick: "OVER", confidence: 71, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "High-tempo offense.", injury: null },
        { player: "Kentucky Wildcats", team: "UK", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 77.5, pick: "OVER", confidence: 66, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Talented roster.", injury: null },
        { player: "North Carolina Tar Heels", team: "UNC", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 76.5, pick: "OVER", confidence: 67, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Fast-paced offense.", injury: null },
        { player: "Tennessee Volunteers", team: "TENN", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 71.5, pick: "UNDER", confidence: 65, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Physical defense.", injury: null },
        { player: "Auburn Tigers", team: "AUB", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 79.5, pick: "OVER", confidence: 72, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Explosive offense.", injury: null },
        { player: "Gonzaga Bulldogs", team: "GONZ", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 82.5, pick: "OVER", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite offense.", injury: null },
        { player: "Baylor Bears", team: "BAY", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 74.5, pick: "OVER", confidence: 64, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Balanced attack.", injury: null },
        { player: "Michigan State Spartans", team: "MSU", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 73.5, pick: "OVER", confidence: 63, odds: { over: -110, under: -110 }, tier: "leans", reasoning: "Izzo's team.", injury: null },
        { player: "Marquette Golden Eagles", team: "MARQ", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 76.5, pick: "OVER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "High-scoring.", injury: null },
        { player: "Creighton Bluejays", team: "CREI", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 75.5, pick: "OVER", confidence: 66, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Elite 3-point shooting.", injury: null },
        { player: "Iowa State Cyclones", team: "ISU", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 70.5, pick: "UNDER", confidence: 67, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Defense-focused.", injury: null },
        { player: "UCLA Bruins", team: "UCLA", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 74.5, pick: "OVER", confidence: 65, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Talented roster.", injury: null },
        { player: "Illinois Fighting Illini", team: "ILL", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 77.5, pick: "OVER", confidence: 69, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "High-powered offense.", injury: null },
        { player: "Alabama Crimson Tide", team: "BAMA", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 85.5, pick: "OVER", confidence: 72, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Elite 3-point volume.", injury: null },
        { player: "Texas Longhorns", team: "TEX", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 73.5, pick: "OVER", confidence: 64, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Balanced offense.", injury: null },
        { player: "Indiana Hoosiers", team: "IND", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 75.5, pick: "OVER", confidence: 65, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Assembly Hall edge.", injury: null },
        { player: "Wisconsin Badgers", team: "WIS", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 68.5, pick: "UNDER", confidence: 68, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Slow pace, low scoring.", injury: null },
        { player: "Villanova Wildcats", team: "NOVA", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 72.5, pick: "OVER", confidence: 63, odds: { over: -105, under: -115 }, tier: "leans", reasoning: "Elite program.", injury: null },
        { player: "San Diego State Aztecs", team: "SDSU", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 69.5, pick: "UNDER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Defensive team.", injury: null },
        { player: "Miami Hurricanes", team: "MIA", position: "TEAM", sport: "ncaab", propType: "Team Total", line: 74.5, pick: "OVER", confidence: 64, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Balanced attack.", injury: null }
    ],

    // =====================================================
    // SOCCER - 50+ Player Props
    // =====================================================
    soccer: [
        // PREMIER LEAGUE
        { player: "Erling Haaland", team: "MCI", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 78, odds: { over: -130, under: +110 }, tier: "topPicks", reasoning: "Premier League top scorer.", injury: null },
        { player: "Erling Haaland", team: "MCI", position: "ST", sport: "soccer", propType: "Shots on Target", line: 2.5, pick: "OVER", confidence: 72, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Volume shooter.", injury: null },
        { player: "Erling Haaland", team: "MCI", position: "ST", sport: "soccer", propType: "2+ Goals", line: 1.5, pick: "YES", confidence: 55, odds: { over: +200, under: -250 }, tier: "leans", reasoning: "Brace potential.", injury: null },
        { player: "Mohamed Salah", team: "LIV", position: "RW", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 74, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "In top form.", injury: null },
        { player: "Mohamed Salah", team: "LIV", position: "RW", sport: "soccer", propType: "Shots on Target", line: 1.5, pick: "OVER", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Consistent threat.", injury: null },
        { player: "Mohamed Salah", team: "LIV", position: "RW", sport: "soccer", propType: "Assists", line: 0.5, pick: "OVER", confidence: 62, odds: { over: +110, under: -130 }, tier: "leans", reasoning: "Creative player.", injury: null },
        { player: "Cole Palmer", team: "CHE", position: "AM", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 68, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Chelsea's main man.", injury: null },
        { player: "Cole Palmer", team: "CHE", position: "AM", sport: "soccer", propType: "Shots on Target", line: 1.5, pick: "OVER", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Set piece taker.", injury: null },
        { player: "Bukayo Saka", team: "ARS", position: "RW", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 65, odds: { over: +100, under: -120 }, tier: "goodValue", reasoning: "Arsenal's talisman.", injury: null },
        { player: "Bukayo Saka", team: "ARS", position: "RW", sport: "soccer", propType: "Assists", line: 0.5, pick: "OVER", confidence: 64, odds: { over: +105, under: -125 }, tier: "goodValue", reasoning: "Creative winger.", injury: null },
        { player: "Martin Odegaard", team: "ARS", position: "AM", sport: "soccer", propType: "Assists", line: 0.5, pick: "OVER", confidence: 66, odds: { over: +100, under: -120 }, tier: "goodValue", reasoning: "Arsenal captain.", injury: null },
        { player: "Darwin Nunez", team: "LIV", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 62, odds: { over: +110, under: -130 }, tier: "leans", reasoning: "Explosive finisher.", injury: null },
        { player: "Alexander Isak", team: "NEW", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 66, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Newcastle's striker.", injury: null },
        { player: "Son Heung-min", team: "TOT", position: "LW", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 64, odds: { over: +105, under: -125 }, tier: "goodValue", reasoning: "Clinical finisher.", injury: null },
        { player: "Ollie Watkins", team: "AVL", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 66, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Villa's striker.", injury: null },
        { player: "Kevin De Bruyne", team: "MCI", position: "CM", sport: "soccer", propType: "Assists", line: 0.5, pick: "OVER", confidence: 70, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Elite playmaker.", injury: null },
        { player: "Bruno Fernandes", team: "MUN", position: "AM", sport: "soccer", propType: "Assists", line: 0.5, pick: "OVER", confidence: 64, odds: { over: +105, under: -125 }, tier: "goodValue", reasoning: "Set piece taker.", injury: null },
        { player: "Bruno Fernandes", team: "MUN", position: "AM", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 58, odds: { over: +130, under: -150 }, tier: "leans", reasoning: "Penalty taker.", injury: null },
        { player: "Marcus Rashford", team: "MUN", position: "LW", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 58, odds: { over: +120, under: -140 }, tier: "leans", reasoning: "Pace threat.", injury: null },
        { player: "Phil Foden", team: "MCI", position: "AM", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 62, odds: { over: +110, under: -130 }, tier: "leans", reasoning: "Creative player.", injury: null },
        { player: "Dominic Solanke", team: "TOT", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 60, odds: { over: +115, under: -135 }, tier: "leans", reasoning: "New signing.", injury: null },
        { player: "Nicolas Jackson", team: "CHE", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 60, odds: { over: +115, under: -135 }, tier: "leans", reasoning: "Chelsea striker.", injury: null },

        // LA LIGA / REAL MADRID
        { player: "Kylian Mbappe", team: "RMA", position: "LW", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 76, odds: { over: -120, under: +100 }, tier: "topPicks", reasoning: "World-class finisher.", injury: null },
        { player: "Kylian Mbappe", team: "RMA", position: "LW", sport: "soccer", propType: "Shots on Target", line: 1.5, pick: "OVER", confidence: 72, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Tests keepers.", injury: null },
        { player: "Vinicius Jr", team: "RMA", position: "LW", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 68, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Dynamic attacker.", injury: { status: "GTD", type: "Thigh", note: "Minor knock" } },
        { player: "Jude Bellingham", team: "RMA", position: "CM", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 62, odds: { over: +115, under: -135 }, tier: "leans", reasoning: "Scoring midfielder.", injury: null },
        { player: "Rodrygo", team: "RMA", position: "RW", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 60, odds: { over: +120, under: -140 }, tier: "leans", reasoning: "Big game player.", injury: null },

        // BARCELONA
        { player: "Robert Lewandowski", team: "BAR", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Clinical striker.", injury: null },
        { player: "Lamine Yamal", team: "BAR", position: "RW", sport: "soccer", propType: "Assists", line: 0.5, pick: "OVER", confidence: 64, odds: { over: +110, under: -130 }, tier: "goodValue", reasoning: "Young talent.", injury: null },
        { player: "Raphinha", team: "BAR", position: "LW", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 62, odds: { over: +115, under: -135 }, tier: "leans", reasoning: "Brazilian winger.", injury: null },

        // BUNDESLIGA
        { player: "Harry Kane", team: "BAY", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 77, odds: { over: -125, under: +105 }, tier: "topPicks", reasoning: "Bundesliga top scorer.", injury: null },
        { player: "Harry Kane", team: "BAY", position: "ST", sport: "soccer", propType: "Shots on Target", line: 2.5, pick: "OVER", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Volume shooter.", injury: null },
        { player: "Harry Kane", team: "BAY", position: "ST", sport: "soccer", propType: "2+ Goals", line: 1.5, pick: "YES", confidence: 58, odds: { over: +180, under: -220 }, tier: "leans", reasoning: "Brace potential.", injury: null },
        { player: "Florian Wirtz", team: "LEV", position: "AM", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 64, odds: { over: +110, under: -130 }, tier: "goodValue", reasoning: "Young talent.", injury: null },
        { player: "Jamal Musiala", team: "BAY", position: "AM", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 62, odds: { over: +115, under: -135 }, tier: "leans", reasoning: "Creative player.", injury: null },
        { player: "Leroy Sane", team: "BAY", position: "RW", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 60, odds: { over: +120, under: -140 }, tier: "leans", reasoning: "Pace threat.", injury: null },
        { player: "Victor Boniface", team: "LEV", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 64, odds: { over: +105, under: -125 }, tier: "goodValue", reasoning: "Clinical striker.", injury: null },

        // SERIE A
        { player: "Lautaro Martinez", team: "INT", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 70, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Inter's main man.", injury: null },
        { player: "Victor Osimhen", team: "NAP", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 68, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Elite finisher.", injury: null },
        { player: "Dusan Vlahovic", team: "JUV", position: "ST", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 64, odds: { over: +105, under: -125 }, tier: "goodValue", reasoning: "Juve's striker.", injury: null },
        { player: "Paulo Dybala", team: "ROM", position: "AM", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 60, odds: { over: +120, under: -140 }, tier: "leans", reasoning: "Creative talent.", injury: null },

        // LIGUE 1
        { player: "Bradley Barcola", team: "PSG", position: "LW", sport: "soccer", propType: "Anytime Goalscorer", line: 0.5, pick: "YES", confidence: 63, odds: { over: +105, under: -125 }, tier: "leans", reasoning: "PSG's new star.", injury: null },
        { player: "Ousmane Dembele", team: "PSG", position: "RW", sport: "soccer", propType: "Assists", line: 0.5, pick: "OVER", confidence: 62, odds: { over: +110, under: -130 }, tier: "leans", reasoning: "Creative winger.", injury: null }
    ],

    // =====================================================
    // MMA/UFC - 30+ Fighter Props
    // =====================================================
    mma: [
        { player: "Jon Jones", team: "USA", position: "HW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "Decision", confidence: 65, odds: { over: +150, under: -180 }, tier: "goodValue", reasoning: "Technical fighter.", injury: null },
        { player: "Jon Jones", team: "USA", position: "HW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "Yes", confidence: 62, odds: { over: +130, under: -150 }, tier: "leans", reasoning: "Goes the distance.", injury: null },
        { player: "Islam Makhachev", team: "RUS", position: "LW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "Submission", confidence: 72, odds: { over: +130, under: -150 }, tier: "goodValue", reasoning: "Dominant grappler.", injury: null },
        { player: "Islam Makhachev", team: "RUS", position: "LW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "No", confidence: 68, odds: { over: +120, under: -140 }, tier: "goodValue", reasoning: "Finishes opponents.", injury: null },
        { player: "Alex Pereira", team: "BRA", position: "LHW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "KO/TKO", confidence: 75, odds: { over: -115, under: -105 }, tier: "topPicks", reasoning: "Devastating striker.", injury: null },
        { player: "Alex Pereira", team: "BRA", position: "LHW", sport: "mma", propType: "Fight to End in Round 1", line: 0.5, pick: "Yes", confidence: 58, odds: { over: +150, under: -180 }, tier: "leans", reasoning: "Fast starter.", injury: null },
        { player: "Sean O'Malley", team: "USA", position: "BW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "KO/TKO", confidence: 66, odds: { over: +110, under: -130 }, tier: "goodValue", reasoning: "Precise striker.", injury: { status: "CLEARED", type: "Hand", note: "Fully recovered" } },
        { player: "Sean O'Malley", team: "USA", position: "BW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "Yes", confidence: 60, odds: { over: +100, under: -120 }, tier: "leans", reasoning: "Technical battles.", injury: { status: "CLEARED", type: "Hand", note: "Fully recovered" } },
        { player: "Ilia Topuria", team: "ESP", position: "FW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "KO/TKO", confidence: 70, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Heavy hands.", injury: null },
        { player: "Ilia Topuria", team: "ESP", position: "FW", sport: "mma", propType: "Fight to End in Round 2", line: 0.5, pick: "Yes", confidence: 58, odds: { over: +200, under: -250 }, tier: "leans", reasoning: "Second round finishes.", injury: null },
        { player: "Dricus Du Plessis", team: "RSA", position: "MW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "KO/TKO", confidence: 68, odds: { over: +100, under: -120 }, tier: "goodValue", reasoning: "Aggressive striker.", injury: null },
        { player: "Leon Edwards", team: "GBR", position: "WW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "Decision", confidence: 64, odds: { over: +140, under: -160 }, tier: "goodValue", reasoning: "Technical fighter.", injury: null },
        { player: "Leon Edwards", team: "GBR", position: "WW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "Yes", confidence: 66, odds: { over: -110, under: -110 }, tier: "goodValue", reasoning: "Championship rounds.", injury: null },
        { player: "Belal Muhammad", team: "USA", position: "WW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "Yes", confidence: 72, odds: { over: -130, under: +110 }, tier: "goodValue", reasoning: "Grinding style.", injury: null },
        { player: "Merab Dvalishvili", team: "GEO", position: "BW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "Yes", confidence: 74, odds: { over: -140, under: +120 }, tier: "goodValue", reasoning: "Cardio machine.", injury: null },
        { player: "Merab Dvalishvili", team: "GEO", position: "BW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "Decision", confidence: 70, odds: { over: -120, under: +100 }, tier: "goodValue", reasoning: "Wrestling-heavy.", injury: null },
        { player: "Tom Aspinall", team: "GBR", position: "HW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "KO/TKO", confidence: 76, odds: { over: -125, under: +105 }, tier: "topPicks", reasoning: "Fast heavyweight finisher.", injury: null },
        { player: "Tom Aspinall", team: "GBR", position: "HW", sport: "mma", propType: "Fight to End in Round 1", line: 0.5, pick: "Yes", confidence: 68, odds: { over: +110, under: -130 }, tier: "goodValue", reasoning: "Quick finishes.", injury: null },
        { player: "Charles Oliveira", team: "BRA", position: "LW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "Submission", confidence: 70, odds: { over: +140, under: -160 }, tier: "goodValue", reasoning: "Most subs in UFC history.", injury: null },
        { player: "Charles Oliveira", team: "BRA", position: "LW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "No", confidence: 66, odds: { over: +110, under: -130 }, tier: "goodValue", reasoning: "Finishes fights.", injury: null },
        { player: "Max Holloway", team: "USA", position: "FW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "Yes", confidence: 64, odds: { over: +100, under: -120 }, tier: "goodValue", reasoning: "High-volume striker.", injury: null },
        { player: "Max Holloway", team: "USA", position: "FW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "KO/TKO", confidence: 58, odds: { over: +150, under: -180 }, tier: "leans", reasoning: "Can finish late.", injury: null },
        { player: "Dustin Poirier", team: "USA", position: "LW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "KO/TKO", confidence: 62, odds: { over: +130, under: -150 }, tier: "leans", reasoning: "Heavy hands.", injury: null },
        { player: "Kamaru Usman", team: "USA", position: "WW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "Yes", confidence: 63, odds: { over: +110, under: -130 }, tier: "leans", reasoning: "Championship experience.", injury: null },
        { player: "Colby Covington", team: "USA", position: "WW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "Yes", confidence: 68, odds: { over: -115, under: -105 }, tier: "goodValue", reasoning: "Cardio king.", injury: null },
        { player: "Justin Gaethje", team: "USA", position: "LW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "KO/TKO", confidence: 66, odds: { over: +120, under: -140 }, tier: "goodValue", reasoning: "Violent striker.", injury: null },
        { player: "Justin Gaethje", team: "USA", position: "LW", sport: "mma", propType: "Fight to End in Round 1", line: 0.5, pick: "Yes", confidence: 55, odds: { over: +180, under: -220 }, tier: "leans", reasoning: "Early chaos.", injury: null },
        { player: "Jiri Prochazka", team: "CZE", position: "LHW", sport: "mma", propType: "Method of Victory", line: 0.5, pick: "KO/TKO", confidence: 64, odds: { over: +110, under: -130 }, tier: "goodValue", reasoning: "Unorthodox striker.", injury: null },
        { player: "Robert Whittaker", team: "AUS", position: "MW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "Yes", confidence: 62, odds: { over: +105, under: -125 }, tier: "leans", reasoning: "Technical fighter.", injury: null },
        { player: "Alexander Volkanovski", team: "AUS", position: "FW", sport: "mma", propType: "Fight to Go Distance", line: 0.5, pick: "Yes", confidence: 66, odds: { over: -105, under: -115 }, tier: "goodValue", reasoning: "Championship cardio.", injury: null }
    ]
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function getDemoProps(sport = 'all') {
    if (sport === 'all') {
        let allProps = [];
        ACTIVE_SPORTS.forEach(s => {
            if (DEMO_PROPS[s]) {
                allProps = allProps.concat(DEMO_PROPS[s]);
            }
        });
        return allProps;
    }

    if (OFFSEASON_SPORTS.includes(sport.toLowerCase())) {
        console.log(`⚠️ ${sport.toUpperCase()} is currently in offseason`);
        return [];
    }

    return DEMO_PROPS[sport.toLowerCase()] || [];
}

function getDemoPropsByTier(sport = 'all') {
    const props = getDemoProps(sport);
    const tiers = { topPicks: [], goodValue: [], leans: [], risky: [] };

    props.forEach(prop => {
        const tier = prop.tier || getTier(prop.confidence || 50);
        if (tiers[tier]) tiers[tier].push(prop);
    });

    Object.keys(tiers).forEach(tier => {
        tiers[tier].sort((a, b) => (b.confidence || 50) - (a.confidence || 50));
    });

    return tiers;
}

function getInjuryBadge(injury) {
    if (!injury) return '';
    const statusColors = { 'OUT': 'injury-out', 'QUES': 'injury-questionable', 'GTD': 'injury-gtd', 'PROB': 'injury-probable', 'CLEARED': 'injury-cleared' };
    const statusLabels = { 'OUT': 'OUT', 'QUES': 'QUES', 'GTD': 'GTD', 'PROB': 'PROB', 'CLEARED': '✓' };
    return `<span class="injury-badge ${statusColors[injury.status] || 'injury-unknown'}" title="${injury.type}: ${injury.note}">${statusLabels[injury.status] || injury.status}</span>`;
}

function isSportInSeason(sport) { return ACTIVE_SPORTS.includes(sport.toLowerCase()); }
function getActiveSports() { return [...ACTIVE_SPORTS]; }
function getOffseasonSports() { return [...OFFSEASON_SPORTS]; }
function getPropsCount() {
    let total = 0;
    ACTIVE_SPORTS.forEach(s => { if (DEMO_PROPS[s]) total += DEMO_PROPS[s].length; });
    return total;
}

// GLOBAL EXPORTS
window.DEMO_PROPS = DEMO_PROPS;
window.ACTIVE_SPORTS = ACTIVE_SPORTS;
window.OFFSEASON_SPORTS = OFFSEASON_SPORTS;
window.getDemoProps = getDemoProps;
window.getDemoPropsByTier = getDemoPropsByTier;
window.getInjuryBadge = getInjuryBadge;
window.isSportInSeason = isSportInSeason;
window.getActiveSports = getActiveSports;
window.getOffseasonSports = getOffseasonSports;
window.getPropsCount = getPropsCount;

console.log(`🎯 BetGenius AI loaded - ${getPropsCount()} player props available across ${ACTIVE_SPORTS.length} sports`);
