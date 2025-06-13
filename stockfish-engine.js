const { spawn } = require('child_process');

class StockfishEngine {
  constructor() {
    this.engine = spawn('stockfish');
    this.ready = false;
    this.queue = [];

    this.engine.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('bestmove')) {
          const [_, bestMove] = line.split(' ');
          const resolve = this.queue.shift();
          if (resolve) resolve(bestMove);
        } else if (line.trim() === 'readyok') {
          this.ready = true;
        }
        // Optional: Log all Stockfish output
        // console.log('<', line);
      }
    });

    this.send('uci');
    this.send('isready');
  }

    send(cmd) {
        this.engine.stdin.write(cmd + '\n');
    }

  async getBestMove(fen, movetime = 1000 * 10) {
    if (!this.ready) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (this.ready) {
            clearInterval(check);
            resolve();
          }
        }, 50);
      });
    }

    this.send(`position fen ${fen}`);
    this.send(`go movetime ${movetime}`);

    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  quit() {
    this.send('quit');
    this.engine.kill();
  }
}

module.exports = { StockfishEngine };
