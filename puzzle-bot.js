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
    await StartSolvingPuzzles(page, game, engine);

    // await page.goto(lichess);
    // await waitForStableBoard(page);
    // const chessMoves = await readBoard(page);
    // const numberOfMoves = Object.values(chessMoves).length;
    // await convertToFen(page, game, chessMoves);
    // const bestMove = await askStockfishForBestMove(game, engine);
    // console.log("BestMove: ", bestMove);
    // const chessboard = await readBoardInfo(page); // may be unecessary
    // const moves = await extractEntireMoveList(page);
    // const numMoves = Object.values(moves).length;
    // await convertToFen(page, game, moves);
    // await convertToFen(page, game, moves);
    // const bestMove = await askStockfishForBestMove(game, engine);
    // await movePiece(page, bestMove, numberOfMoves);
    // console.log('Wait For 5 seconds before closing browser...');
    // await page.waitForTimeout(1000 * 5);
    // await browser.close();
})();

async function Initialize(page) {
    const lichessPuzzles = 'https://lichess.org/training';
    await page.goto(lichessPuzzles);
    await WaitForStableBoard(page);
}

async function StartSolvingPuzzles(page, game, engine) {
    const entireMoveList = await ReadMoveList(page);
    const filteredMoveList = FilterMoveList(entireMoveList);
    ConvertShortAlgebraicNotationToLongAlgebraicNotation(game, filteredMoveList);
    const bestMove = await BestStockfishMove(game, engine);
    const numberOfMoves = Object.values(filteredMoveList).length;
    await MovePiece(page, bestMove, numberOfMoves);
    await page.waitForTimeout(1000 * 2);

    if (!IsPuzzleSolved(await ReadMoveList(page))) {
        await StartSolvingPuzzles(page, game, engine);
    }
}

async function WaitForStableBoard(page) {
    console.log("WaitForStableBoard");

    await page.waitForSelector('cg-board');
    await page.waitForFunction(() => {
        const pieces = document.querySelectorAll('cg-board piece');
        return pieces.length > 0 && [...pieces].every(p => p.offsetParent !== null); // Ensure pieces are visible
    });

    console.log('Wait For 1 second before continuing...');
    await page.waitForTimeout(1000 * 1);
}

// Unused
async function readBoard(page) {
    console.log('readBoard');
    page.waitForSelector('move.hist, move.current');
        const chessMoves = await page.$$eval('move.hist, move.current', els =>
        els.map(el => el.textContent.trim())
    );
    console.log('All moves:', chessMoves);
    return chessMoves;
}

function ConvertShortAlgebraicNotationToLongAlgebraicNotation(game, chessMoves) {
    game.reset();
    for (const playerMove of chessMoves) {
        game.move(playerMove.move);
    }
}

async function BestStockfishMove(game, engine) {
    console.log("askStockfishForBestMove");
    const bestMove = engine.getBestMove(game.fen());
    console.log("FEN: ", bestMove);
    return bestMove;
}

// Unused
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

async function MovePiece(page, bestMove, numberOfMoves) {
    console.log('Number of Moves: ', numberOfMoves);
    const source = bestMove[0] + bestMove[1];
    const destination = bestMove[2] + bestMove[3];
    const orientation = (numberOfMoves % 2 === 0) ? 'White' : 'Black';
    await ClickOnSquare(page, source, orientation, 'left');
    await ClickOnSquare(page, destination, orientation, 'left');
}

async function ClickOnSquare(page, square, orientation, buttonType = 'left') {
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

async function ReadMoveList(page) {
    const moveList = await page.evaluate(() => {
        const moveElements = document.querySelectorAll('.tview2-column move');
        return Array.from(moveElements).map((el, index) => ({
            index: index + 1,
            move: el.textContent.trim(),
            p: el.getAttribute('p'),
            class: el.className
        }));
    });
    console.log("MoveList: ", moveList);
    return moveList;
}

function FilterMoveList(moveList) {
    // const moves = moveList.filter(m => {
    //     const classes = m.class.split(' ');
    //     return classes.includes('hist') || classes.includes('good') ||
    //         (classes.includes('current') && classes.includes('active')) ||
    //         (classes.includes('active') && classes.includes('win'));
    // });

    const moves = moveList
    .filter(m => {
        const classes = m.class.trim().split(/\s+/);
        return (
        classes.includes('') ||
        classes.includes('hist') ||
        classes.includes('current') ||
        classes.includes('good') ||
        classes.includes('active') ||
        (classes.includes('current') && classes.includes('active')) ||
        (classes.includes('active') && classes.includes('win'))
        );
    })
    .map(m => ({
        ...m,
        move: m.move.replace(/[✓+]/g, '') // removes all checkmarks
    }));

    console.log('Filtered Moves', moves);
    return moves;
}

function IsPuzzleSolved(moveList) {
    isSolved = false;

    for (const item of moveList) {
        if (item.class.split(' ').includes('active') && item.class.split(' ').includes('win')) {
            isSolved = true;
        }
    }

    if (isSolved) {
        console.log('Puzzle Solved.');
    }
    else {
        console.log('Puzzle remains unsolved.');
    }

    return isSolved;
}
