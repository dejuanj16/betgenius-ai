// =====================================================
// BetGenius AI - Live Roster & Injury Service
// Real-time roster updates and injury filtering
// Uses ESPN API for current rosters
// =====================================================

// PRIORITY ROSTER OVERRIDES - These players had recent trades that ESPN may not reflect yet
// These will NOT be overwritten by ESPN data
const PRIORITY_ROSTER_OVERRIDES = {
    'James Harden': { team: 'Cleveland Cavaliers', abbr: 'CLE', position: 'PG', sport: 'nba' },
    'Kevin Durant': { team: 'Houston Rockets', abbr: 'HOU', position: 'SF', sport: 'nba' },
    'Trae Young': { team: 'Washington Wizards', abbr: 'WAS', position: 'PG', sport: 'nba', injured: true },
    'Anthony Davis': { team: 'Washington Wizards', abbr: 'WAS', position: 'PF', sport: 'nba', injured: true },
    'Darius Garland': { team: 'Los Angeles Clippers', abbr: 'LAC', position: 'PG', sport: 'nba' },
    'Damian Lillard': { team: 'Portland Trail Blazers', abbr: 'POR', position: 'PG', sport: 'nba', injured: true },
    'Jaren Jackson Jr.': { team: 'Utah Jazz', abbr: 'UTA', position: 'PF', sport: 'nba' },
    'Ivica Zubac': { team: 'Indiana Pacers', abbr: 'IND', position: 'C', sport: 'nba' },
    'Tyrese Haliburton': { team: 'Indiana Pacers', abbr: 'IND', position: 'PG', sport: 'nba', injured: true },
    'Luka Doncic': { team: 'Los Angeles Lakers', abbr: 'LAL', position: 'PG', sport: 'nba', injured: true },
    "De'Aaron Fox": { team: 'San Antonio Spurs', abbr: 'SAS', position: 'PG', sport: 'nba' },
    'Jalen Green': { team: 'Phoenix Suns', abbr: 'PHX', position: 'SG', sport: 'nba' },
    'Nikola Vučević': { team: 'Boston Celtics', abbr: 'BOS', position: 'C', sport: 'nba' },
    'Nikola Vucevic': { team: 'Boston Celtics', abbr: 'BOS', position: 'C', sport: 'nba' },
    'Jayson Tatum': { team: 'Boston Celtics', abbr: 'BOS', position: 'SF', sport: 'nba', injured: true },
    'Anfernee Simons': { team: 'Chicago Bulls', abbr: 'CHI', position: 'SG', sport: 'nba' },
    'Coby White': { team: 'Charlotte Hornets', abbr: 'CHA', position: 'PG', sport: 'nba' },
    'Michael Porter Jr.': { team: 'Brooklyn Nets', abbr: 'BKN', position: 'SF', sport: 'nba' },
    'Michael Porter': { team: 'Brooklyn Nets', abbr: 'BKN', position: 'SF', sport: 'nba' },
    'Myles Turner': { team: 'Milwaukee Bucks', abbr: 'MIL', position: 'C', sport: 'nba' },
    'Cam Thomas': { team: 'Milwaukee Bucks', abbr: 'MIL', position: 'SG', sport: 'nba' },
    'Kris Middleton': { team: 'Dallas Mavericks', abbr: 'DAL', position: 'SF', sport: 'nba' },
    'Khris Middleton': { team: 'Dallas Mavericks', abbr: 'DAL', position: 'SF', sport: 'nba' },
    'Fred VanVleet': { team: 'Houston Rockets', abbr: 'HOU', position: 'PG', sport: 'nba', injured: true },
    'Malik Beasley': { team: 'Free Agent', abbr: 'FA', position: 'SG', sport: 'nba', freeAgent: true }
};

