const { spawn } = require('child_process');
const stockfish = spawn('stockfish');
const { firefox, chromium } = require('playwright');

async function clickOnSquare(page, square, buttonType = 'left') {
  const { x, y } = await page.evaluate((square) => {
    const board = document.querySelector('cg-board');
    const bounds = board.getBoundingClientRect();

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const file = square[0];
    const rank = parseInt(square[1]);

    const size = bounds.width / 8;
    const fileIndex = files.indexOf(file);
    const rankIndex = 8 - rank;

    return {
      x: bounds.left + size * fileIndex + size / 2,
      y: bounds.top + size * rankIndex + size / 2
    };
  }, square);

  await page.mouse.click(x, y, { button: buttonType, clickCount: 1, delay: 200 });
  // await page.mouse.click(x, y);
}

async function clickOnEverySquare(page) {
  console.log("clickOnEverySquare");
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  for (const rank of ranks) {
    for (const file of files) {
      const square = `${file}${rank}`;
      // console.log(square);  // Outputs: a1, b1, ..., h8
      await clickOnSquare(page, square);
    }
  }
}

async function waitForStableBoard(page) {
  console.log("waitForStableBoard");

  await page.waitForSelector('cg-board');
  await page.waitForFunction(() => {
    const pieces = document.querySelectorAll('cg-board piece');
    return pieces.length > 0 && [...pieces].every(p => p.offsetParent !== null); // Ensure pieces are visible
  });

  await delay(1000);
}

async function readBoard(page) {
  const allPieceData = await page.evaluate(() => {
    // Select all pieces on the board
    const pieces = document.querySelectorAll('cg-board piece');
    const board = document.querySelector('cg-board');
    const boardRect = board.getBoundingClientRect();
    const squareSize = boardRect.width / 8;
    
    // Iterate through all pieces and extract name and coordinates
    const piecesInfo = [];

    pieces.forEach(piece => {
      const style = piece.style.transform;
      
      // Regular expression to extract translate values (e.g., translate(10px, 20px) or translate(10px))
      const translateMatch = style.match(/translate\(([^)]+)\)/);
      if (translateMatch) {
        // Split the values (could be one or two values)
        const values = translateMatch[1].split(',').map(v => v.trim());
        
        // Handle cases where only one value is present (e.g., translate(10px))
        const x = parseInt(values[0]);  // First value for x-axis
        const y = values[1] ? parseInt(values[1]) : 0;  // Second value for y-axis (defaults to 0 if not present)

        // const [xStr, yStr] = match[1].split(',').map(v => v.trim());

        // Convert pixels to grid positions
        const fileIndex = Math.round(x / squareSize); // 0 to 7
        const rankIndex = 7 - Math.round(y / squareSize); // Flip Y axis

        // Convert to file ('a' to 'h') and rank ('1' to '8')
        const file = String.fromCharCode(97 + fileIndex); // 'a' + 0 = 'a'
        const rank = (rankIndex + 1).toString(); // rank 0 = '1'

        // Push the piece's name (class) and coordinates (x, y) into the result array
        piecesInfo.push({
          name: piece.className,  // Get the className of the piece (e.g., 'black rook')
          coordinates: { x, y },   // Store x and y as coordinates
          algebraic: file + rank
        });
      }
    });

    return piecesInfo;  // Return the array with all pieces' data
  });

  // console.log(allPieceData);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

gameMoves = '';

function createStockfishEngine() {
  const stockfish = spawn('stockfish');
  stockfish.stdout.setEncoding('utf8');

  // Initialize the engine
  stockfish.stdin.write('uci\n');

  function getBestMove(fen, depth = 15) {
    return new Promise((resolve) => {
      let buffer = '';

      const onData = (data) => {
        buffer += data;

        // Look for the 'bestmove' line
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('bestmove')) {
            const move = line.split(' ')[1]; // e.g. "e2e4"
            stockfish.stdout.removeListener('data', onData); // Clean up listener
            resolve(move);
            return;
          }
        }
      };

      stockfish.stdout.on('data', onData);

      // Send commands to prepare the position
      stockfish.stdin.write('isready\n');
      stockfish.stdin.write(`position fen ${fen}\n`);
      // stockfish.stdin.write('position startpos ' + moveList + '\n');
      // stockfish.stdin.write(`go depth ${depth}\n`);
      stockfish.stdin.write('go depth 15\n');
    });
  }

  return { getBestMove };
}

async function movePiece(page, playerMove) {
  await clickOnSquare(page, playerMove[0] + playerMove[1], 'left');
  await clickOnSquare(page, playerMove[2] + playerMove[3], 'left');
}

async function watchFEN(page) {
  const { getBestMove } = createStockfishEngine();
  console.log('Stockfish Engine Created');
  let previousFEN = await page.$eval('input.copyable', el => el.value);
  console.log('prevFen: ', previousFEN);
  while (true) {
    const currentFEN = await page.$eval('input.copyable', el => el.value);
    if (currentFEN !== previousFEN) {
      console.log('FEN changed:', currentFEN);
      previousFEN = currentFEN;
      const nextMove = await getBestMove(currentFEN);
      console.log('nextMove ' + nextMove);
      await movePiece(page, nextMove, 'left');
    }
    await page.waitForTimeout(500); // Prevent CPU overload
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  const lichess = 'https://lichess.org/analysis';
  await page.goto(lichess);

  // Wait for board to load
  await waitForStableBoard(page);
  // await clickOnSquare(page, 'e2');
//   await clickOnEverySquare(page);
  await readBoard(page);
  const currentFEN = await page.$eval('input.copyable', el => el.value);
  console.log('input.copyable ' + currentFEN);
  watchFEN(page);

  // Optional: close browser after delay
  // await page.waitForTimeout(1000 * 60);
  // await browser.close();
})();