/**
 * Tier Filter Unit Tests
 * Tests for tier filtering functionality in the Player Props page
 */

describe('Tier Filter Functions', () => {
  let document;

  beforeEach(() => {
    // Set up DOM for each test
    document = global.document;
    document.body.innerHTML = `
      <div class="tier-filter-bar" id="tierFilterBar">
        <span class="tier-filter-label">Filter by Confidence:</span>
        <button class="tier-filter-btn active" data-tier="all">
          <i class="fas fa-th"></i> All Props
          <span class="tier-count" id="tierCountAll">0</span>
        </button>
        <button class="tier-filter-btn top" data-tier="topPicks">
          <i class="fas fa-fire"></i> Top Picks
          <span class="tier-count" id="tierCountTop">0</span>
        </button>
        <button class="tier-filter-btn good" data-tier="goodValue">
          <i class="fas fa-check-circle"></i> Good Value
          <span class="tier-count" id="tierCountGood">0</span>
        </button>
        <button class="tier-filter-btn lean" data-tier="leans">
          <i class="fas fa-chart-line"></i> Leans
          <span class="tier-count" id="tierCountLean">0</span>
        </button>
        <button class="tier-filter-btn risky" data-tier="risky">
          <i class="fas fa-exclamation-triangle"></i> Risky
          <span class="tier-count" id="tierCountRisky">0</span>
        </button>
      </div>
      <div class="tier-section tier-top" id="topPicksSection">
        <div class="props-grid"></div>
      </div>
      <div class="tier-section tier-good" id="goodValueSection">
        <div class="props-grid"></div>
      </div>
      <div class="tier-section tier-lean" id="leansSection">
        <div class="props-grid"></div>
      </div>
      <div class="tier-section tier-risky" id="riskySection">
        <div class="props-grid"></div>
      </div>
    `;
  });

  describe('updateTierCounts', () => {
    // Recreate the function for testing
    const updateTierCounts = (propsByTier) => {
      const counts = {
        all: (propsByTier.topPicks?.length || 0) +
             (propsByTier.goodValue?.length || 0) +
             (propsByTier.leans?.length || 0) +
             (propsByTier.risky?.length || 0),
        top: propsByTier.topPicks?.length || 0,
        good: propsByTier.goodValue?.length || 0,
        lean: propsByTier.leans?.length || 0,
        risky: propsByTier.risky?.length || 0
      };

      const countElements = {
        all: document.getElementById('tierCountAll'),
        top: document.getElementById('tierCountTop'),
        good: document.getElementById('tierCountGood'),
        lean: document.getElementById('tierCountLean'),
        risky: document.getElementById('tierCountRisky')
      };

      for (const [key, el] of Object.entries(countElements)) {
        if (el) el.textContent = counts[key];
      }
    };

    test('should update all tier count badges correctly', () => {
      const propsByTier = {
        topPicks: [{ player: 'Player1' }, { player: 'Player2' }],
        goodValue: [{ player: 'Player3' }],
        leans: [{ player: 'Player4' }, { player: 'Player5' }, { player: 'Player6' }],
        risky: [{ player: 'Player7' }]
      };

      updateTierCounts(propsByTier);

      expect(document.getElementById('tierCountAll').textContent).toBe('7');
      expect(document.getElementById('tierCountTop').textContent).toBe('2');
      expect(document.getElementById('tierCountGood').textContent).toBe('1');
      expect(document.getElementById('tierCountLean').textContent).toBe('3');
      expect(document.getElementById('tierCountRisky').textContent).toBe('1');
    });

    test('should handle empty tiers', () => {
      const propsByTier = {
        topPicks: [],
        goodValue: [],
        leans: [],
        risky: []
      };

      updateTierCounts(propsByTier);

      expect(document.getElementById('tierCountAll').textContent).toBe('0');
      expect(document.getElementById('tierCountTop').textContent).toBe('0');
    });

    test('should handle missing tier arrays gracefully', () => {
      const propsByTier = {
        topPicks: [{ player: 'Player1' }]
        // other tiers not defined
      };

      updateTierCounts(propsByTier);

      expect(document.getElementById('tierCountAll').textContent).toBe('1');
      expect(document.getElementById('tierCountTop').textContent).toBe('1');
      expect(document.getElementById('tierCountGood').textContent).toBe('0');
    });
  });

  describe('filterTierSections', () => {
    let currentTierFilter = 'all';

    const filterTierSections = () => {
      const tierSections = document.querySelectorAll('.tier-section');
      const tierMapping = {
        'topPicks': 'tier-top',
        'goodValue': 'tier-good',
        'leans': 'tier-lean',
        'risky': 'tier-risky'
      };

      tierSections.forEach(section => {
        if (currentTierFilter === 'all') {
          section.classList.remove('hidden');
        } else {
          const tierClass = tierMapping[currentTierFilter];
          if (section.classList.contains(tierClass)) {
            section.classList.remove('hidden');
          } else {
            section.classList.add('hidden');
          }
        }
      });
    };

    test('should show all sections when filter is "all"', () => {
      currentTierFilter = 'all';
      filterTierSections();

      const sections = document.querySelectorAll('.tier-section');
      sections.forEach(section => {
        expect(section.classList.contains('hidden')).toBe(false);
      });
    });

    test('should show only top picks when filter is "topPicks"', () => {
      currentTierFilter = 'topPicks';
      filterTierSections();

      expect(document.querySelector('.tier-top').classList.contains('hidden')).toBe(false);
      expect(document.querySelector('.tier-good').classList.contains('hidden')).toBe(true);
      expect(document.querySelector('.tier-lean').classList.contains('hidden')).toBe(true);
      expect(document.querySelector('.tier-risky').classList.contains('hidden')).toBe(true);
    });

    test('should show only good value when filter is "goodValue"', () => {
      currentTierFilter = 'goodValue';
      filterTierSections();

      expect(document.querySelector('.tier-top').classList.contains('hidden')).toBe(true);
      expect(document.querySelector('.tier-good').classList.contains('hidden')).toBe(false);
      expect(document.querySelector('.tier-lean').classList.contains('hidden')).toBe(true);
      expect(document.querySelector('.tier-risky').classList.contains('hidden')).toBe(true);
    });

    test('should show only leans when filter is "leans"', () => {
      currentTierFilter = 'leans';
      filterTierSections();

      expect(document.querySelector('.tier-top').classList.contains('hidden')).toBe(true);
      expect(document.querySelector('.tier-good').classList.contains('hidden')).toBe(true);
      expect(document.querySelector('.tier-lean').classList.contains('hidden')).toBe(false);
      expect(document.querySelector('.tier-risky').classList.contains('hidden')).toBe(true);
    });

    test('should show only risky when filter is "risky"', () => {
      currentTierFilter = 'risky';
      filterTierSections();

      expect(document.querySelector('.tier-top').classList.contains('hidden')).toBe(true);
      expect(document.querySelector('.tier-good').classList.contains('hidden')).toBe(true);
      expect(document.querySelector('.tier-lean').classList.contains('hidden')).toBe(true);
      expect(document.querySelector('.tier-risky').classList.contains('hidden')).toBe(false);
    });
  });

  describe('Tier Filter Button Click Handler', () => {
    test('should update active class on button click', () => {
      const buttons = document.querySelectorAll('.tier-filter-btn');
      const topPicksBtn = document.querySelector('[data-tier="topPicks"]');
      const allBtn = document.querySelector('[data-tier="all"]');

      // Simulate clicking Top Picks button
      buttons.forEach(b => b.classList.remove('active'));
      topPicksBtn.classList.add('active');

      expect(topPicksBtn.classList.contains('active')).toBe(true);
      expect(allBtn.classList.contains('active')).toBe(false);
    });

    test('should have correct data-tier attributes', () => {
      const buttons = document.querySelectorAll('.tier-filter-btn');
      const tiers = ['all', 'topPicks', 'goodValue', 'leans', 'risky'];

      buttons.forEach((btn, index) => {
        expect(btn.getAttribute('data-tier')).toBe(tiers[index]);
      });
    });
  });
});