class RosterService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
        this.espnBase = 'https://site.api.espn.com/apis/site/v2/sports';
        this.espnCoreBase = 'https://sports.core.api.espn.com/v2/sports';
        this.injuredPlayers = new Set();
        this.playerTeams = new Map();
        this.lastUpdate = null;
        this.rosterSource = 'loading';

        // Pre-populate with priority overrides so ESPN can't overwrite them
        Object.entries(PRIORITY_ROSTER_OVERRIDES).forEach(([player, info]) => {
            this.playerTeams.set(player, { ...info, status: 'active', priority: true });
        });
    }

    // =====================================================
    // Fetch current rosters and injuries for all sports
    // =====================================================
    async initialize() {
        console.log('🔄 Initializing roster service...');

        try {
            // Try to fetch live data from ESPN
            const results = await Promise.allSettled([
                this.fetchNBATeamRosters(),
                this.fetchNFLTeamRosters(),
                this.fetchNHLTeamRosters(),
                this.fetchMLBTeamRosters()
            ]);

            // Check how many succeeded
            const succeeded = results.filter(r => r.status === 'fulfilled' && r.value === true).length;

            if (succeeded > 0) {
                this.rosterSource = 'espn_live';
                console.log(`✅ Fetched live rosters from ESPN (${succeeded}/4 sports)`);
            } else {
                // Fall back to static data
                console.log('⚠️ ESPN API unavailable, using verified fallback rosters');
                this.setAllFallbackData();
                this.rosterSource = 'fallback_verified';
            }

            // Fetch injuries separately
            await this.fetchAllInjuries();

            this.lastUpdate = new Date();
            console.log('✅ Roster service initialized at', this.lastUpdate.toLocaleTimeString());
            console.log(`📊 Loaded ${this.playerTeams.size} players, ${this.injuredPlayers.size} injured`);
            return true;
        } catch (error) {
            console.error('Error initializing roster service:', error);
            this.setAllFallbackData();
            this.rosterSource = 'fallback_error';
            this.lastUpdate = new Date();
            return false;
        }
    }

    // =====================================================
    // NBA Roster Fetching - All Teams
    // =====================================================
    async fetchNBATeamRosters() {
        const nbaTeams = [
            'atl', 'bos', 'bkn', 'cha', 'chi', 'cle', 'dal', 'den', 'det', 'gs',
            'hou', 'ind', 'lac', 'lal', 'mem', 'mia', 'mil', 'min', 'no', 'ny',
            'okc', 'orl', 'phi', 'phx', 'por', 'sac', 'sa', 'tor', 'uta', 'wsh'
        ];

        let success = false;
        for (const teamId of nbaTeams) {
            try {
                const response = await fetch(`${this.espnBase}/basketball/nba/teams/${teamId}/roster`);
                if (response.ok) {
                    const data = await response.json();
                    this.processTeamRoster(data, 'nba');
                    success = true;
                }
            } catch (e) {
                // Continue with other teams
            }
        }

        if (!success) {
            this.setNBAFallbackData();
        }
        return success;
    }

    // =====================================================
    // NFL Roster Fetching - All Teams
    // =====================================================
    async fetchNFLTeamRosters() {
        const nflTeams = [
            'ari', 'atl', 'bal', 'buf', 'car', 'chi', 'cin', 'cle', 'dal', 'den',
            'det', 'gb', 'hou', 'ind', 'jax', 'kc', 'lv', 'lac', 'lar', 'mia',
            'min', 'ne', 'no', 'nyg', 'nyj', 'phi', 'pit', 'sf', 'sea', 'tb', 'ten', 'wsh'
        ];

        let success = false;
        for (const teamId of nflTeams) {
            try {
                const response = await fetch(`${this.espnBase}/football/nfl/teams/${teamId}/roster`);
                if (response.ok) {
                    const data = await response.json();
                    this.processTeamRoster(data, 'nfl');
                    success = true;
                }
            } catch (e) {
                // Continue with other teams
            }
        }

        if (!success) {
            this.setNFLFallbackData();
        }
        return success;
    }

    // =====================================================
    // NHL Roster Fetching - All Teams
    // =====================================================
    async fetchNHLTeamRosters() {
        const nhlTeams = [
            'ana', 'ari', 'bos', 'buf', 'cgy', 'car', 'chi', 'col', 'cbj', 'dal',
            'det', 'edm', 'fla', 'la', 'min', 'mtl', 'nsh', 'nj', 'nyi', 'nyr',
            'ott', 'phi', 'pit', 'sj', 'sea', 'stl', 'tb', 'tor', 'utah', 'van', 'vgk', 'wsh', 'wpg'
        ];

        let success = false;
        for (const teamId of nhlTeams) {
            try {
                const response = await fetch(`${this.espnBase}/hockey/nhl/teams/${teamId}/roster`);
                if (response.ok) {
                    const data = await response.json();
                    this.processTeamRoster(data, 'nhl');
                    success = true;
                }
            } catch (e) {
                // Continue with other teams
            }
        }

        if (!success) {
            this.setNHLFallbackData();
        }
        return success;
    }

    // =====================================================
    // MLB Roster Fetching - All Teams
    // =====================================================
    async fetchMLBTeamRosters() {
        const mlbTeams = [
            'ari', 'atl', 'bal', 'bos', 'chc', 'chw', 'cin', 'cle', 'col', 'det',
            'hou', 'kc', 'laa', 'lad', 'mia', 'mil', 'min', 'nym', 'nyy', 'oak',
            'phi', 'pit', 'sd', 'sf', 'sea', 'stl', 'tb', 'tex', 'tor', 'wsh'
        ];

        let success = false;
        for (const teamId of mlbTeams) {
            try {
                const response = await fetch(`${this.espnBase}/baseball/mlb/teams/${teamId}/roster`);
                if (response.ok) {
                    const data = await response.json();
                    this.processTeamRoster(data, 'mlb');
                    success = true;
                }
            } catch (e) {
                // Continue with other teams
            }
        }

        if (!success) {
            this.setMLBFallbackData();
        }
        return success;
    }

    processTeamRoster(data, sport) {
        if (!data.team) return;

        const teamName = data.team.displayName || data.team.name;
        const teamAbbr = data.team.abbreviation;

        // Process athletes from roster
        const athletes = data.athletes || [];
        athletes.forEach(group => {
            const items = group.items || [group];
            items.forEach(athlete => {
                if (athlete.displayName || athlete.fullName) {
                    const playerName = athlete.displayName || athlete.fullName;
                    const position = athlete.position?.abbreviation || athlete.position?.name || '';

                    // Skip players with priority overrides (recent trades not yet in ESPN)
                    const existing = this.playerTeams.get(playerName);
                    if (existing?.priority) {
                        console.log(`🔒 Keeping priority roster for ${playerName}: ${existing.abbr} (ESPN has: ${teamAbbr})`);
                        return; // Don't overwrite priority players
                    }

                    this.playerTeams.set(playerName, {
                        team: teamName,
                        abbr: teamAbbr,
                        sport: sport,
                        status: athlete.status?.type || 'active',
                        position: position,
                        jersey: athlete.jersey || ''
                    });

                    // Check for injuries
                    if (athlete.injuries?.length > 0 ||
                        athlete.status?.type === 'out' ||
                        athlete.status?.type === 'doubtful' ||
                        athlete.status?.type === 'injured-reserve') {
                        this.injuredPlayers.add(playerName);
                    }
                }
            });
        });
    }

    // =====================================================
    // Fetch Injuries from ESPN
    // =====================================================
    async fetchAllInjuries() {
        try {
            await Promise.allSettled([
                this.fetchSportInjuries('basketball', 'nba'),
                this.fetchSportInjuries('football', 'nfl'),
                this.fetchSportInjuries('hockey', 'nhl'),
                this.fetchSportInjuries('baseball', 'mlb')
            ]);
        } catch (error) {
            console.log('Using fallback injury data');
        }
    }

    async fetchSportInjuries(sportPath, sport) {
        try {
            const response = await fetch(`${this.espnBase}/${sportPath}/${sport}/injuries`);
            if (!response.ok) return;

            const data = await response.json();

            // Process injuries from response
            if (data.injuries) {
                data.injuries.forEach(teamInjury => {
                    if (teamInjury.injuries) {
                        teamInjury.injuries.forEach(injury => {
                            const status = injury.status?.toLowerCase() || '';
                            if (status === 'out' || status === 'doubtful' || status === 'ir' || status === 'injured reserve') {
                                const playerName = injury.athlete?.displayName;
                                if (playerName) {
                                    this.injuredPlayers.add(playerName);
                                    console.log(`🏥 ${playerName} (${status}) - ${sport.toUpperCase()}`);
                                }
                            }
                        });
                    }
                });
            }
        } catch (error) {
            // Silently continue
        }
    }

    // =====================================================
    // Set All Fallback Data
    // =====================================================
    setAllFallbackData() {
        this.setNBAFallbackData();
        this.setNFLFallbackData();
        this.setNHLFallbackData();
        this.setMLBFallbackData();
    }

    // =====================================================
    // NBA Fallback Data - Current as of Feb 2026
    // =====================================================
    setNBAFallbackData() {
        const nbaRosters = {
            // === LOS ANGELES LAKERS ===
            'LeBron James': { team: 'Los Angeles Lakers', abbr: 'LAL', position: 'SF' },
            'Luka Doncic': { team: 'Los Angeles Lakers', abbr: 'LAL', position: 'PG' }, // TRADED 2025-26
            'Austin Reaves': { team: 'Los Angeles Lakers', abbr: 'LAL', position: 'SG' },
            "D'Angelo Russell": { team: 'Los Angeles Lakers', abbr: 'LAL', position: 'PG' },
            'Rui Hachimura': { team: 'Los Angeles Lakers', abbr: 'LAL', position: 'PF' },
            'Dalton Knecht': { team: 'Los Angeles Lakers', abbr: 'LAL', position: 'SG' },
            'Max Christie': { team: 'Los Angeles Lakers', abbr: 'LAL', position: 'SG' },
            'Gabe Vincent': { team: 'Los Angeles Lakers', abbr: 'LAL', position: 'PG' },
            'Jaxson Hayes': { team: 'Los Angeles Lakers', abbr: 'LAL', position: 'C' },

            // === BOSTON CELTICS ===
            'Jayson Tatum': { team: 'Boston Celtics', abbr: 'BOS', position: 'SF' },
            'Jaylen Brown': { team: 'Boston Celtics', abbr: 'BOS', position: 'SG' },
            'Derrick White': { team: 'Boston Celtics', abbr: 'BOS', position: 'PG' },
            'Kristaps Porzingis': { team: 'Boston Celtics', abbr: 'BOS', position: 'C' },
            'Jrue Holiday': { team: 'Boston Celtics', abbr: 'BOS', position: 'PG' },
            'Al Horford': { team: 'Boston Celtics', abbr: 'BOS', position: 'C' },
            'Payton Pritchard': { team: 'Boston Celtics', abbr: 'BOS', position: 'PG' },
            'Sam Hauser': { team: 'Boston Celtics', abbr: 'BOS', position: 'SF' },

// === DENVER NUGGETS ===
            'Nikola Jokic': { team: 'Denver Nuggets', abbr: 'DEN', position: 'C' },
            'Jamal Murray': { team: 'Denver Nuggets', abbr: 'DEN', position: 'PG' },
            'Aaron Gordon': { team: 'Denver Nuggets', abbr: 'DEN', position: 'PF' },
            'Christian Braun': { team: 'Denver Nuggets', abbr: 'DEN', position: 'SG' },
            'Julian Strawther': { team: 'Denver Nuggets', abbr: 'DEN', position: 'SG' },
            'Peyton Watson': { team: 'Denver Nuggets', abbr: 'DEN', position: 'SF' },
            'Russell Westbrook': { team: 'Denver Nuggets', abbr: 'DEN', position: 'PG' },

            // === GOLDEN STATE WARRIORS ===
            'Stephen Curry': { team: 'Golden State Warriors', abbr: 'GSW', position: 'PG' },
            'Andrew Wiggins': { team: 'Golden State Warriors', abbr: 'GSW', position: 'SF' },
            'Draymond Green': { team: 'Golden State Warriors', abbr: 'GSW', position: 'PF' },
            'Jonathan Kuminga': { team: 'Golden State Warriors', abbr: 'GSW', position: 'SF' },
            'Brandin Podziemski': { team: 'Golden State Warriors', abbr: 'GSW', position: 'SG' },
            'Kevon Looney': { team: 'Golden State Warriors', abbr: 'GSW', position: 'C' },
            'Gary Payton II': { team: 'Golden State Warriors', abbr: 'GSW', position: 'SG' },
            'Moses Moody': { team: 'Golden State Warriors', abbr: 'GSW', position: 'SG' },
            // Note: Klay Thompson is on Dallas Mavericks now

            // === DALLAS MAVERICKS ===
            // Note: Luka Doncic traded to Lakers 2025-26
            'Kyrie Irving': { team: 'Dallas Mavericks', abbr: 'DAL', position: 'SG' },
            'Klay Thompson': { team: 'Dallas Mavericks', abbr: 'DAL', position: 'SG' }, // Signed 2024
            'P.J. Washington': { team: 'Dallas Mavericks', abbr: 'DAL', position: 'PF' },
            'Daniel Gafford': { team: 'Dallas Mavericks', abbr: 'DAL', position: 'C' },
            'Dereck Lively II': { team: 'Dallas Mavericks', abbr: 'DAL', position: 'C' },
            'Naji Marshall': { team: 'Dallas Mavericks', abbr: 'DAL', position: 'SF' },
            'Quentin Grimes': { team: 'Dallas Mavericks', abbr: 'DAL', position: 'SG' },

            // === NEW YORK KNICKS ===
            'Jalen Brunson': { team: 'New York Knicks', abbr: 'NYK', position: 'PG' },
            'Karl-Anthony Towns': { team: 'New York Knicks', abbr: 'NYK', position: 'C' }, // Traded 2024
            'Mikal Bridges': { team: 'New York Knicks', abbr: 'NYK', position: 'SF' }, // Traded 2024
            'OG Anunoby': { team: 'New York Knicks', abbr: 'NYK', position: 'SF' },
            'Josh Hart': { team: 'New York Knicks', abbr: 'NYK', position: 'SG' },
            'Donte DiVincenzo': { team: 'New York Knicks', abbr: 'NYK', position: 'SG' },
            'Miles McBride': { team: 'New York Knicks', abbr: 'NYK', position: 'PG' },
            // Note: Julius Randle traded to Minnesota

            // === MINNESOTA TIMBERWOLVES ===
            'Anthony Edwards': { team: 'Minnesota Timberwolves', abbr: 'MIN', position: 'SG' },
            'Julius Randle': { team: 'Minnesota Timberwolves', abbr: 'MIN', position: 'PF' }, // Traded 2024
            'Rudy Gobert': { team: 'Minnesota Timberwolves', abbr: 'MIN', position: 'C' },
            'Jaden McDaniels': { team: 'Minnesota Timberwolves', abbr: 'MIN', position: 'SF' },
            'Mike Conley': { team: 'Minnesota Timberwolves', abbr: 'MIN', position: 'PG' },
            'Naz Reid': { team: 'Minnesota Timberwolves', abbr: 'MIN', position: 'C' },
            // Note: Karl-Anthony Towns traded to Knicks

            // === PHOENIX SUNS ===
            // Note: Kevin Durant traded to Houston 2025-26
            'Devin Booker': { team: 'Phoenix Suns', abbr: 'PHX', position: 'SG' },
            'Bradley Beal': { team: 'Phoenix Suns', abbr: 'PHX', position: 'SG' },
            'Jusuf Nurkic': { team: 'Phoenix Suns', abbr: 'PHX', position: 'C' },
            'Grayson Allen': { team: 'Phoenix Suns', abbr: 'PHX', position: 'SG' },
            'Royce O\'Neale': { team: 'Phoenix Suns', abbr: 'PHX', position: 'SF' },
            'Tyus Jones': { team: 'Phoenix Suns', abbr: 'PHX', position: 'PG' },

            // === MIAMI HEAT ===
            'Jimmy Butler': { team: 'Miami Heat', abbr: 'MIA', position: 'SF' },
            'Bam Adebayo': { team: 'Miami Heat', abbr: 'MIA', position: 'C' },
            'Tyler Herro': { team: 'Miami Heat', abbr: 'MIA', position: 'SG' },
            'Terry Rozier': { team: 'Miami Heat', abbr: 'MIA', position: 'PG' },
            'Jaime Jaquez Jr.': { team: 'Miami Heat', abbr: 'MIA', position: 'SF' },
            'Duncan Robinson': { team: 'Miami Heat', abbr: 'MIA', position: 'SG' },

            // === MILWAUKEE BUCKS ===
            'Giannis Antetokounmpo': { team: 'Milwaukee Bucks', abbr: 'MIL', position: 'PF' },
            // Note: Damian Lillard traded back to Portland 2025-26
            'Khris Middleton': { team: 'Milwaukee Bucks', abbr: 'MIL', position: 'SF' },
            'Brook Lopez': { team: 'Milwaukee Bucks', abbr: 'MIL', position: 'C' },
            'Bobby Portis': { team: 'Milwaukee Bucks', abbr: 'MIL', position: 'PF' },
            'Gary Trent Jr.': { team: 'Milwaukee Bucks', abbr: 'MIL', position: 'SG' },

            // === OKLAHOMA CITY THUNDER ===
            'Shai Gilgeous-Alexander': { team: 'Oklahoma City Thunder', abbr: 'OKC', position: 'PG' },
            'Jalen Williams': { team: 'Oklahoma City Thunder', abbr: 'OKC', position: 'SF' },
            'Chet Holmgren': { team: 'Oklahoma City Thunder', abbr: 'OKC', position: 'C' },
            'Lu Dort': { team: 'Oklahoma City Thunder', abbr: 'OKC', position: 'SG' },
            'Isaiah Hartenstein': { team: 'Oklahoma City Thunder', abbr: 'OKC', position: 'C' },
            'Alex Caruso': { team: 'Oklahoma City Thunder', abbr: 'OKC', position: 'SG' }, // Traded 2024

            // === CLEVELAND CAVALIERS ===
            'Donovan Mitchell': { team: 'Cleveland Cavaliers', abbr: 'CLE', position: 'SG' },
            'James Harden': { team: 'Cleveland Cavaliers', abbr: 'CLE', position: 'PG' }, // TRADED 2025-26
            'Evan Mobley': { team: 'Cleveland Cavaliers', abbr: 'CLE', position: 'PF' },
            'Jarrett Allen': { team: 'Cleveland Cavaliers', abbr: 'CLE', position: 'C' },
            'Max Strus': { team: 'Cleveland Cavaliers', abbr: 'CLE', position: 'SG' },
            'Isaac Okoro': { team: 'Cleveland Cavaliers', abbr: 'CLE', position: 'SF' },
            // Note: Darius Garland traded to LA Clippers 2025-26

            // === PHILADELPHIA 76ERS ===
            'Joel Embiid': { team: 'Philadelphia 76ers', abbr: 'PHI', position: 'C' },
            'Tyrese Maxey': { team: 'Philadelphia 76ers', abbr: 'PHI', position: 'PG' },
            'Paul George': { team: 'Philadelphia 76ers', abbr: 'PHI', position: 'SF' }, // Signed 2024
            'Caleb Martin': { team: 'Philadelphia 76ers', abbr: 'PHI', position: 'SF' },
            'Kelly Oubre Jr.': { team: 'Philadelphia 76ers', abbr: 'PHI', position: 'SF' },

            // === LOS ANGELES CLIPPERS ===
            'Darius Garland': { team: 'Los Angeles Clippers', abbr: 'LAC', position: 'PG' }, // TRADED 2025-26 from Cleveland
            'Kawhi Leonard': { team: 'Los Angeles Clippers', abbr: 'LAC', position: 'SF' },
            'Norman Powell': { team: 'Los Angeles Clippers', abbr: 'LAC', position: 'SG' },
            // Note: Ivica Zubac traded to Indiana 2025-26
            'Terance Mann': { team: 'Los Angeles Clippers', abbr: 'LAC', position: 'SG' },
            // Note: Paul George signed with 76ers
            // Note: James Harden traded to Cleveland 2025-26

            // === MEMPHIS GRIZZLIES ===
            'Ja Morant': { team: 'Memphis Grizzlies', abbr: 'MEM', position: 'PG' },
            'Desmond Bane': { team: 'Memphis Grizzlies', abbr: 'MEM', position: 'SG' },
            // Note: Jaren Jackson Jr. traded to Utah 2025-26
            'Marcus Smart': { team: 'Memphis Grizzlies', abbr: 'MEM', position: 'PG' },

            // === SACRAMENTO KINGS ===
            // Note: De'Aaron Fox traded to San Antonio 2025-26
            'Domantas Sabonis': { team: 'Sacramento Kings', abbr: 'SAC', position: 'C' },
            'DeMar DeRozan': { team: 'Sacramento Kings', abbr: 'SAC', position: 'SF' }, // Signed 2024
            'Keegan Murray': { team: 'Sacramento Kings', abbr: 'SAC', position: 'SF' },
            'Kevin Huerter': { team: 'Sacramento Kings', abbr: 'SAC', position: 'SG' },

            // === CHICAGO BULLS ===
            'Zach LaVine': { team: 'Chicago Bulls', abbr: 'CHI', position: 'SG' },
            'Coby White': { team: 'Chicago Bulls', abbr: 'CHI', position: 'PG' },
            'Nikola Vucevic': { team: 'Chicago Bulls', abbr: 'CHI', position: 'C' },
            'Patrick Williams': { team: 'Chicago Bulls', abbr: 'CHI', position: 'SF' },

            // === ORLANDO MAGIC ===
            'Paolo Banchero': { team: 'Orlando Magic', abbr: 'ORL', position: 'PF' },
            'Franz Wagner': { team: 'Orlando Magic', abbr: 'ORL', position: 'SF' },
            'Jalen Suggs': { team: 'Orlando Magic', abbr: 'ORL', position: 'PG' },
            'Wendell Carter Jr.': { team: 'Orlando Magic', abbr: 'ORL', position: 'C' },

            // === INDIANA PACERS ===
            'Tyrese Haliburton': { team: 'Indiana Pacers', abbr: 'IND', position: 'PG' },
            'Pascal Siakam': { team: 'Indiana Pacers', abbr: 'IND', position: 'PF' },
            'Ivica Zubac': { team: 'Indiana Pacers', abbr: 'IND', position: 'C' }, // TRADED 2025-26 from LAC
            'Myles Turner': { team: 'Indiana Pacers', abbr: 'IND', position: 'C' },
            'Bennedict Mathurin': { team: 'Indiana Pacers', abbr: 'IND', position: 'SG' },

            // === NEW ORLEANS PELICANS ===
            'Zion Williamson': { team: 'New Orleans Pelicans', abbr: 'NOP', position: 'PF' },
            'Brandon Ingram': { team: 'New Orleans Pelicans', abbr: 'NOP', position: 'SF' },
            'CJ McCollum': { team: 'New Orleans Pelicans', abbr: 'NOP', position: 'SG' },
            'Trey Murphy III': { team: 'New Orleans Pelicans', abbr: 'NOP', position: 'SF' },
            'Dejounte Murray': { team: 'New Orleans Pelicans', abbr: 'NOP', position: 'PG' },

            // === TORONTO RAPTORS ===
            'Scottie Barnes': { team: 'Toronto Raptors', abbr: 'TOR', position: 'SF' },
            'RJ Barrett': { team: 'Toronto Raptors', abbr: 'TOR', position: 'SG' }, // Traded 2024
            'Immanuel Quickley': { team: 'Toronto Raptors', abbr: 'TOR', position: 'PG' }, // Traded 2024
            'Jakob Poeltl': { team: 'Toronto Raptors', abbr: 'TOR', position: 'C' },
            'Gradey Dick': { team: 'Toronto Raptors', abbr: 'TOR', position: 'SG' },

            // === BROOKLYN NETS ===
            'Cameron Johnson': { team: 'Brooklyn Nets', abbr: 'BKN', position: 'SF' },
            'Cam Thomas': { team: 'Brooklyn Nets', abbr: 'BKN', position: 'SG' },
            'Nic Claxton': { team: 'Brooklyn Nets', abbr: 'BKN', position: 'C' },
            'Dennis Schroder': { team: 'Brooklyn Nets', abbr: 'BKN', position: 'PG' },
            // Note: Mikal Bridges traded to Knicks

            // === HOUSTON ROCKETS ===
            'Kevin Durant': { team: 'Houston Rockets', abbr: 'HOU', position: 'SF' }, // TRADED 2025-26 from Phoenix
            'Jalen Green': { team: 'Houston Rockets', abbr: 'HOU', position: 'SG' },
            'Alperen Sengun': { team: 'Houston Rockets', abbr: 'HOU', position: 'C' },
            'Jabari Smith Jr.': { team: 'Houston Rockets', abbr: 'HOU', position: 'PF' },
            'Fred VanVleet': { team: 'Houston Rockets', abbr: 'HOU', position: 'PG' },
            'Dillon Brooks': { team: 'Houston Rockets', abbr: 'HOU', position: 'SF' },

            // === SAN ANTONIO SPURS ===
            'Victor Wembanyama': { team: 'San Antonio Spurs', abbr: 'SAS', position: 'C' },
            "De'Aaron Fox": { team: 'San Antonio Spurs', abbr: 'SAS', position: 'PG' }, // TRADED 2025-26 from Sacramento
            'Devin Vassell': { team: 'San Antonio Spurs', abbr: 'SAS', position: 'SG' },
            'Jeremy Sochan': { team: 'San Antonio Spurs', abbr: 'SAS', position: 'SF' },
            'Keldon Johnson': { team: 'San Antonio Spurs', abbr: 'SAS', position: 'SF' },
            'Chris Paul': { team: 'San Antonio Spurs', abbr: 'SAS', position: 'PG' }, // Signed 2024
            'Harrison Barnes': { team: 'San Antonio Spurs', abbr: 'SAS', position: 'SF' },

            // === UTAH JAZZ ===
            'Lauri Markkanen': { team: 'Utah Jazz', abbr: 'UTA', position: 'PF' },
            'Jaren Jackson Jr.': { team: 'Utah Jazz', abbr: 'UTA', position: 'PF' }, // TRADED 2025-26 from Memphis
            'Jordan Clarkson': { team: 'Utah Jazz', abbr: 'UTA', position: 'SG' },
            'Collin Sexton': { team: 'Utah Jazz', abbr: 'UTA', position: 'PG' },
            'John Collins': { team: 'Utah Jazz', abbr: 'UTA', position: 'PF' },

            // === CHARLOTTE HORNETS ===
            'LaMelo Ball': { team: 'Charlotte Hornets', abbr: 'CHA', position: 'PG' },
            'Brandon Miller': { team: 'Charlotte Hornets', abbr: 'CHA', position: 'SF' },
            'Miles Bridges': { team: 'Charlotte Hornets', abbr: 'CHA', position: 'SF' },
            'Mark Williams': { team: 'Charlotte Hornets', abbr: 'CHA', position: 'C' },

            // === WASHINGTON WIZARDS ===
            'Trae Young': { team: 'Washington Wizards', abbr: 'WAS', position: 'PG' }, // TRADED 2025-26 from Atlanta
            'Anthony Davis': { team: 'Washington Wizards', abbr: 'WAS', position: 'PF' }, // TRADED 2025-26 from LAL
            'Kyle Kuzma': { team: 'Washington Wizards', abbr: 'WAS', position: 'PF' },
            'Jordan Poole': { team: 'Washington Wizards', abbr: 'WAS', position: 'SG' },
            'Bilal Coulibaly': { team: 'Washington Wizards', abbr: 'WAS', position: 'SF' },
            'Alex Sarr': { team: 'Washington Wizards', abbr: 'WAS', position: 'C' }, // 2024 Draft

            // === DETROIT PISTONS ===
            'Cade Cunningham': { team: 'Detroit Pistons', abbr: 'DET', position: 'PG' },
            'Jaden Ivey': { team: 'Detroit Pistons', abbr: 'DET', position: 'SG' },
            'Ausar Thompson': { team: 'Detroit Pistons', abbr: 'DET', position: 'SF' },
            'Jalen Duren': { team: 'Detroit Pistons', abbr: 'DET', position: 'C' },

            // === PORTLAND TRAIL BLAZERS ===
            'Damian Lillard': { team: 'Portland Trail Blazers', abbr: 'POR', position: 'PG' }, // TRADED BACK 2025-26 from Milwaukee (Injured)
            'Anfernee Simons': { team: 'Portland Trail Blazers', abbr: 'POR', position: 'SG' },
            'Scoot Henderson': { team: 'Portland Trail Blazers', abbr: 'POR', position: 'PG' },
            'Jerami Grant': { team: 'Portland Trail Blazers', abbr: 'POR', position: 'SF' },
            'Deandre Ayton': { team: 'Portland Trail Blazers', abbr: 'POR', position: 'C' },

            // === ATLANTA HAWKS ===
            // Note: Trae Young traded to Washington 2025-26
            'Jalen Johnson': { team: 'Atlanta Hawks', abbr: 'ATL', position: 'SF' },
            'De\'Andre Hunter': { team: 'Atlanta Hawks', abbr: 'ATL', position: 'SF' },
            'Clint Capela': { team: 'Atlanta Hawks', abbr: 'ATL', position: 'C' },
            'Dyson Daniels': { team: 'Atlanta Hawks', abbr: 'ATL', position: 'SG' }
        };

        Object.entries(nbaRosters).forEach(([player, info]) => {
            // Skip priority players (already set in constructor)
            const existing = this.playerTeams.get(player);
            if (existing?.priority) return;
            this.playerTeams.set(player, { ...info, sport: 'nba', status: 'active' });
        });

        // Known injuries as of Feb 2026 (approximate)
        const knownInjuries = ['Khris Middleton', 'Kawhi Leonard', 'Kristaps Porzingis'];
        knownInjuries.forEach(p => this.injuredPlayers.add(p));
    }

    // =====================================================
    // NFL Fallback Data - Current as of Feb 2026
    // =====================================================
    setNFLFallbackData() {
        const nflRosters = {
            // === KANSAS CITY CHIEFS ===
            'Patrick Mahomes': { team: 'Kansas City Chiefs', abbr: 'KC', position: 'QB' },
            'Travis Kelce': { team: 'Kansas City Chiefs', abbr: 'KC', position: 'TE' },
            'Isiah Pacheco': { team: 'Kansas City Chiefs', abbr: 'KC', position: 'RB' },
            'Rashee Rice': { team: 'Kansas City Chiefs', abbr: 'KC', position: 'WR' },
            'Xavier Worthy': { team: 'Kansas City Chiefs', abbr: 'KC', position: 'WR' },
            'Hollywood Brown': { team: 'Kansas City Chiefs', abbr: 'KC', position: 'WR' },
            'Chris Jones': { team: 'Kansas City Chiefs', abbr: 'KC', position: 'DT' },

            // === PHILADELPHIA EAGLES ===
            'Jalen Hurts': { team: 'Philadelphia Eagles', abbr: 'PHI', position: 'QB' },
            'A.J. Brown': { team: 'Philadelphia Eagles', abbr: 'PHI', position: 'WR' },
            'DeVonta Smith': { team: 'Philadelphia Eagles', abbr: 'PHI', position: 'WR' },
            'Saquon Barkley': { team: 'Philadelphia Eagles', abbr: 'PHI', position: 'RB' }, // Signed 2024
            'Dallas Goedert': { team: 'Philadelphia Eagles', abbr: 'PHI', position: 'TE' },
            'Jahan Dotson': { team: 'Philadelphia Eagles', abbr: 'PHI', position: 'WR' },

            // === SAN FRANCISCO 49ERS ===
            'Brock Purdy': { team: 'San Francisco 49ers', abbr: 'SF', position: 'QB' },
            'Christian McCaffrey': { team: 'San Francisco 49ers', abbr: 'SF', position: 'RB' },
            'Deebo Samuel': { team: 'San Francisco 49ers', abbr: 'SF', position: 'WR' },
            'Brandon Aiyuk': { team: 'San Francisco 49ers', abbr: 'SF', position: 'WR' },
            'George Kittle': { team: 'San Francisco 49ers', abbr: 'SF', position: 'TE' },
            'Nick Bosa': { team: 'San Francisco 49ers', abbr: 'SF', position: 'DE' },

            // === DALLAS COWBOYS ===
            'Dak Prescott': { team: 'Dallas Cowboys', abbr: 'DAL', position: 'QB' },
            'CeeDee Lamb': { team: 'Dallas Cowboys', abbr: 'DAL', position: 'WR' },
            'Rico Dowdle': { team: 'Dallas Cowboys', abbr: 'DAL', position: 'RB' },
            'Jake Ferguson': { team: 'Dallas Cowboys', abbr: 'DAL', position: 'TE' },
            'Brandin Cooks': { team: 'Dallas Cowboys', abbr: 'DAL', position: 'WR' },
            'Micah Parsons': { team: 'Dallas Cowboys', abbr: 'DAL', position: 'LB' },
            // Note: Tony Pollard signed with Titans

            // === BUFFALO BILLS ===
            'Josh Allen': { team: 'Buffalo Bills', abbr: 'BUF', position: 'QB' },
            'James Cook': { team: 'Buffalo Bills', abbr: 'BUF', position: 'RB' },
            'Khalil Shakir': { team: 'Buffalo Bills', abbr: 'BUF', position: 'WR' },
            'Dalton Kincaid': { team: 'Buffalo Bills', abbr: 'BUF', position: 'TE' },
            'Amari Cooper': { team: 'Buffalo Bills', abbr: 'BUF', position: 'WR' },
            'Curtis Samuel': { team: 'Buffalo Bills', abbr: 'BUF', position: 'WR' },
            // Note: Stefon Diggs traded to Texans

            // === HOUSTON TEXANS ===
            'C.J. Stroud': { team: 'Houston Texans', abbr: 'HOU', position: 'QB' },
            'Nico Collins': { team: 'Houston Texans', abbr: 'HOU', position: 'WR' },
            'Stefon Diggs': { team: 'Houston Texans', abbr: 'HOU', position: 'WR' }, // Traded 2024
            'Joe Mixon': { team: 'Houston Texans', abbr: 'HOU', position: 'RB' }, // Traded 2024
            'Tank Dell': { team: 'Houston Texans', abbr: 'HOU', position: 'WR' },
            'Dalton Schultz': { team: 'Houston Texans', abbr: 'HOU', position: 'TE' },

            // === DETROIT LIONS ===
            'Jared Goff': { team: 'Detroit Lions', abbr: 'DET', position: 'QB' },
            'Amon-Ra St. Brown': { team: 'Detroit Lions', abbr: 'DET', position: 'WR' },
            'Jahmyr Gibbs': { team: 'Detroit Lions', abbr: 'DET', position: 'RB' },
            'David Montgomery': { team: 'Detroit Lions', abbr: 'DET', position: 'RB' },
            'Sam LaPorta': { team: 'Detroit Lions', abbr: 'DET', position: 'TE' },
            'Jameson Williams': { team: 'Detroit Lions', abbr: 'DET', position: 'WR' },
            'Aidan Hutchinson': { team: 'Detroit Lions', abbr: 'DET', position: 'DE' },

            // === BALTIMORE RAVENS ===
            'Lamar Jackson': { team: 'Baltimore Ravens', abbr: 'BAL', position: 'QB' },
            'Derrick Henry': { team: 'Baltimore Ravens', abbr: 'BAL', position: 'RB' }, // Signed 2024
            'Zay Flowers': { team: 'Baltimore Ravens', abbr: 'BAL', position: 'WR' },
            'Mark Andrews': { team: 'Baltimore Ravens', abbr: 'BAL', position: 'TE' },
            'Rashod Bateman': { team: 'Baltimore Ravens', abbr: 'BAL', position: 'WR' },

            // === MINNESOTA VIKINGS ===
            'Sam Darnold': { team: 'Minnesota Vikings', abbr: 'MIN', position: 'QB' }, // Signed 2024
            'Justin Jefferson': { team: 'Minnesota Vikings', abbr: 'MIN', position: 'WR' },
            'Aaron Jones': { team: 'Minnesota Vikings', abbr: 'MIN', position: 'RB' }, // Signed 2024
            'Jordan Addison': { team: 'Minnesota Vikings', abbr: 'MIN', position: 'WR' },
            'T.J. Hockenson': { team: 'Minnesota Vikings', abbr: 'MIN', position: 'TE' },
            'J.J. McCarthy': { team: 'Minnesota Vikings', abbr: 'MIN', position: 'QB' }, // 2024 Draft

            // === GREEN BAY PACKERS ===
            'Jordan Love': { team: 'Green Bay Packers', abbr: 'GB', position: 'QB' },
            'Josh Jacobs': { team: 'Green Bay Packers', abbr: 'GB', position: 'RB' }, // Signed 2024
            'Jayden Reed': { team: 'Green Bay Packers', abbr: 'GB', position: 'WR' },
            'Christian Watson': { team: 'Green Bay Packers', abbr: 'GB', position: 'WR' },
            'Tucker Kraft': { team: 'Green Bay Packers', abbr: 'GB', position: 'TE' },
            'Romeo Doubs': { team: 'Green Bay Packers', abbr: 'GB', position: 'WR' },

            // === CINCINNATI BENGALS ===
            'Joe Burrow': { team: 'Cincinnati Bengals', abbr: 'CIN', position: 'QB' },
            'Ja\'Marr Chase': { team: 'Cincinnati Bengals', abbr: 'CIN', position: 'WR' },
            'Tee Higgins': { team: 'Cincinnati Bengals', abbr: 'CIN', position: 'WR' },
            'Zack Moss': { team: 'Cincinnati Bengals', abbr: 'CIN', position: 'RB' },
            'Chase Brown': { team: 'Cincinnati Bengals', abbr: 'CIN', position: 'RB' },

            // === MIAMI DOLPHINS ===
            'Tua Tagovailoa': { team: 'Miami Dolphins', abbr: 'MIA', position: 'QB' },
            'Tyreek Hill': { team: 'Miami Dolphins', abbr: 'MIA', position: 'WR' },
            'Jaylen Waddle': { team: 'Miami Dolphins', abbr: 'MIA', position: 'WR' },
            'De\'Von Achane': { team: 'Miami Dolphins', abbr: 'MIA', position: 'RB' },
            'Raheem Mostert': { team: 'Miami Dolphins', abbr: 'MIA', position: 'RB' },

            // === TENNESSEE TITANS ===
            'Will Levis': { team: 'Tennessee Titans', abbr: 'TEN', position: 'QB' },
            'Tony Pollard': { team: 'Tennessee Titans', abbr: 'TEN', position: 'RB' }, // Signed 2024
            'DeAndre Hopkins': { team: 'Tennessee Titans', abbr: 'TEN', position: 'WR' },
            'Calvin Ridley': { team: 'Tennessee Titans', abbr: 'TEN', position: 'WR' },
            'Tyjae Spears': { team: 'Tennessee Titans', abbr: 'TEN', position: 'RB' },

            // === CHICAGO BEARS ===
            'Caleb Williams': { team: 'Chicago Bears', abbr: 'CHI', position: 'QB' }, // 2024 Draft #1
            'D.J. Moore': { team: 'Chicago Bears', abbr: 'CHI', position: 'WR' },
            'Rome Odunze': { team: 'Chicago Bears', abbr: 'CHI', position: 'WR' }, // 2024 Draft
            'Keenan Allen': { team: 'Chicago Bears', abbr: 'CHI', position: 'WR' }, // Traded 2024
            "D'Andre Swift": { team: 'Chicago Bears', abbr: 'CHI', position: 'RB' },
            'Cole Kmet': { team: 'Chicago Bears', abbr: 'CHI', position: 'TE' },

            // === LAS VEGAS RAIDERS ===
            'Davante Adams': { team: 'Las Vegas Raiders', abbr: 'LV', position: 'WR' },
            'Brock Bowers': { team: 'Las Vegas Raiders', abbr: 'LV', position: 'TE' }, // 2024 Draft
            'Jakobi Meyers': { team: 'Las Vegas Raiders', abbr: 'LV', position: 'WR' },
            'Zamir White': { team: 'Las Vegas Raiders', abbr: 'LV', position: 'RB' },

            // === WASHINGTON COMMANDERS ===
            'Jayden Daniels': { team: 'Washington Commanders', abbr: 'WSH', position: 'QB' }, // 2024 Draft #2
            'Terry McLaurin': { team: 'Washington Commanders', abbr: 'WSH', position: 'WR' },
            'Brian Robinson Jr.': { team: 'Washington Commanders', abbr: 'WSH', position: 'RB' },
            'Austin Ekeler': { team: 'Washington Commanders', abbr: 'WSH', position: 'RB' },

            // === LOS ANGELES CHARGERS ===
            'Justin Herbert': { team: 'Los Angeles Chargers', abbr: 'LAC', position: 'QB' },
            'Ladd McConkey': { team: 'Los Angeles Chargers', abbr: 'LAC', position: 'WR' }, // 2024 Draft
            'Quentin Johnston': { team: 'Los Angeles Chargers', abbr: 'LAC', position: 'WR' },
            'J.K. Dobbins': { team: 'Los Angeles Chargers', abbr: 'LAC', position: 'RB' },
            'Gus Edwards': { team: 'Los Angeles Chargers', abbr: 'LAC', position: 'RB' },

            // === PITTSBURGH STEELERS ===
            'Russell Wilson': { team: 'Pittsburgh Steelers', abbr: 'PIT', position: 'QB' }, // Signed 2024
            'George Pickens': { team: 'Pittsburgh Steelers', abbr: 'PIT', position: 'WR' },
            'Najee Harris': { team: 'Pittsburgh Steelers', abbr: 'PIT', position: 'RB' },
            'Pat Freiermuth': { team: 'Pittsburgh Steelers', abbr: 'PIT', position: 'TE' },
            'Calvin Austin III': { team: 'Pittsburgh Steelers', abbr: 'PIT', position: 'WR' },

            // === ATLANTA FALCONS ===
            'Kirk Cousins': { team: 'Atlanta Falcons', abbr: 'ATL', position: 'QB' }, // Signed 2024
            'Drake London': { team: 'Atlanta Falcons', abbr: 'ATL', position: 'WR' },
            'Bijan Robinson': { team: 'Atlanta Falcons', abbr: 'ATL', position: 'RB' },
            'Kyle Pitts': { team: 'Atlanta Falcons', abbr: 'ATL', position: 'TE' },
            'Darnell Mooney': { team: 'Atlanta Falcons', abbr: 'ATL', position: 'WR' },

            // === JACKSONVILLE JAGUARS ===
            'Trevor Lawrence': { team: 'Jacksonville Jaguars', abbr: 'JAX', position: 'QB' },
            'Travis Etienne Jr.': { team: 'Jacksonville Jaguars', abbr: 'JAX', position: 'RB' },
            'Brian Thomas Jr.': { team: 'Jacksonville Jaguars', abbr: 'JAX', position: 'WR' }, // 2024 Draft
            'Christian Kirk': { team: 'Jacksonville Jaguars', abbr: 'JAX', position: 'WR' },
            'Evan Engram': { team: 'Jacksonville Jaguars', abbr: 'JAX', position: 'TE' },

            // === SEATTLE SEAHAWKS ===
            'Geno Smith': { team: 'Seattle Seahawks', abbr: 'SEA', position: 'QB' },
            'DK Metcalf': { team: 'Seattle Seahawks', abbr: 'SEA', position: 'WR' },
            'Tyler Lockett': { team: 'Seattle Seahawks', abbr: 'SEA', position: 'WR' },
            'Jaxon Smith-Njigba': { team: 'Seattle Seahawks', abbr: 'SEA', position: 'WR' },
            'Kenneth Walker III': { team: 'Seattle Seahawks', abbr: 'SEA', position: 'RB' },

            // === LOS ANGELES RAMS ===
            'Matthew Stafford': { team: 'Los Angeles Rams', abbr: 'LAR', position: 'QB' },
            'Puka Nacua': { team: 'Los Angeles Rams', abbr: 'LAR', position: 'WR' },
            'Cooper Kupp': { team: 'Los Angeles Rams', abbr: 'LAR', position: 'WR' },
            'Kyren Williams': { team: 'Los Angeles Rams', abbr: 'LAR', position: 'RB' },
            'Blake Corum': { team: 'Los Angeles Rams', abbr: 'LAR', position: 'RB' },

            // === CLEVELAND BROWNS ===
            'Deshaun Watson': { team: 'Cleveland Browns', abbr: 'CLE', position: 'QB' },
            'Amari Cooper': { team: 'Cleveland Browns', abbr: 'CLE', position: 'WR' },
            'Jerry Jeudy': { team: 'Cleveland Browns', abbr: 'CLE', position: 'WR' }, // Traded 2024
            'Nick Chubb': { team: 'Cleveland Browns', abbr: 'CLE', position: 'RB' },
            'David Njoku': { team: 'Cleveland Browns', abbr: 'CLE', position: 'TE' },

            // === NEW YORK JETS ===
            'Aaron Rodgers': { team: 'New York Jets', abbr: 'NYJ', position: 'QB' },
            'Garrett Wilson': { team: 'New York Jets', abbr: 'NYJ', position: 'WR' },
            'Breece Hall': { team: 'New York Jets', abbr: 'NYJ', position: 'RB' },
            'Davante Adams': { team: 'New York Jets', abbr: 'NYJ', position: 'WR' }, // Traded 2024
            'Mike Williams': { team: 'New York Jets', abbr: 'NYJ', position: 'WR' },

            // === NEW YORK GIANTS ===
            'Daniel Jones': { team: 'New York Giants', abbr: 'NYG', position: 'QB' },
            'Malik Nabers': { team: 'New York Giants', abbr: 'NYG', position: 'WR' }, // 2024 Draft
            'Devin Singletary': { team: 'New York Giants', abbr: 'NYG', position: 'RB' },
            'Darius Slayton': { team: 'New York Giants', abbr: 'NYG', position: 'WR' },
            'Wan\'Dale Robinson': { team: 'New York Giants', abbr: 'NYG', position: 'WR' },

            // === ARIZONA CARDINALS ===
            'Kyler Murray': { team: 'Arizona Cardinals', abbr: 'ARI', position: 'QB' },
            'Marvin Harrison Jr.': { team: 'Arizona Cardinals', abbr: 'ARI', position: 'WR' }, // 2024 Draft
            'James Conner': { team: 'Arizona Cardinals', abbr: 'ARI', position: 'RB' },
            'Michael Wilson': { team: 'Arizona Cardinals', abbr: 'ARI', position: 'WR' },
            'Trey McBride': { team: 'Arizona Cardinals', abbr: 'ARI', position: 'TE' },

            // === CAROLINA PANTHERS ===
            'Bryce Young': { team: 'Carolina Panthers', abbr: 'CAR', position: 'QB' },
            'Adam Thielen': { team: 'Carolina Panthers', abbr: 'CAR', position: 'WR' },
            'Diontae Johnson': { team: 'Carolina Panthers', abbr: 'CAR', position: 'WR' },
            'Chuba Hubbard': { team: 'Carolina Panthers', abbr: 'CAR', position: 'RB' },

            // === NEW ENGLAND PATRIOTS ===
            'Drake Maye': { team: 'New England Patriots', abbr: 'NE', position: 'QB' }, // 2024 Draft
            'Rhamondre Stevenson': { team: 'New England Patriots', abbr: 'NE', position: 'RB' },
            'Kendrick Bourne': { team: 'New England Patriots', abbr: 'NE', position: 'WR' },
            'Hunter Henry': { team: 'New England Patriots', abbr: 'NE', position: 'TE' },

            // === NEW ORLEANS SAINTS ===
            'Derek Carr': { team: 'New Orleans Saints', abbr: 'NO', position: 'QB' },
            'Chris Olave': { team: 'New Orleans Saints', abbr: 'NO', position: 'WR' },
            'Alvin Kamara': { team: 'New Orleans Saints', abbr: 'NO', position: 'RB' },
            'Rashid Shaheed': { team: 'New Orleans Saints', abbr: 'NO', position: 'WR' },
            'Juwan Johnson': { team: 'New Orleans Saints', abbr: 'NO', position: 'TE' },

            // === TAMPA BAY BUCCANEERS ===
            'Baker Mayfield': { team: 'Tampa Bay Buccaneers', abbr: 'TB', position: 'QB' },
            'Mike Evans': { team: 'Tampa Bay Buccaneers', abbr: 'TB', position: 'WR' },
            'Chris Godwin': { team: 'Tampa Bay Buccaneers', abbr: 'TB', position: 'WR' },
            'Rachaad White': { team: 'Tampa Bay Buccaneers', abbr: 'TB', position: 'RB' },
            'Cade Otton': { team: 'Tampa Bay Buccaneers', abbr: 'TB', position: 'TE' },

            // === DENVER BRONCOS ===
            'Bo Nix': { team: 'Denver Broncos', abbr: 'DEN', position: 'QB' }, // 2024 Draft
            'Courtland Sutton': { team: 'Denver Broncos', abbr: 'DEN', position: 'WR' },
            'Javonte Williams': { team: 'Denver Broncos', abbr: 'DEN', position: 'RB' },
            'Jerry Jeudy': { team: 'Denver Broncos', abbr: 'DEN', position: 'WR' },
            'Adam Trautman': { team: 'Denver Broncos', abbr: 'DEN', position: 'TE' },

            // === INDIANAPOLIS COLTS ===
            'Anthony Richardson': { team: 'Indianapolis Colts', abbr: 'IND', position: 'QB' },
            'Jonathan Taylor': { team: 'Indianapolis Colts', abbr: 'IND', position: 'RB' },
            'Michael Pittman Jr.': { team: 'Indianapolis Colts', abbr: 'IND', position: 'WR' },
            'Adonai Mitchell': { team: 'Indianapolis Colts', abbr: 'IND', position: 'WR' }, // 2024 Draft
            'Josh Downs': { team: 'Indianapolis Colts', abbr: 'IND', position: 'WR' }
        };

        Object.entries(nflRosters).forEach(([player, info]) => {
            this.playerTeams.set(player, { ...info, sport: 'nfl', status: 'active' });
        });
    }

    // =====================================================
    // NHL Fallback Data
    // =====================================================
    setNHLFallbackData() {
        const nhlRosters = {
            // === EDMONTON OILERS ===
            'Connor McDavid': { team: 'Edmonton Oilers', abbr: 'EDM', position: 'C' },
            'Leon Draisaitl': { team: 'Edmonton Oilers', abbr: 'EDM', position: 'C' },
            'Zach Hyman': { team: 'Edmonton Oilers', abbr: 'EDM', position: 'LW' },
            'Ryan Nugent-Hopkins': { team: 'Edmonton Oilers', abbr: 'EDM', position: 'C' },
            'Evan Bouchard': { team: 'Edmonton Oilers', abbr: 'EDM', position: 'D' },
            'Darnell Nurse': { team: 'Edmonton Oilers', abbr: 'EDM', position: 'D' },
            'Stuart Skinner': { team: 'Edmonton Oilers', abbr: 'EDM', position: 'G' },

            // === FLORIDA PANTHERS ===
            'Aleksander Barkov': { team: 'Florida Panthers', abbr: 'FLA', position: 'C' },
            'Matthew Tkachuk': { team: 'Florida Panthers', abbr: 'FLA', position: 'LW' },
            'Sam Reinhart': { team: 'Florida Panthers', abbr: 'FLA', position: 'C' },
            'Carter Verhaeghe': { team: 'Florida Panthers', abbr: 'FLA', position: 'LW' },
            'Gustav Forsling': { team: 'Florida Panthers', abbr: 'FLA', position: 'D' },
            'Aaron Ekblad': { team: 'Florida Panthers', abbr: 'FLA', position: 'D' },
            'Sergei Bobrovsky': { team: 'Florida Panthers', abbr: 'FLA', position: 'G' },

            // === BOSTON BRUINS ===
            'David Pastrnak': { team: 'Boston Bruins', abbr: 'BOS', position: 'RW' },
            'Brad Marchand': { team: 'Boston Bruins', abbr: 'BOS', position: 'LW' },
            'Charlie McAvoy': { team: 'Boston Bruins', abbr: 'BOS', position: 'D' },
            'Elias Lindholm': { team: 'Boston Bruins', abbr: 'BOS', position: 'C' },
            'Hampus Lindholm': { team: 'Boston Bruins', abbr: 'BOS', position: 'D' },
            'Jeremy Swayman': { team: 'Boston Bruins', abbr: 'BOS', position: 'G' },

            // === NEW YORK RANGERS ===
            'Artemi Panarin': { team: 'New York Rangers', abbr: 'NYR', position: 'LW' },
            'Mika Zibanejad': { team: 'New York Rangers', abbr: 'NYR', position: 'C' },
            'Adam Fox': { team: 'New York Rangers', abbr: 'NYR', position: 'D' },
            'Chris Kreider': { team: 'New York Rangers', abbr: 'NYR', position: 'LW' },
            'Vincent Trocheck': { team: 'New York Rangers', abbr: 'NYR', position: 'C' },
            'Igor Shesterkin': { team: 'New York Rangers', abbr: 'NYR', position: 'G' },

            // === COLORADO AVALANCHE ===
            'Nathan MacKinnon': { team: 'Colorado Avalanche', abbr: 'COL', position: 'C' },
            'Cale Makar': { team: 'Colorado Avalanche', abbr: 'COL', position: 'D' },
            'Mikko Rantanen': { team: 'Colorado Avalanche', abbr: 'COL', position: 'RW' },
            'Gabriel Landeskog': { team: 'Colorado Avalanche', abbr: 'COL', position: 'LW' },
            'Devon Toews': { team: 'Colorado Avalanche', abbr: 'COL', position: 'D' },
            'Alexandar Georgiev': { team: 'Colorado Avalanche', abbr: 'COL', position: 'G' },

            // === TORONTO MAPLE LEAFS ===
            'Auston Matthews': { team: 'Toronto Maple Leafs', abbr: 'TOR', position: 'C' },
            'Mitch Marner': { team: 'Toronto Maple Leafs', abbr: 'TOR', position: 'RW' },
            'William Nylander': { team: 'Toronto Maple Leafs', abbr: 'TOR', position: 'RW' },
            'John Tavares': { team: 'Toronto Maple Leafs', abbr: 'TOR', position: 'C' },
            'Morgan Rielly': { team: 'Toronto Maple Leafs', abbr: 'TOR', position: 'D' },

            // === DALLAS STARS ===
            'Jason Robertson': { team: 'Dallas Stars', abbr: 'DAL', position: 'LW' },
            'Roope Hintz': { team: 'Dallas Stars', abbr: 'DAL', position: 'C' },
            'Tyler Seguin': { team: 'Dallas Stars', abbr: 'DAL', position: 'C' },
            'Miro Heiskanen': { team: 'Dallas Stars', abbr: 'DAL', position: 'D' },
            'Jake Oettinger': { team: 'Dallas Stars', abbr: 'DAL', position: 'G' },

            // === VANCOUVER CANUCKS ===
            'Elias Pettersson': { team: 'Vancouver Canucks', abbr: 'VAN', position: 'C' },
            'J.T. Miller': { team: 'Vancouver Canucks', abbr: 'VAN', position: 'C' },
            'Brock Boeser': { team: 'Vancouver Canucks', abbr: 'VAN', position: 'RW' },
            'Quinn Hughes': { team: 'Vancouver Canucks', abbr: 'VAN', position: 'D' },
            'Thatcher Demko': { team: 'Vancouver Canucks', abbr: 'VAN', position: 'G' },

            // === VEGAS GOLDEN KNIGHTS ===
            'Jack Eichel': { team: 'Vegas Golden Knights', abbr: 'VGK', position: 'C' },
            'Mark Stone': { team: 'Vegas Golden Knights', abbr: 'VGK', position: 'RW' },
            'Ivan Barbashev': { team: 'Vegas Golden Knights', abbr: 'VGK', position: 'C' },
            'Shea Theodore': { team: 'Vegas Golden Knights', abbr: 'VGK', position: 'D' },
            'Adin Hill': { team: 'Vegas Golden Knights', abbr: 'VGK', position: 'G' },

            // === CAROLINA HURRICANES ===
            'Sebastian Aho': { team: 'Carolina Hurricanes', abbr: 'CAR', position: 'C' },
            'Andrei Svechnikov': { team: 'Carolina Hurricanes', abbr: 'CAR', position: 'RW' },
            'Seth Jarvis': { team: 'Carolina Hurricanes', abbr: 'CAR', position: 'C' },
            'Jaccob Slavin': { team: 'Carolina Hurricanes', abbr: 'CAR', position: 'D' },
            'Frederik Andersen': { team: 'Carolina Hurricanes', abbr: 'CAR', position: 'G' },

            // === WINNIPEG JETS ===
            'Kyle Connor': { team: 'Winnipeg Jets', abbr: 'WPG', position: 'LW' },
            'Mark Scheifele': { team: 'Winnipeg Jets', abbr: 'WPG', position: 'C' },
            'Gabriel Vilardi': { team: 'Winnipeg Jets', abbr: 'WPG', position: 'C' },
            'Josh Morrissey': { team: 'Winnipeg Jets', abbr: 'WPG', position: 'D' },
            'Connor Hellebuyck': { team: 'Winnipeg Jets', abbr: 'WPG', position: 'G' },

            // === NEW JERSEY DEVILS ===
            'Jack Hughes': { team: 'New Jersey Devils', abbr: 'NJD', position: 'C' },
            'Jesper Bratt': { team: 'New Jersey Devils', abbr: 'NJD', position: 'RW' },
            'Nico Hischier': { team: 'New Jersey Devils', abbr: 'NJD', position: 'C' },
            'Dougie Hamilton': { team: 'New Jersey Devils', abbr: 'NJD', position: 'D' }
        };

        Object.entries(nhlRosters).forEach(([player, info]) => {
            this.playerTeams.set(player, { ...info, sport: 'nhl', status: 'active' });
        });
    }

    // =====================================================
    // MLB Fallback Data
    // =====================================================
    setMLBFallbackData() {
        const mlbRosters = {
            // === LOS ANGELES DODGERS ===
            'Shohei Ohtani': { team: 'Los Angeles Dodgers', abbr: 'LAD', position: 'DH' },
            'Mookie Betts': { team: 'Los Angeles Dodgers', abbr: 'LAD', position: 'SS' },
            'Freddie Freeman': { team: 'Los Angeles Dodgers', abbr: 'LAD', position: '1B' },
            'Teoscar Hernandez': { team: 'Los Angeles Dodgers', abbr: 'LAD', position: 'OF' },
            'Will Smith': { team: 'Los Angeles Dodgers', abbr: 'LAD', position: 'C' },
            'Max Muncy': { team: 'Los Angeles Dodgers', abbr: 'LAD', position: '3B' },

            // === NEW YORK YANKEES ===
            'Aaron Judge': { team: 'New York Yankees', abbr: 'NYY', position: 'OF' },
            'Juan Soto': { team: 'New York Yankees', abbr: 'NYY', position: 'OF' },
            'Giancarlo Stanton': { team: 'New York Yankees', abbr: 'NYY', position: 'DH' },
            'Anthony Volpe': { team: 'New York Yankees', abbr: 'NYY', position: 'SS' },
            'Jazz Chisholm Jr.': { team: 'New York Yankees', abbr: 'NYY', position: '3B' },
            'Austin Wells': { team: 'New York Yankees', abbr: 'NYY', position: 'C' },

            // === ATLANTA BRAVES ===
            'Ronald Acuna Jr.': { team: 'Atlanta Braves', abbr: 'ATL', position: 'OF' },
            'Ozzie Albies': { team: 'Atlanta Braves', abbr: 'ATL', position: '2B' },
            'Matt Olson': { team: 'Atlanta Braves', abbr: 'ATL', position: '1B' },
            'Austin Riley': { team: 'Atlanta Braves', abbr: 'ATL', position: '3B' },
            'Marcell Ozuna': { team: 'Atlanta Braves', abbr: 'ATL', position: 'DH' },
            'Michael Harris II': { team: 'Atlanta Braves', abbr: 'ATL', position: 'OF' },

            // === HOUSTON ASTROS ===
            'Jose Altuve': { team: 'Houston Astros', abbr: 'HOU', position: '2B' },
            'Yordan Alvarez': { team: 'Houston Astros', abbr: 'HOU', position: 'DH' },
            'Kyle Tucker': { team: 'Houston Astros', abbr: 'HOU', position: 'OF' },
            'Alex Bregman': { team: 'Houston Astros', abbr: 'HOU', position: '3B' },
            'Framber Valdez': { team: 'Houston Astros', abbr: 'HOU', position: 'P' },

            // === PHILADELPHIA PHILLIES ===
            'Bryce Harper': { team: 'Philadelphia Phillies', abbr: 'PHI', position: '1B' },
            'Trea Turner': { team: 'Philadelphia Phillies', abbr: 'PHI', position: 'SS' },
            'Kyle Schwarber': { team: 'Philadelphia Phillies', abbr: 'PHI', position: 'OF' },
            'J.T. Realmuto': { team: 'Philadelphia Phillies', abbr: 'PHI', position: 'C' },
            'Nick Castellanos': { team: 'Philadelphia Phillies', abbr: 'PHI', position: 'OF' },
            'Zack Wheeler': { team: 'Philadelphia Phillies', abbr: 'PHI', position: 'P' },

            // === SAN DIEGO PADRES ===
            'Fernando Tatis Jr.': { team: 'San Diego Padres', abbr: 'SD', position: 'OF' },
            'Manny Machado': { team: 'San Diego Padres', abbr: 'SD', position: '3B' },
            'Xander Bogaerts': { team: 'San Diego Padres', abbr: 'SD', position: 'SS' },
            'Jackson Merrill': { team: 'San Diego Padres', abbr: 'SD', position: 'OF' },
            'Yu Darvish': { team: 'San Diego Padres', abbr: 'SD', position: 'P' },

            // === TEXAS RANGERS ===
            'Corey Seager': { team: 'Texas Rangers', abbr: 'TEX', position: 'SS' },
            'Marcus Semien': { team: 'Texas Rangers', abbr: 'TEX', position: '2B' },
            'Adolis Garcia': { team: 'Texas Rangers', abbr: 'TEX', position: 'OF' },
            'Wyatt Langford': { team: 'Texas Rangers', abbr: 'TEX', position: 'OF' },
            'Nathan Eovaldi': { team: 'Texas Rangers', abbr: 'TEX', position: 'P' },

            // === BALTIMORE ORIOLES ===
            'Gunnar Henderson': { team: 'Baltimore Orioles', abbr: 'BAL', position: 'SS' },
            'Adley Rutschman': { team: 'Baltimore Orioles', abbr: 'BAL', position: 'C' },
            'Anthony Santander': { team: 'Baltimore Orioles', abbr: 'BAL', position: 'OF' },
            'Ryan Mountcastle': { team: 'Baltimore Orioles', abbr: 'BAL', position: '1B' },
            'Corbin Burnes': { team: 'Baltimore Orioles', abbr: 'BAL', position: 'P' },

            // === CLEVELAND GUARDIANS ===
            'Jose Ramirez': { team: 'Cleveland Guardians', abbr: 'CLE', position: '3B' },
            'Steven Kwan': { team: 'Cleveland Guardians', abbr: 'CLE', position: 'OF' },
            'Josh Naylor': { team: 'Cleveland Guardians', abbr: 'CLE', position: '1B' },
            'Emmanuel Clase': { team: 'Cleveland Guardians', abbr: 'CLE', position: 'P' },

            // === SEATTLE MARINERS ===
            'Julio Rodriguez': { team: 'Seattle Mariners', abbr: 'SEA', position: 'OF' },
            'Cal Raleigh': { team: 'Seattle Mariners', abbr: 'SEA', position: 'C' },
            'JP Crawford': { team: 'Seattle Mariners', abbr: 'SEA', position: 'SS' },
            'Logan Gilbert': { team: 'Seattle Mariners', abbr: 'SEA', position: 'P' },

            // === CHICAGO CUBS ===
            'Cody Bellinger': { team: 'Chicago Cubs', abbr: 'CHC', position: 'OF' },
            'Dansby Swanson': { team: 'Chicago Cubs', abbr: 'CHC', position: 'SS' },
            'Seiya Suzuki': { team: 'Chicago Cubs', abbr: 'CHC', position: 'OF' },
            'Nico Hoerner': { team: 'Chicago Cubs', abbr: 'CHC', position: '2B' },

            // === NEW YORK METS ===
            'Francisco Lindor': { team: 'New York Mets', abbr: 'NYM', position: 'SS' },
            'Pete Alonso': { team: 'New York Mets', abbr: 'NYM', position: '1B' },
            'Brandon Nimmo': { team: 'New York Mets', abbr: 'NYM', position: 'OF' },
            'Francisco Alvarez': { team: 'New York Mets', abbr: 'NYM', position: 'C' }
        };

        Object.entries(mlbRosters).forEach(([player, info]) => {
            this.playerTeams.set(player, { ...info, sport: 'mlb', status: 'active' });
        });
    }

    // =====================================================
    // Public API Methods
    // =====================================================

    // Get player's current team
    getPlayerTeam(playerName) {
        return this.playerTeams.get(playerName) || null;
    }

    // Check if player is available (not injured/out)
    isPlayerAvailable(playerName) {
        return !this.injuredPlayers.has(playerName);
    }

    // Get list of injured players
    getInjuredPlayers() {
        return Array.from(this.injuredPlayers);
    }

    // Get roster source
    getRosterSource() {
        return this.rosterSource;
    }

    // Filter props to only include available players on correct teams
    filterAvailablePlayers(props) {
        return props.filter(prop => {
            const playerName = prop.player;

            // Check if player is injured
            if (this.injuredPlayers.has(playerName)) {
                console.log(`⛔ Filtering out ${playerName} - injured/out`);
                return false;
            }

            // Verify team is correct
            const rosterInfo = this.playerTeams.get(playerName);
            if (rosterInfo && prop.team !== rosterInfo.abbr) {
                console.log(`⚠️ Updating ${playerName} team from ${prop.team} to ${rosterInfo.abbr}`);
                prop.team = rosterInfo.abbr;
                prop.teamFull = rosterInfo.team;
            }

            return true;
        });
    }

    // Update a prop with correct roster info
    updatePropWithRosterInfo(prop) {
        const rosterInfo = this.playerTeams.get(prop.player);
        if (rosterInfo) {
            return {
                ...prop,
                team: rosterInfo.abbr,
                teamFull: rosterInfo.team,
                position: rosterInfo.position || prop.position,
                isAvailable: !this.injuredPlayers.has(prop.player)
            };
        }
        return prop;
    }

    // Force refresh rosters
    async refresh() {
        this.injuredPlayers.clear();
        this.playerTeams.clear();
        await this.initialize();
        return this.lastUpdate;
    }

    // Get last update time
    getLastUpdate() {
        return this.lastUpdate;
    }
}

// Initialize and export
window.RosterService = new RosterService();

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    await window.RosterService.initialize();
});
