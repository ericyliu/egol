import { size } from 'lodash';
import World from './world';
import { log } from './../logger';

export default async (actorCount: number, steps: number) => {
  const world = new World(actorCount);
  for (let i = 0; i < steps; i++) {
    if (size(world.actors) === 0) break;
    await world.step();
  }
  log(
    `===================================================\nLongest Living:\n${world.longestLivingActor.stringify()}`,
  );
  log(`Total Born: ${world.lastId}`);
};
