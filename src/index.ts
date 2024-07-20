import * as fs from 'fs';
import * as path from 'path';
import { CLI } from './commands/cli.js';
import { definitionCommand, buildCommand, commandList, genCommand, initCommand, interfacesCommand, localEvmCommand } from './commands/commands.js';
import { Config } from './grammar/base.interfaces.js';
import { fileURLToPath } from 'url';

const main = async () => {

  const command = await CLI.firstQuestion();

  if(!commandList.includes(command)) {
    throw new Error('Unknown Command');
  }
  
  if(command === 'quit') { return; };
  
  const processPath = process.cwd();
  const configFilePath = path.join(processPath, 'di_config.json');

  if(command === 'init') {
    initCommand(configFilePath);
  }
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const config: Config  = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
  config.processPath    = processPath;
  config.codePath       = __dirname;

  config.paths.schema            = path.join(processPath, config.paths.schema);
  config.paths.definition        = path.join(processPath, config.paths.definition);
  config.paths.interfaces        = path.join(processPath, config.paths.interfaces);
  config.paths.search            = path.join(processPath, config.paths.search);
  config.paths.build             = path.join(processPath, config.paths.build);
  config.generator.go.outputPath = path.join(processPath, config.generator.go.outputPath);

  switch (command) {
    case 'build':
      buildCommand(config);
      break;
    case 'interfaces':
      interfacesCommand(config);
      break;
    case 'definition':
      definitionCommand(config);
      break;
    case 'gen':
      genCommand(config);
      break;
    case 'local_evm':
      localEvmCommand(config);
      break;
  }
}

try {
  main();
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message);
  }
}
