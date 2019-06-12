import newGame from '../src/game';

// provide optional config object, defaults shown.
export const config = {
  inputSize: 20,
  inputRange: 20,
  hiddenLayers: [20, 20],
  outputSize: 20,
  learningRate: 0.01,
  decayRate: 0.999,
};
newGame(10, 1000);

// create a simple recurrent neural network
// const net = new brain.recurrent.RNN(config);

// net.train(
//   [
//     { input: [0, 0], output: [0] },
//     { input: [0, 1], output: [1] },
//     { input: [1, 0], output: [1] },
//     { input: [1, 1], output: [0] },
//   ],
//   {},
// );

// (async () => {
//   const name = `${Date.now()}.json`;
//   await promisify(appendFile)(`brains/${name}`, JSON.stringify(net.toJSON()));
// })();
