/**
 * NFL Props Automated Tests
 *
 * Run these tests when NFL season starts (September 2026)
 * Command: npm test -- --testPathPattern=nflProps
 *
 * Or run the standalone script:
 * node tests/nflProps.test.js --standalone
 */

const BASE_URL = process.env.API_URL || 'https://betgenius-ai.onrender.com';

// Standalone mode for running outside Jest
const isStandalone = process.argv.includes('--standalone');

// Expected NFL prop types
const NFL_PROP_TYPES = [
    'Passing Yards',
    'Passing TDs',
    'Rushing Yards',
    'Rushing TDs',
    'Receiving Yards',
    'Receiving TDs',
    'Receptions',
    'Completions',
    'Interceptions Thrown',
    'Carries'
];

// Expected response structure
const EXPECTED_PROP_FIELDS = [
    'player',
    'team',
    'propType',
    'line',
    'aiPick',
    'confidence'
];

// Optional but expected when games are scheduled
const MATCHUP_FIELDS = ['opponent', 'matchup', 'gameTime'];

// Export for potential use in other tests
void MATCHUP_FIELDS;

/**
 * Fetch NFL props from API
 */
async function fetchNFLProps() {
    const response = await fetch(`${BASE_URL}/api/props/nfl`);
    if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Fetch NFL schedule to check if games are available
 */
async function fetchNFLSchedule() {
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    if (!response.ok) {
        throw new Error(`ESPN API returned ${response.status}`);
    }
    return response.json();
}

/**
 * Validate prop structure
 */
function validatePropStructure(prop) {
    const errors = [];

    for (const field of EXPECTED_PROP_FIELDS) {
        if (prop[field] === undefined) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    if (prop.confidence !== undefined) {
        if (typeof prop.confidence !== 'number' || prop.confidence < 0 || prop.confidence > 100) {
            errors.push(`Invalid confidence value: ${prop.confidence}`);
        }
    }

    if (prop.line !== undefined && typeof prop.line !== 'number') {
        errors.push(`Invalid line value: ${prop.line}`);
    }

    if (prop.aiPick && !['OVER', 'UNDER'].includes(prop.aiPick)) {
        errors.push(`Invalid aiPick value: ${prop.aiPick}`);
    }

    return errors;
}

/**
 * Check if NFL is in season
 */
function isNFLSeason() {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed
    // NFL season: September (8) through February (1)
    return month >= 8 || month <= 1;
}

// ============================================
// JEST TESTS
// ============================================

if (!isStandalone) {
    describe('NFL Props API', () => {
        let propsData;
        let scheduleData;
        let hasGamesToday;

        beforeAll(async () => {
            try {
                [propsData, scheduleData] = await Promise.all([
                    fetchNFLProps(),
                    fetchNFLSchedule()
                ]);
                hasGamesToday = scheduleData?.events?.length > 0;
            } catch (error) {
                console.error('Setup failed:', error.message);
            }
        });

        describe('API Response Structure', () => {
            test('should return valid JSON response', () => {
                expect(propsData).toBeDefined();
                expect(typeof propsData).toBe('object');
            });

            test('should have source field', () => {
                expect(propsData.source).toBeDefined();
                expect(typeof propsData.source).toBe('string');
            });

            test('should have props array', () => {
                expect(propsData.props).toBeDefined();
                expect(Array.isArray(propsData.props)).toBe(true);
            });

            test('should have propsCount matching array length', () => {
                expect(propsData.propsCount).toBe(propsData.props.length);
            });
        });

        describe('Season Detection', () => {
            test('should return off-season message when no games', () => {
                if (!hasGamesToday && !isNFLSeason()) {
                    expect(propsData.source).toBe('nfl_offseason');
                    expect(propsData.note).toContain('Offseason');
                }
            });

            test('should return props when games are scheduled', () => {
                if (hasGamesToday) {
                    expect(propsData.props.length).toBeGreaterThan(0);
                    expect(propsData.source).not.toBe('nfl_offseason');
                }
            });
        });

        describe('Prop Data Validation (when in season)', () => {
            test('props should have valid structure', () => {
                if (propsData.props.length > 0) {
                    const sampleProps = propsData.props.slice(0, 10);
                    for (const prop of sampleProps) {
                        const errors = validatePropStructure(prop);
                        expect(errors).toEqual([]);
                    }
                }
            });

            test('should have valid NFL prop types', () => {
                if (propsData.props.length > 0) {
                    const propTypes = [...new Set(propsData.props.map(p => p.propType))];
                    for (const propType of propTypes) {
                        expect(NFL_PROP_TYPES).toContain(propType);
                    }
                }
            });

            test('should have valid team abbreviations', () => {
                if (propsData.props.length > 0) {
                    const validTeams = [
                        'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
                        'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
                        'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
                        'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'
                    ];
                    const teams = [...new Set(propsData.props.map(p => p.team))];
                    for (const team of teams) {
                        expect(validTeams).toContain(team);
                    }
                }
            });

            test('should have matchup data for players with games', () => {
                if (propsData.props.length > 0 && hasGamesToday) {
                    const propsWithMatchups = propsData.props.filter(p => p.opponent);
                    expect(propsWithMatchups.length).toBeGreaterThan(0);
                }
            });
        });

        describe('Weather Integration (outdoor games)', () => {
            test('props should include weather factor when applicable', () => {
                if (propsData.props.length > 0) {
                    const propsWithWeather = propsData.props.filter(p =>
                        p.factors?.some(f => f.factor === 'Weather')
                    );
                    // Weather integration is optional, just log
                    console.log(`Props with weather data: ${propsWithWeather.length}`);
                }
            });
        });

        describe('Data Sources', () => {
            test('should use expected data sources', () => {
                const validSources = [
                    'prizepicks',
                    'draftkings_live',
                    'nfl_live',
                    'nfl_official_stats',
                    'espn_stats',
                    'generated_from_espn_roster',
                    'nfl_offseason',
                    'none'
                ];
                expect(validSources).toContain(propsData.source);
            });
        });
    });
}

// ============================================
// STANDALONE SCRIPT
// ============================================

async function runStandaloneTests() {
    console.log('\n🏈 NFL Props Automated Test Suite');
    console.log('='.repeat(50));
    console.log(`Testing: ${BASE_URL}/api/props/nfl\n`);

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    const test = (name, fn) => {
        try {
            const result = fn();
            if (result === 'skip') {
                console.log(`⏭️  SKIP: ${name}`);
                skipped++;
            } else if (result) {
                console.log(`✅ PASS: ${name}`);
                passed++;
            } else {
                console.log(`❌ FAIL: ${name}`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ FAIL: ${name} - ${error.message}`);
            failed++;
        }
    };

    try {
        console.log('📡 Fetching NFL data...\n');
        const [propsData, scheduleData] = await Promise.all([
            fetchNFLProps(),
            fetchNFLSchedule()
        ]);
        const hasGamesToday = scheduleData?.events?.length > 0;

        console.log(`📊 Response received:`);
        console.log(`   Source: ${propsData.source}`);
        console.log(`   Props Count: ${propsData.propsCount || 0}`);
        console.log(`   Games Today: ${hasGamesToday ? 'Yes' : 'No'}`);
        console.log(`   NFL In Season: ${isNFLSeason() ? 'Yes' : 'No'}\n`);

        // Run tests
        test('API returns valid response', () => propsData && typeof propsData === 'object');
        test('Response has source field', () => typeof propsData.source === 'string');
        test('Response has props array', () => Array.isArray(propsData.props));
        test('Props count matches array', () => propsData.propsCount === propsData.props.length);

        if (!hasGamesToday && !isNFLSeason()) {
            test('Off-season detection works', () => propsData.source === 'nfl_offseason');
            console.log('\n📝 Note: NFL is in off-season. Full prop tests skipped.');
        } else if (propsData.props.length > 0) {
            test('Props have valid structure', () => {
                const errors = validatePropStructure(propsData.props[0]);
                return errors.length === 0;
            });

            test('Props have valid NFL types', () => {
                const types = [...new Set(propsData.props.map(p => p.propType))];
                return types.every(t => NFL_PROP_TYPES.includes(t));
            });

            test('Props have confidence scores', () => {
                return propsData.props.every(p =>
                    typeof p.confidence === 'number' &&
                    p.confidence >= 0 &&
                    p.confidence <= 100
                );
            });

            test('Props have AI picks', () => {
                return propsData.props.every(p =>
                    ['OVER', 'UNDER'].includes(p.aiPick)
                );
            });

            if (hasGamesToday) {
                test('Some props have matchup data', () => {
                    return propsData.props.some(p => p.opponent && p.matchup);
                });
            }

            // Sample prop output
            console.log('\n📋 Sample Props:');
            propsData.props.slice(0, 3).forEach((prop, i) => {
                console.log(`   ${i + 1}. ${prop.player} (${prop.team}) - ${prop.propType}: ${prop.line}`);
                console.log(`      AI Pick: ${prop.aiPick} (${prop.confidence}% confidence)`);
                if (prop.matchup) console.log(`      Matchup: ${prop.matchup}`);
            });
        } else {
            console.log('\n📝 Note: No props available. This may indicate:');
            console.log('   - No games scheduled today');
            console.log('   - Data sources unavailable');
            console.log('   - Off-season period');
        }

    } catch (error) {
        console.log(`\n❌ Critical Error: ${error.message}`);
        failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log('='.repeat(50));

    process.exit(failed > 0 ? 1 : 0);
}

if (isStandalone) {
    runStandaloneTests();
}

module.exports = {
    fetchNFLProps,
    fetchNFLSchedule,
    validatePropStructure,
    isNFLSeason,
    NFL_PROP_TYPES,
    EXPECTED_PROP_FIELDS
};
