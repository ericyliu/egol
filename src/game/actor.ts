import brain from 'brain.js';
import { appendFile, readFile } from 'fs';
import { cloneDeepWith, size, values } from 'lodash';
import { promisify } from 'util';
import { uuidv1 } from 'uuid';
import World from './world';
import { config } from './../index';

enum Moves {
  Eat,
  Mate,
  Attack,
  Run,
  Look,
}

export default class Actor {
  strength: number = 5;
  running: boolean = false;
  children: number = 0;
  step: number = 0;
  brainId: string;
  brain: brain.recurrent.RNN;
  lookingAtIndex: number = -1;
  world: World;
  prevWorld: World;

  constructor(world: World, inputBrain?: brain.recurrent.RNN) {
    this.brainId = uuidv1();
    this.brain = inputBrain || new brain.recurrent.RNN(config);
    this.world = world;
  }

  doMove = async () => {
    this.step += 1;
    this.strength -= 1;
    this.prevWorld = cloneDeepWith(this.world, (value, key) => {
      if (key === 'world') return null;
    });
    if (this.strength <= 0) this.world.removeActor(this.brainId);
    this.running = false;
    const rawMove = this.findMove();
    const move = parseInt(Moves[Math.floor(5 * rawMove)], 10);
    if (move === Moves.Eat) this.eat();
    else if (move === Moves.Mate) this.mate();
    else if (move === Moves.Attack) this.attack();
    else if (move === Moves.Run) this.run();
    else if (move === Moves.Look) this.look(rawMove);
    const line = this.toTrainingLine(rawMove);
    await promisify(appendFile)(`brains/${this.brainId}.json`, line);
    if (this.step % 50 === 0) {
      const data = JSON.parse(
        (await promisify(readFile)(`brains/${this.brainId}.json`)).toString(),
      );
      this.brain.train({ input: data[0], output: data[1] }, {});
    }
  };

  findMove = (): number => {
    return 0;
  };

  eat = () => {
    if (this.strength >= 10) return;
    if (this.world.food <= 0) return;
    this.world.food -= 1;
    this.strength += 2;
  };

  mate = () => {
    if (this.strength > 5) {
      this.children += 1;
      this.strength -= 4;
      this.world.addActor(this.brain);
    }
  };

  attack = () => {
    if (this.lookingAtIndex === -1) return;
    const actor = values(this.world.actors)[this.lookingAtIndex];
    const dealt = actor.takeDamage(this.strength);
    this.strength = Math.min(this.strength + dealt, 10);
  };

  run = () => {
    this.running = true;
  };

  look = (where: number) => {
    this.lookingAtIndex = Math.floor(size(this.world.actors) * where);
  };

  takeDamage = (damage: number): number => {
    const taken = Math.min(this.strength, damage);
    this.strength -= taken;
    return taken;
  };

  getNNInput = (move: Moves): number[] => {
    const prevActor = this.prevWorld.actors[this.brainId];
    const actorScore = this.normalize(prevActor.strength, 0, 10);
    const foodScore = this.normalize(
      this.prevWorld.food,
      this.prevWorld.food + size(this.prevWorld.actors),
      0,
    );
    const lookAtScore = this.normalize(
      values(this.prevWorld.actors)[prevActor.lookingAtIndex].strength,
      10,
      0,
    );
    const moveScore = this.normalize(move, 5, 0);
    return [actorScore, foodScore, lookAtScore, moveScore];
  };

  getNNOutput = (): number[] => {
    const strengthScore = this.strength / 10;
    const childrenScore = this.children;
    return [
      this.normalize(strengthScore + childrenScore, childrenScore + 1, 0),
    ];
  };

  toTrainingLine = (move: Moves): string => {
    // translate to NN input [prevWorld, move] --> [succesScoreNewWorld]
    const input = this.getNNInput(move);
    const output = this.getNNOutput();
    return JSON.stringify([input, output]);
  };

  normalize = (val: number, max: number, min: number): number =>
    (val - min) / (max - min);
}
