import { each, map, times } from 'lodash';
import Actor from './actor';
import { log } from './../logger';

export default class World {
  food: number = 10;
  actors: { [id: number]: Actor } = {};
  toAdd: Actor[] = [];
  toRemove: Actor[] = [];
  stepCount: number = 0;
  longestLivingActor: Actor;
  lastId: number = 0;

  constructor(actorCount: number) {
    times(actorCount, () => this.addActor());
    each(this.toAdd, actor => (this.actors[actor.id] = actor));
  }

  step = async (): Promise<void> => {
    this.food += 3;
    await log(
      `===================================================\nSTEP ${
        this.stepCount
      } - food - ${this.food}\n`,
    );
    for (let id in this.actors) {
      await this.actors[id].doMove();
      if (
        !this.longestLivingActor ||
        this.longestLivingActor.lifespan < this.actors[id].lifespan
      ) {
        this.longestLivingActor = this.actors[id];
      }
    }
    each(this.toAdd, actor => (this.actors[actor.id] = actor));
    each(this.toRemove, actor => delete this.actors[actor.id]);
    this.toAdd = [];
    this.toRemove = [];
    this.stepCount++;
  };

  addActor = (parent?: Actor) => {
    const actor = new Actor(this, this.lastId, parent);
    this.lastId++;
    this.toAdd.push(actor);
  };

  getActor = (id: number) => {
    return this.actors[id];
  };

  removeActor = (actor: Actor) => {
    this.toRemove.push(actor);
  };
}
