import newGame from '../src/game';
import { setLogname } from './logger';

setLogname(Date.now().toString());
newGame(50, 5000);
