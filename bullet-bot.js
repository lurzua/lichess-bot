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
    await StartPlayingBullet(page, game, engine);
})();

async function Initialize(page) {
    const lichessHome = 'https://lichess.org/';
    await page.goto(lichessHome);
    // await WaitForStableLobby(page);
}

async function WaitForStableLobby(page) {
    console.log("WaitForStableLobby");
    await page.waitForSelector('.lobby__app__content.lpools', { state: 'visible' });
    await page.waitForFunction(() => {
        const pieces = document.querySelectorAll('cg-board piece');
        return pieces.length > 0 && [...pieces].every(p => p.offsetParent !== null); // Ensure pieces are visible
    });
}

async function StartPlayingBullet(page, game, engine) {
    await LookForOponent(page);
    // const entireMoveList = await ReadMoveList(page);
    // const filteredMoveList = FilterMoveList(entireMoveList);
    // ConvertShortAlgebraicNotationToLongAlgebraicNotation(game, filteredMoveList);
    // const bestMove = await BestStockfishMove(game, engine);
    // const numberOfMoves = Object.values(filteredMoveList).length;
    // await MovePiece(page, bestMove, numberOfMoves);
    // await page.waitForTimeout(1000 * 2);

    // if (!IsPuzzleSolved(await ReadMoveList(page))) {
    //     await StartPlayingBullet(page, game, engine);
    // }
}

async function LookForOponent(page) {
    console.log('LookForOponent');
    await page.waitForSelector('.lobby__app__content.lpools', { state: 'visible' });
    await page.waitForSelector('[data-id="1+0"]');
    await page.click('[data-id="1+0"]');
}
