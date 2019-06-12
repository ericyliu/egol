import { times } from 'lodash';
import World from './world';

export default (actorCount: number, steps: number) => {
  const world = new World(actorCount);
  times(steps, world.step);
};
