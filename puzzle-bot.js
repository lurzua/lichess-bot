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
    const numberOfMoves = Object.values(chessMoves).length;
    await convertToFen(page, game, chessMoves);
    const bestMove = await askStockfishForBestMove(game, engine);
    console.log("BestMove: ", bestMove);
    const chessboard = await readBoardInfo(page); // may be unecessary
    await movePiece(page, bestMove, numberOfMoves);
    // await readBoard(page);
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

async function readBoardInfo(page) {
    console.log("readBoardInfo");
    await page.waitForSelector('cg-container');
    const board = await page.$eval('cg-container', el => {
        const style = el.getAttribute('style'); // e.g., "width: 396px; height: 396px;"
        const match = style.match(/width:\s*(\d+)px;\s*height:\s*(\d+)px/);
        return {
            width: match ? parseInt(match[1], 10) : null,
            height: match ? parseInt(match[2], 10) : null,
            name: 'cg-container',
        };
    });

    console.log('Board: ', board);
    return board;
}

async function movePiece(page, bestMove, numberOfMoves) {
    console.log('Number of Moves: ', numberOfMoves);
    const source = bestMove[0] + bestMove[1];
    const destination = bestMove[2] + bestMove[3];
    const orientation = (numberOfMoves % 2 === 0) ? 'White' : 'Black';
    await clickOnSquare(page, source, orientation);
    await clickOnSquare(page, destination, orientation);
}

async function clickOnSquare(page, square, orientation, buttonType = 'left') {
    const { x, y } = await page.evaluate((square, orientation) => {
    const board = document.querySelector('cg-board');
    const bounds = board.getBoundingClientRect();

    const files = (orientation === 'White') ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    const file = square[0];
    const rank = parseInt(square[1]);

    const size = bounds.width / 8;
    const fileIndex = files.indexOf(file);
    const rankIndex = (orientation === 'White') ? 8 - rank : rank - 1;

    return {
      x: bounds.left + size * fileIndex + size / 2,
      y: bounds.top + size * rankIndex + size / 2
    };
  }, square);

  await page.mouse.click(x, y, { button: buttonType, clickCount: 1, delay: 200 });
}
