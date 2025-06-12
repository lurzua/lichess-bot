const { StockfishEngine } = require('./stockfish-engine.js');
const { firefox, chromium } = require('playwright');
const { Chess } = require('chess.js');

(async () => {
    const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();
    const lichess = 'https://lichess.org/training';
    const game = new Chess();
    const engine = new StockfishEngine();


    await page.goto(lichess);
    await waitForStableBoard(page);
    const chessMoves = await readBoard(page);
    await convertToFen(page, game, chessMoves);
    const bestMove = await askStockfishForBestMove(game, engine);
    console.log("BestMove: ", bestMove);
    console.log('Wait For 5 seconds before closing browser...');
    await page.waitForTimeout(1000 * 5);
    // await browser.close();
})();

async function waitForStableBoard(page) {
    console.log("waitForStableBoard");

    await page.waitForSelector('cg-board');
    await page.waitForFunction(() => {
        const pieces = document.querySelectorAll('cg-board piece');
        return pieces.length > 0 && [...pieces].every(p => p.offsetParent !== null); // Ensure pieces are visible
    });

    console.log('Wait For 1 second before continuing...');
    await page.waitForTimeout(1000 * 1);
}

async function readBoard(page) {
    console.log('readBoard');
    page.waitForSelector('move.hist, move.current');
        const chessMoves = await page.$$eval('move.hist, move.current', els =>
        els.map(el => el.textContent.trim())
    );
    console.log('All moves:', chessMoves);
    return chessMoves;
}

async function convertToFen(page, game, chessMoves) {
    for (const playerMove of chessMoves) {
        game.move(playerMove);
    }
    console.log("FEN: ", game.fen());
}

async function askStockfishForBestMove(game, engine) {
    console.log("askStockfishForBestMove");
    const bestMove = engine.getBestMove(game.fen());
    return bestMove;
}
