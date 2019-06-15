import { each, map, times } from 'lodash';
import Actor from './actor';

export default class World {
  food: number = 10;
  actors: { [id: string]: Actor } = {};
  toAdd: Actor[] = [];
  toRemove: string[] = [];

  constructor(actorCount: number) {
    times(actorCount, this.addActor);
  }

  step = (): void => {
    this.food += 10;
    each(this.actors, actor => actor.doMove());
    each(this.toAdd, actor => (this.actors[actor.id] = actor));
    each(this.toRemove, id => delete this.actors[id]);
    this.toAdd = [];
    this.toRemove = [];
    console.log(
      `State of World ====================================================================\nfood: ${
        this.food
      }${map(
        this.actors,
        actor =>
          `\n${actor.name}/${actor.id}: strength - ${
            actor.strength
          }, children - ${actor.children}`,
      )}`,
    );
  };

  addActor = () => {
    const actor = new Actor(this);
    this.toAdd.push(actor);
  };

  getActor = (id: string) => {
    return this.actors[id];
  };

  removeActor = (brainId: string) => {
    this.toRemove.push(brainId);
  };
}
