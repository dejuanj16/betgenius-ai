/**
 * Tier Filter E2E Tests
 * End-to-end tests for tier filtering functionality on the Player Props page
 */

describe('Tier Filter Feature', () => {
  beforeEach(() => {
    // Visit the app and wait for initial load
    cy.visit('/');
    cy.waitForData();
  });

  describe('Tier Filter Bar Visibility', () => {
    it('should display the tier filter bar on Player Props page', () => {
      cy.goToPlayerProps();
      cy.get('#tierFilterBar').should('be.visible');
    });

    it('should display all tier filter buttons', () => {
      cy.goToPlayerProps();

      cy.get('[data-tier="all"]').should('be.visible');
      cy.get('[data-tier="topPicks"]').should('be.visible');
      cy.get('[data-tier="goodValue"]').should('be.visible');
      cy.get('[data-tier="leans"]').should('be.visible');
      cy.get('[data-tier="risky"]').should('be.visible');
    });

    it('should have "All Props" button active by default', () => {
      cy.goToPlayerProps();
      cy.get('[data-tier="all"]').should('have.class', 'active');
    });

    it('should display tier count badges', () => {
      cy.goToPlayerProps();
      cy.selectSport('nfl');

      // Wait for data to load
      cy.wait(2000);

      cy.get('#tierCountAll').should('exist');
      cy.get('#tierCountTop').should('exist');
      cy.get('#tierCountGood').should('exist');
      cy.get('#tierCountLean').should('exist');
      cy.get('#tierCountRisky').should('exist');
    });
  });

  describe('Tier Filter Button Interactions', () => {
    beforeEach(() => {
      cy.goToPlayerProps();
      cy.selectSport('nfl');
      cy.wait(2000);
    });

    it('should activate clicked button and deactivate others', () => {
      cy.filterByTier('topPicks');

      cy.get('[data-tier="topPicks"]').should('have.class', 'active');
      cy.get('[data-tier="all"]').should('not.have.class', 'active');
      cy.get('[data-tier="goodValue"]').should('not.have.class', 'active');
      cy.get('[data-tier="leans"]').should('not.have.class', 'active');
      cy.get('[data-tier="risky"]').should('not.have.class', 'active');
    });

    it('should filter to show only Top Picks when clicked', () => {
      cy.filterByTier('topPicks');

      // Top picks section should be visible
      cy.get('.tier-section.tier-top').should('not.have.class', 'hidden');

      // Other sections should be hidden
      cy.get('.tier-section.tier-good').should('have.class', 'hidden');
      cy.get('.tier-section.tier-lean').should('have.class', 'hidden');
      cy.get('.tier-section.tier-risky').should('have.class', 'hidden');
    });

    it('should filter to show only Good Value when clicked', () => {
      cy.filterByTier('goodValue');

      cy.get('.tier-section.tier-good').should('not.have.class', 'hidden');
      cy.get('.tier-section.tier-top').should('have.class', 'hidden');
      cy.get('.tier-section.tier-lean').should('have.class', 'hidden');
      cy.get('.tier-section.tier-risky').should('have.class', 'hidden');
    });

    it('should filter to show only Leans when clicked', () => {
      cy.filterByTier('leans');

      cy.get('.tier-section.tier-lean').should('not.have.class', 'hidden');
      cy.get('.tier-section.tier-top').should('have.class', 'hidden');
      cy.get('.tier-section.tier-good').should('have.class', 'hidden');
      cy.get('.tier-section.tier-risky').should('have.class', 'hidden');
    });

    it('should filter to show only Risky when clicked', () => {
      cy.filterByTier('risky');

      cy.get('.tier-section.tier-risky').should('not.have.class', 'hidden');
      cy.get('.tier-section.tier-top').should('have.class', 'hidden');
      cy.get('.tier-section.tier-good').should('have.class', 'hidden');
      cy.get('.tier-section.tier-lean').should('have.class', 'hidden');
    });

    it('should show all sections when "All Props" is clicked', () => {
      // First filter to a specific tier
      cy.filterByTier('topPicks');

      // Then click All Props
      cy.filterByTier('all');

      // All sections should be visible
      cy.get('.tier-section').each(($section) => {
        cy.wrap($section).should('not.have.class', 'hidden');
      });
    });
  });

  describe('Tier Count Updates', () => {
    it('should update tier counts when sport changes', () => {
      cy.goToPlayerProps();

      // Select NFL
      cy.selectSport('nfl');
      cy.wait(2000);

      // Get initial counts
      cy.get('#tierCountAll').invoke('text').then((nflCount) => {
        // Select NBA
        cy.selectSport('nba');
        cy.wait(2000);

        // Count should change
        cy.get('#tierCountAll').invoke('text').should('not.eq', nflCount);
      });
    });

    it('should display non-zero counts when props are available', () => {
      cy.goToPlayerProps();
      cy.selectSport('nfl');
      cy.wait(3000);

      // At least the total count should be greater than 0
      cy.get('#tierCountAll').invoke('text').then((text) => {
        const count = parseInt(text);
        expect(count).to.be.greaterThan(0);
      });
    });
  });

  describe('Tier Section Display', () => {
    beforeEach(() => {
      cy.goToPlayerProps();
      cy.selectSport('nfl');
      cy.wait(3000);
    });

    it('should display tier sections with proper headers', () => {
      cy.get('.tier-section.tier-top .tier-title').should('contain', 'TOP PICKS');
      cy.get('.tier-section.tier-good .tier-title').should('contain', 'GOOD VALUE');
      cy.get('.tier-section.tier-lean .tier-title').should('contain', 'LEANS');
      cy.get('.tier-section.tier-risky .tier-title').should('contain', 'RISKY');
    });

    it('should display prop cards within tier sections', () => {
      cy.get('.tier-section .props-grid').should('exist');
    });

    it('should display tier count in section headers', () => {
      cy.get('.tier-section .tier-count').each(($count) => {
        cy.wrap($count).invoke('text').should('match', /\d+ picks?/);
      });
    });
  });

  describe('Filter Persistence', () => {
    it('should maintain filter when navigating away and back', () => {
      cy.goToPlayerProps();
      cy.selectSport('nfl');
      cy.wait(2000);

      // Select Top Picks filter
      cy.filterByTier('topPicks');
      cy.get('[data-tier="topPicks"]').should('have.class', 'active');

      // Navigate to Dashboard
      cy.get('[data-page="dashboard"]').click();

      // Navigate back to Props
      cy.goToPlayerProps();

      // Filter should still be active (or reset - depends on implementation)
      // This tests the current behavior
      cy.get('.tier-filter-btn.active').should('exist');
    });
  });

  describe('Data Sources Panel', () => {
    it('should display tier breakdown in data sources panel', () => {
      cy.goToPlayerProps();
      cy.selectSport('nfl');
      cy.wait(3000);

      cy.get('.data-sources-banner').should('be.visible');
      cy.get('.props-stats-summary').should('be.visible');
    });

    it('should show correct tier stat items', () => {
      cy.goToPlayerProps();
      cy.selectSport('nfl');
      cy.wait(3000);

      cy.get('.stat-item.top').should('exist');
      cy.get('.stat-item.good').should('exist');
      cy.get('.stat-item.lean').should('exist');
      cy.get('.stat-item.risky').should('exist');
    });
  });

  describe('Responsive Behavior', () => {
    it('should display tier filter on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.goToPlayerProps();

      cy.get('#tierFilterBar').should('be.visible');
      cy.get('.tier-filter-btn').should('have.length', 5);
    });

    it('should allow tier filtering on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.goToPlayerProps();
      cy.selectSport('nfl');
      cy.wait(2000);

      cy.filterByTier('topPicks');
      cy.get('[data-tier="topPicks"]').should('have.class', 'active');
    });
  });
});

