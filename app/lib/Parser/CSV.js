import parse from 'csv-parse/lib/sync';
import AbstractParser from './AbstractParser';

export default class Parser extends AbstractParser {
  parseCSV() {
    return parse(this.fileContent, {
      delimiter: ',',
      columns: ['inputSku', 'outputSku']
    });
  }
}
