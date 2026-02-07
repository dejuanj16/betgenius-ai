# 🏀 BetGenius AI

**AI-Powered Sports Betting Assistant with Real-Time Data**

BetGenius AI is a sports betting assistant that provides 100% accurate, real-time betting lines, player props, and AI-powered picks by pulling data directly from The Odds API and ESPN.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)

## ✨ Features

- **Live Betting Lines** - Real-time odds from 15+ sportsbooks (DraftKings, FanDuel, BetMGM, etc.)
- **Player Props** - Points, rebounds, assists, passing yards, rushing yards, and more
- **AI Picks** - Smart recommendations based on season averages vs. betting lines
- **Injury Reports** - Live injury data from ESPN
- **Multi-Sport Support** - NBA, NFL, NHL, MLB, NCAAB, NCAAF
- **Dark Theme UI** - Clean, modern black interface

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18.0.0 or higher
- API key from [The Odds API](https://the-odds-api.com/) (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sports-betting-ai.git
   cd sports-betting-ai
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API key:
   ```
   ODDS_API_KEY=your_api_key_here
   PORT=3001
   ```

3. **Start the proxy server**
   ```bash
   node server.js
   ```

   You should see:
   ```
   ╔════════════════════════════════════════════════════════╗
   ║       🏀 BetGenius AI - Live Data Proxy Server 🏀      ║
   ╠════════════════════════════════════════════════════════╣
   ║  Server running at http://localhost:3001              ║
   ╚════════════════════════════════════════════════════════╝
   ```

4. **Open the app**

   Open `index.html` in your browser, or serve it with any HTTP server:
   ```bash
   # Using Python
   python3 -m http.server 8080

   # Using Node.js
   npx serve .
   ```

## 📁 Project Structure

```
sports-betting-ai/
├── server.js           # Proxy server (bypasses CORS)
├── index.html          # Main application page
├── package.json        # Project configuration
├── .env                # Environment variables (API keys)
├── .env.example        # Template for environment setup
├── .gitignore          # Git ignore rules
├── css/
│   └── styles.css      # Dark theme styling
└── js/
    ├── app.js          # Main application logic
    ├── api.js          # API client
    ├── liveData.js     # Live data service
    ├── roster.js       # Player roster management
    ├── data.js         # Data utilities
    └── analytics.js    # Analytics tracking
```

## 🔌 API Endpoints

The proxy server exposes the following endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /api/odds/:sport` | Live betting odds (h2h, spreads, totals) |
| `GET /api/props/:sport` | Player props (points, rebounds, etc.) |
| `GET /api/events/:sport` | Upcoming games/events |
| `GET /api/scores/:sport` | Live scores (ESPN) |
| `GET /api/injuries/:sport` | Injury reports (ESPN) |
| `GET /api/cache/clear` | Clear all props cache |
| `GET /api/cache/clear/:sport` | Clear cache for specific sport |
| `GET /health` | Health check with rate limit & cache status |
| `GET /api/injuries/:sport` | Injury reports (ESPN) |
| `GET /health` | Health check with rate limit status |

**Supported sports:** `nba`, `nfl`, `nhl`, `mlb`, `ncaab`, `ncaaf`

### Example Usage

```bash
# Get NBA odds
curl http://localhost:3001/api/odds/nba

# Get NFL player props
curl http://localhost:3001/api/props/nfl

# Check server health & rate limits
curl http://localhost:3001/health
```

## 🔒 Security Features

- **Environment Variables** - API keys stored in `.env` (never committed)
- **Input Validation** - Whitelist validation on all sport parameters
- **Rate Limit Handling** - Automatic detection and blocking when rate limited
- **Request Timeouts** - 10 second timeout on all API calls
- **CORS Enabled** - Secure cross-origin requests

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ODDS_API_KEY` | Your The Odds API key (required) | - |
| `PORT` | Server port | `3001` |

### Rate Limits

The Odds API has usage limits based on your plan:
- **Free tier**: 500 requests/month
- Check remaining requests via `/health` endpoint

## 🚢 Deployment

### Option 1: Local Development

```bash
node server.js
# Open index.html in browser
```

### Option 2: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json server.js ./
COPY js ./js
COPY css ./css
COPY index.html ./
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server.js"]
```

```bash
docker build -t betgenius-ai .
docker run -p 3001:3001 -e ODDS_API_KEY=your_key betgenius-ai
```

### Option 3: Cloud Platforms

**Heroku:**
```bash
heroku create betgenius-ai
heroku config:set ODDS_API_KEY=your_key
git push heroku master
```

**Railway/Render:**
1. Connect your repository
2. Set `ODDS_API_KEY` environment variable
3. Deploy

### Option 4: VPS (DigitalOcean, AWS, etc.)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone https://github.com/yourusername/sports-betting-ai.git
cd sports-betting-ai
cp .env.example .env
nano .env  # Add your API key

# Run with PM2 (production)
npm install -g pm2
pm2 start server.js --name betgenius
pm2 save
pm2 startup
```

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test with valid sport
curl http://localhost:3001/api/odds/nba

# Test input validation (should return 400)
curl http://localhost:3001/api/odds/invalid
```

## 📊 Data Sources

| Source | Data Provided |
|--------|---------------|
| [The Odds API](https://the-odds-api.com/) | Betting odds, spreads, totals, player props |
| [ESPN API](https://site.api.espn.com/) | Live scores, injuries, player stats, rosters |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This application is for educational and informational purposes only. Sports betting involves financial risk. Please gamble responsibly and in accordance with your local laws.

---

**Made with ❤️ for sports fans**
