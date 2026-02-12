// Cypress E2E support file
// Custom commands and global configuration

// Suppress uncaught exceptions from the app
Cypress.on('uncaught:exception', () => {
  // Returning false prevents Cypress from failing the test
  return false;
});

// Custom command to wait for API data to load
Cypress.Commands.add('waitForData', () => {
  cy.get('.loading-overlay', { timeout: 15000 }).should('have.class', 'hidden');
});

// Custom command to navigate to Player Props page
Cypress.Commands.add('goToPlayerProps', () => {
  cy.get('[data-page="props"]').click();
  cy.get('#props').should('be.visible');
});

// Custom command to select a sport
Cypress.Commands.add('selectSport', (sport) => {
  cy.get(`[data-sport="${sport}"]`).click();
});

// Custom command to click tier filter button
Cypress.Commands.add('filterByTier', (tier) => {
  cy.get(`[data-tier="${tier}"]`).click();
});
