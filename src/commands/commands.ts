import * as fs from 'fs';
import { DefinitionContract } from './blockchain/definition_contract.js';
import { InterfaceContract } from './blockchain/interface_contract.js';
import { CLI } from '../commands/cli.js';
import { Config, Definition } from '../grammar/base.interfaces.js';
import { createDefinitionFile } from './definition.js';
import { genGoStructs } from '../generators/golang/generator.js';
import { createGoTemplateFiles, createSchemaMapFile } from '../generators/golang/templates.js';
import { buildSchema, buildSubmitJson } from '../grammar/build.js';
import { parseSchema, prepareSchema } from '../grammar/grammar_parser.js';
import { IPFS } from './ipfs.js';
import { compileHardhatContracts, deployContractsToLocalEVM, runLocalEVM } from "./local_evm.js";
import { diConfigFileStr } from './templates/di_config.template.js';

export const commandList = ['quit', 'init', 'build', 'interfaces', 'definition', 'gen', 'local_evm'] as const;
export type Command = typeof commandList[number];
export type DefinitionSubcommand = 'start' | 'get' | 'send' | 'register' | 'user' | 'state';
export type InterfacesSubcommand = 'get' | 'send' | 'register' | 'versions' | 'user' | 'state';
export type LocalEVMSubcommand = 'compile' | 'run' | 'deploy';
export type GenSubcommand = 'golang';

export const initCommand = async (configFilePath: string) => {
  let mustReplaceFile = false;
  if (fs.existsSync(configFilePath)) {
    mustReplaceFile = await CLI.confirmConfigFileReplacement();
  }
  if(mustReplaceFile) {
    fs.writeFileSync(configFilePath, diConfigFileStr, { encoding: 'utf-8' });
  }
}

export const buildCommand = (config: Config) => {
  const schemaStr = fs.readFileSync(config.paths.schema, 'utf-8');
  const schema = parseSchema(config, schemaStr);
  buildSchema(schema, config);
  buildSubmitJson(config);
}

export const interfacesCommand = async (config: Config) => {
  const subcommand: InterfacesSubcommand = await CLI.interfacesSubcommand();

  switch (subcommand) {
    case 'get': {
      const ipfs = new IPFS(config);
      await ipfs.getRemoteInterfaces(config);
      break;
    }
    case 'send': {
      const ipfs = new IPFS(config);
      await ipfs.sendBuiltInterfaces(config);
      break;
    }
    case 'register': {
      const contract = new InterfaceContract(config);
      await contract.registerBuiltInterfaces(config);
      break;
    }
    case 'versions': {
      const contract = new InterfaceContract(config);
      const interfaceName = await CLI.interfacesInterfaceName();
      await contract.saveInterfaceVersionsSearch(config, interfaceName);
      break;
    }
    case 'user': {
      const contract = new InterfaceContract(config);
      const userAddress = await CLI.creatorUserAddress();
      await contract.saveUserInterfacesSearch(config, userAddress);
      break;
    }
    case 'state': {
      const contract = new InterfaceContract(config);
      const interfaceHash = await CLI.interfaceHash();
      await contract.saveInterfaceStateSearch(config, interfaceHash);
      break;
    }
  }
}

export const definitionCommand = async (config: Config) => {
  const subcommand: DefinitionSubcommand = await CLI.definitionSubcommand();
  switch (subcommand) {
    case 'start': {
      createDefinitionFile(config);
      break;
    }
    case 'get': {
      const ipfs = new IPFS(config);
      const definitionHash = await CLI.definitionHash();
      await ipfs.getRemoteDefinition(config, definitionHash);
      break;
    }
    case 'send': {
      const ipfs = new IPFS(config);
      await ipfs.sendDefinition(config);
      break;
    }
    case 'register': {
      const contract = new DefinitionContract(config);
      const active = await CLI.definitionRegisterActive();
      await contract.registerDefinitionFile(config, active);
      break;
    }
    case 'user': {
      const contract = new DefinitionContract(config);
      const userAddress = await CLI.creatorUserAddress();
      await contract.saveUserDefinitionsSearch(config, userAddress);
      break;
    }
    case 'state': {
      const contract = new DefinitionContract(config);
      const userAddress = await CLI.creatorUserAddress();
      const definitionHash = await CLI.definitionHash();
      await contract.saveDefinitionStateSearch(config, userAddress, definitionHash);
      break;
    }
  }
}

export const localEvmCommand = async (config: Config) => {
  const subcommand: LocalEVMSubcommand = await CLI.localEvmSubcommand();

  switch (subcommand) {
    case 'compile': {
      compileHardhatContracts();
      break;
    }
    case 'run': {
      runLocalEVM();
    }
    case 'deploy': {
      deployContractsToLocalEVM();
    }
  }
}

export const genCommand = async (config: Config) => {
  const subcommand: GenSubcommand = await CLI.genSubcommand();

  const schema = prepareSchema(config);
  const definition: Definition = JSON.parse(fs.readFileSync(config.paths.definition, 'utf-8'));

  const missionModels = Object.keys(definition.models).filter(dm => schema.models.findIndex(sm => sm.name === dm) < 0);
  if(missionModels.length) {
    console.log("The following models are in definition but are not in interfaces folder:");
    console.log(missionModels.join(', '));
    process.exit();
  }

  switch (subcommand) {
    case 'golang': {
      createGoTemplateFiles(schema, config, definition);
      genGoStructs(schema, config);
      createSchemaMapFile(config);
      break;
    }
  }
}