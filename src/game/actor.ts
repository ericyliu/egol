import * as uuidv1 from 'uuid/v1';
import { uniqueNamesGenerator } from 'unique-names-generator';
import World from './world';

enum Moves {
  Eat,
  Reproduce,
  Attack,
  Run,
}

export default class Actor {
  id: string;
  name: string;
  strength: number = 5;
  running: boolean = false;
  children: number = 0;
  lookingAtId: string = '';
  world: World;

  constructor(world: World) {
    this.id = uuidv1();
    this.name = uniqueNamesGenerator();
    this.world = world;
  }

  doMove = async () => {
    this.strength -= 1;
    this.running = false;
    if (this.strength <= 0) {
      this.world.removeActor(this.id);
      console.log(`${this.name} died`);
      return;
    }
    const move = this.findMove();
    console.log(
      `${
        this.name
      } is attempting to make a move ======================================`,
    );
    if (move === Moves.Eat) this.eat();
    else if (move === Moves.Reproduce) this.reproduce();
    else if (move === Moves.Attack) this.attack();
    else if (move === Moves.Run) this.run();
  };

  findMove = (): number => {
    return Math.floor(Math.random() * 4);
  };

  eat = () => {
    if (this.strength >= 10) return;
    if (this.world.food <= 0) return;
    this.world.food -= 1;
    this.strength += 2;
    console.log(`${this.name} ate`);
  };

  reproduce = () => {
    if (this.strength <= 5) return;
    this.children += 1;
    this.world.addActor();
    console.log(`${this.name} reproduced`);
  };

  attack = () => {
    if (this.lookingAtId === '') return;
    const actor = this.world.getActor(this.lookingAtId);
    const dealt = actor.takeDamage(this.strength);
    this.strength = Math.min(this.strength + dealt, 10);
    console.log(`${this.name} attacked`);
  };

  run = () => {
    this.running = true;
    console.log(`${this.name} ran`);
  };

  takeDamage = (damage: number): number => {
    const taken = Math.min(this.strength, damage);
    this.strength -= taken;
    return taken;
  };
}
