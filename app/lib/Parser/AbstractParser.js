
import { readFileSync } from 'fs';

export default class AbstractParser {
  constructor(file) {
    this.filePath = file;
    this.fileContent = readFileSync(this.filePath, { encoding: 'utf8' });
  }
}
