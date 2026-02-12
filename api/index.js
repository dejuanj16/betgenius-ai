// Vercel Serverless Function Entry Point
// This wraps the existing server.js for Vercel deployment

const app = require('../server.js');

module.exports = app;