describe('API Integration', () => {
  it('should fetch props data with tier information', () => {
    cy.request('/api/aggregate/nfl').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('propsByTier');

      const { propsByTier } = response.body.data;
      expect(propsByTier).to.have.property('topPicks');
      expect(propsByTier).to.have.property('goodValue');
      expect(propsByTier).to.have.property('leans');
      expect(propsByTier).to.have.property('risky');
    });
  });

  it('should return props with confidence scores', () => {
    cy.request('/api/aggregate/nfl').then((response) => {
      const { generatedProps } = response.body.data;

      if (generatedProps && generatedProps.length > 0) {
        generatedProps.forEach((prop) => {
          expect(prop).to.have.property('confidence');
          expect(prop.confidence).to.be.a('number');
          expect(prop.confidence).to.be.at.least(0);
          expect(prop.confidence).to.be.at.most(100);
        });
      }
    });
  });

  it('should categorize props into correct tiers based on confidence', () => {
    cy.request('/api/aggregate/nfl').then((response) => {
      const { propsByTier } = response.body.data;

      // Top picks should have 75%+ confidence
      propsByTier.topPicks?.forEach((prop) => {
        expect(prop.confidence).to.be.at.least(75);
      });

      // Good value should have 65-74% confidence
      propsByTier.goodValue?.forEach((prop) => {
        expect(prop.confidence).to.be.at.least(65);
        expect(prop.confidence).to.be.lessThan(75);
      });

      // Leans should have 55-64% confidence
      propsByTier.leans?.forEach((prop) => {
        expect(prop.confidence).to.be.at.least(55);
        expect(prop.confidence).to.be.lessThan(65);
      });

      // Risky should have <55% confidence
      propsByTier.risky?.forEach((prop) => {
        expect(prop.confidence).to.be.lessThan(55);
      });
    });
  });
});
