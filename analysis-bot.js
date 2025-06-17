const { StockfishEngine } = require('./stockfish-engine.js');
const { firefox, chromium } = require('playwright');
const { Chess } = require('chess.js');

(async () => {
    const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();
    const game = new Chess();
    const engine = new StockfishEngine();

    await Initialize(page);
    await StartAnalysis(page, game, engine);
})();

async function Initialize(page) {
    const lichessAnalysis = 'https://lichess.org/analysis';
    await page.goto(lichessAnalysis);
    await WaitForStableBoard(page);
}

async function WaitForStableBoard(page) {
    console.log("WaitForStableBoard");

    await page.waitForSelector('cg-board');
    await page.waitForFunction(() => {
        const pieces = document.querySelectorAll('cg-board piece');
        return pieces.length > 0 && [...pieces].every(p => p.offsetParent !== null); // Ensure pieces are visible
    });
}

async function StartAnalysis(page, game, engine) {
    console.log("StartAnalysis");
}
