import { appendFile } from 'fs';
import { promisify } from 'util';

let logname: string = '';

export const setLogname = (name: string) => (logname = name);

export const log = async (text: string) => {
  console.log(text);
  await promisify(appendFile)(`logs/${logname}.log`, `${text}\n`);
};
