import { concat, keys, sample } from 'lodash';
import { NeuralNetwork, Model, Academy } from 'reimprovejs/dist/reimprove';
import { uniqueNamesGenerator } from 'unique-names-generator';
import World from './world';
import { log } from './../logger';

const MAX_STRENGTH = 40;

enum Moves {
  Eat,
  Reproduce,
  Attack,
  Run,
  LookLeft,
  LookRight,
}

export default class Actor {
  id: number;
  name: string;
  strength: number = 5;
  running: boolean = false;
  children: number = 0;
  lifespan: number = 0;
  lastMove: number = -1;
  parent?: Actor;
  lookingAt?: Actor;
  world: World;
  academy: Academy;
  teacher: string;
  agent: string;

  constructor(world: World, id: number, parent?: Actor) {
    this.id = id;
    this.name = uniqueNamesGenerator();
    this.world = world;
    this.parent = parent;
    this.constructNeuralNetwork();
    this.lookAtRandom();
  }

  constructNeuralNetwork = () => {
    const modelFitConfig = {
      epochs: 1,
      stepsPerEpoch: 16,
    };

    const numActions = 5; // n + 1
    const inputSize = 9;
    const temporalWindow = 2;
    const totalInputSize =
      inputSize * temporalWindow + numActions * temporalWindow + inputSize;
    const network = new NeuralNetwork();
    network.InputShape = [totalInputSize];
    network.addNeuralNetworkLayers([
      { type: 'dense', units: 32, activation: 'relu' },
      { type: 'dense', units: numActions, activation: 'softmax' },
    ]);
    // Now we initialize our model, and start adding layers
    const model = Model.FromNetwork(network, modelFitConfig);

    // Finally compile the model, we also exactly use tfjs's optimizers and loss functions
    // (So feel free to choose one among tfjs's)
    model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

    // Every single field here is optionnal, and has a default value. Be careful, it may not fit your needs ...
    const teacherConfig = {
      lessonsQuantity: 10000,
      lessonLength: 20,
      lessonsWithRandom: 2,
      epsilon: 0.1,
      epsilonDecay: 0.995,
      epsilonMin: 0.05,
      gamma: 0.9,
    };

    const agentConfig = {
      model: model,
      agentConfig: {
        memorySize: 1000, // The size of the agent's memory (Q-Learning)
        batchSize: 128, // How many tensors will be given to the network when fit
        temporalWindow: temporalWindow, // The temporal window giving previous inputs & actions
      },
    };

    // First we need an academy to host everything
    const academy = new Academy();
    const teacher = academy.addTeacher(teacherConfig);
    const agent = academy.addAgent(agentConfig);

    academy.assignTeacherToAgent(agent.Name, teacher);
    this.academy = academy;
    this.agent = agent.Name;
    this.teacher = teacher;
  };

  doMove = async () => {
    const startingStrength = this.strength;
    const startingChildren = this.children;
    if (this.strength <= 1) {
      this.world.removeActor(this);
      await log(`${this.name} died\n`);
      return;
    }
    this.strength -= 1;
    this.running = false;
    const move = await this.findMove();
    await log(this.stringify());
    if (
      this.parent &&
      this.parent.strength > 0 &&
      this.parent.lastMove === move
    ) {
      await log(`${this.name} copied its parent!`);
      this.academy.addRewardToAgent(this.agent, 5);
    }
    if (move === Moves.Eat) await this.eat();
    else if (move === Moves.Reproduce) await this.reproduce();
    else if (move === Moves.Attack) await this.attack();
    else if (move === Moves.Run) await this.run();
    else if (move === Moves.LookLeft) await this.lookLeft();
    else if (move === Moves.LookRight) await this.lookRight();
    this.academy.addRewardToAgent(
      this.agent,
      (this.strength - startingStrength) * 5,
    );
    this.academy.addRewardToAgent(
      this.agent,
      (this.children - startingChildren) * 150,
    );
    if (this.strength < 5) this.academy.addRewardToAgent(this.agent, -10);
    this.lifespan++;
    this.lastMove = move;
    await log('');
  };

  stringify = (): string => {
    const name = `${this.id}/${this.name}:\n`;
    const parent = this.parent ? `parent - ${this.parent.name}\n` : '';
    const stats = `lifespan - ${this.lifespan}\nstrength - ${
      this.strength
    }\nchildren - ${this.children}`;
    return name + parent + stats;
  };

  findMove = async (): Promise<number> => {
    // return Math.floor(Math.random() * 4);
    const result = await this.academy.step([
      { teacherName: this.teacher, agentsInput: this.getNNInput() },
    ]);
    if (result === undefined) return -1;
    return result.get(this.agent);
  };

  getNNInput = (): number[] => {
    const selfInput = [this.id, this.strength, this.children];
    const worldInput = [this.world.food];
    const parentInput = [this.parent ? this.parent.lastMove : -1];
    const gazeInput = this.lookingAt
      ? [
          this.lookingAt.id,
          this.lookingAt.strength,
          this.lookingAt.running ? 1 : 0,
          this.lookingAt.lookingAt && this.lookingAt.lookingAt.id === this.id
            ? 1
            : 0,
        ]
      : [0, 0, 0, 0];
    return concat(selfInput, worldInput, parentInput, gazeInput);
  };

  eat = async () => {
    if (this.world.food <= 0) return;
    if (this.strength > MAX_STRENGTH) return;
    this.world.food -= 1;
    this.strength += 4;
    await log(`${this.name} ate`);
  };

  reproduce = async () => {
    if (this.strength <= 15) return;
    this.strength -= 10;
    this.children += 1;
    this.world.addActor(this);
    await log(`${this.name} reproduced`);
  };

  attack = async () => {
    if (!this.lookingAt) return;
    if (this.lookingAt.running) return;
    const dealt = this.lookingAt.takeDamage(
      Math.min(MAX_STRENGTH - this.strength, this.strength),
    );
    this.strength = Math.min(
      this.strength + Math.floor(dealt / 2),
      MAX_STRENGTH,
    );
    await log(`${this.name} attacked ${this.lookingAt.name}`);
  };

  run = async () => {
    this.running = true;
    await log(`${this.name} ran`);
  };

  lookLeft = async () => {
    const ids = keys(this.world.actors);
    if (!this.lookingAt) await this.lookAtRandom();
    else {
      let newId = ids.indexOf(this.lookingAt.id.toString()) - 1;
      this.lookingAt = this.world.actors[
        ids[newId < 0 ? ids.length - 1 : newId]
      ];
    }
    await log(`${this.name} looked at ${this.lookingAt.name}`);
  };

  lookRight = async () => {
    const ids = keys(this.world.actors);
    if (!this.lookingAt) await this.lookAtRandom();
    else {
      let newId = ids.indexOf(this.lookingAt.id.toString()) + 1;
      this.lookingAt = this.world.actors[
        ids[newId > ids.length - 1 ? 0 : newId]
      ];
    }
    await log(`${this.name} looked at ${this.lookingAt.name}`);
  };

  takeDamage = (damage: number): number => {
    const taken = Math.min(this.strength, damage);
    this.strength -= taken;
    return taken;
  };

  lookAtRandom = async () => {
    this.lookingAt = sample(this.world.actors);
  };
}
