import brain from 'brain.js';
import { each, times } from 'lodash';
import Actor from './actor';

export default class World {
  food: number = 10;
  actors: { [id: string]: Actor } = {};
  toAdd: Actor[];
  toRemove: string[];

  constructor(actorCount: number) {
    times(actorCount, this.addActor);
  }

  step = (): void => {
    this.food += 10;
    each(this.actors, actor => actor.doMove());
    each(this.toAdd, actor => (this.actors[actor.brainId] = actor));
    each(this.toRemove, id => delete this.actors[id]);
    this.toAdd = [];
    this.toRemove = [];
  };

  addActor = (brain?: brain.recurrent.RNN) => {
    const actor = new Actor(this, brain);
    this.toAdd.push(actor);
  };

  removeActor = (brainId: string) => {
    this.toRemove.push(brainId);
  };
}