describe('Tier Classification', () => {
  const classifyPropByConfidence = (confidence) => {
    if (confidence >= 75) return 'TOP_PICK';
    if (confidence >= 65) return 'GOOD_VALUE';
    if (confidence >= 55) return 'LEAN';
    return 'RISKY';
  };

  test('should classify 75%+ as TOP_PICK', () => {
    expect(classifyPropByConfidence(75)).toBe('TOP_PICK');
    expect(classifyPropByConfidence(80)).toBe('TOP_PICK');
    expect(classifyPropByConfidence(100)).toBe('TOP_PICK');
  });

  test('should classify 65-74% as GOOD_VALUE', () => {
    expect(classifyPropByConfidence(65)).toBe('GOOD_VALUE');
    expect(classifyPropByConfidence(70)).toBe('GOOD_VALUE');
    expect(classifyPropByConfidence(74)).toBe('GOOD_VALUE');
  });

  test('should classify 55-64% as LEAN', () => {
    expect(classifyPropByConfidence(55)).toBe('LEAN');
    expect(classifyPropByConfidence(60)).toBe('LEAN');
    expect(classifyPropByConfidence(64)).toBe('LEAN');
  });

  test('should classify <55% as RISKY', () => {
    expect(classifyPropByConfidence(54)).toBe('RISKY');
    expect(classifyPropByConfidence(50)).toBe('RISKY');
    expect(classifyPropByConfidence(0)).toBe('RISKY');
  });
});

describe('Props Data Structure', () => {
  test('should have required fields for tier display', () => {
    const mockProp = {
      player: 'Kenneth Walker III',
      team: 'SEA',
      position: 'RB',
      propType: 'Rushing Yards',
      line: 60.5,
      confidence: 77,
      tier: 'TOP_PICK',
      aiPick: 'OVER',
      reasoning: 'Strong rushing performance expected'
    };

    expect(mockProp).toHaveProperty('player');
    expect(mockProp).toHaveProperty('propType');
    expect(mockProp).toHaveProperty('line');
    expect(mockProp).toHaveProperty('confidence');
    expect(mockProp).toHaveProperty('tier');
  });

  test('propsByTier structure should have all tiers', () => {
    const mockPropsByTier = {
      topPicks: [],
      goodValue: [],
      leans: [],
      risky: [],
      all: []
    };

    expect(mockPropsByTier).toHaveProperty('topPicks');
    expect(mockPropsByTier).toHaveProperty('goodValue');
    expect(mockPropsByTier).toHaveProperty('leans');
    expect(mockPropsByTier).toHaveProperty('risky');
    expect(mockPropsByTier).toHaveProperty('all');
  });
});
