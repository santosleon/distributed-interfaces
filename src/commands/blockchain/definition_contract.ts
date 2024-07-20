import * as fs from 'fs';
import * as path from 'path';
import { Config, Definition, DefinitionState } from '../../grammar/base.interfaces.js';
import { delay, sha256Buffer, sortObjectKeys } from '../common.js';
import { Contract } from './common.js';

export class DefinitionContract extends Contract {
  constructor(config: Config) {
    const contractName = 'DefinitionContract';
    super(config, contractName);
  }

  registerDefinition = async (definitionHash: Uint8Array, active: boolean) => {
    const tx = await this.contract.registerDefinition(definitionHash, active)
      .catch((error) => console.log((error as any).reason));
    if(tx) await tx.wait();
    await delay(1000);
  }

  getUserDefinitions = async (address: string) => {
    const adjustedAddress = address.toLowerCase().startsWith('0x') ? address : `0x${address}`;
    const tx = await this.contract.getUserDefinitions(adjustedAddress)
      .catch((error) => console.log((error as any)));
    return [...(tx || [])].map(k => k.slice(2).toUpperCase()) as string[];
  }

  getDefinitionState = async (address: string, definitionHashStr: string) => {
    const adjustedAddress = address.toLowerCase().startsWith('0x') ? address : `0x${address}`;
    const definitionHash: Uint8Array = new Uint8Array(Buffer.from(definitionHashStr, 'hex'));
    const tx = await this.contract.getDefinitionState(adjustedAddress, definitionHash)
      .catch((error) => console.log((error as any)));
    const adjustedHashes = [...tx].slice(0,-2).map((k: string) => k.slice(2).toUpperCase());
    return {
      definitionHash: adjustedHashes[0],
      active:         tx[1],
      exists:         tx[2],
    } as DefinitionState;
  }

  registerDefinitionFile = async (config: Config, active: boolean) => {
    const defJson: Definition = JSON.parse(fs.readFileSync(config.paths.definition, 'utf-8'));

    if(!defJson.server) {
      console.log('Please, include a server to definition file...')
      process.exit();
    }
    
    const definition: Definition = {
      server:       defJson.server,
      models:       sortObjectKeys(defJson.models),
      compositions: sortObjectKeys(defJson.compositions),
      relations:    sortObjectKeys(defJson.relations),
    }
  
    const defStr = JSON.stringify(definition);
    const defHash = new Uint8Array(sha256Buffer(defStr));

    console.log(`Registering Definition...`);
    await this.registerDefinition(defHash, active);
  }

  saveUserDefinitionsSearch = async (config: Config, address: string) => {
    if(!address) return;
    const userDefinitions = await this.getUserDefinitions(address);
    const adjustedAddress = address.toLowerCase().startsWith('0x') ? address : `0x${address}`;
    const searchPath = config.paths.search;
    const subPath1 = path.join(searchPath, './definitions');
    const subPath2 = path.join(subPath1, './users');
    if (!fs.existsSync(searchPath)) fs.mkdirSync(searchPath);
    if (!fs.existsSync(subPath1)) fs.mkdirSync(subPath1);
    if (!fs.existsSync(subPath2)) fs.mkdirSync(subPath2);
    const filePath = path.join(subPath2, `./${adjustedAddress.toUpperCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(userDefinitions, undefined, 2), { encoding: 'utf-8' });
  }

  saveDefinitionStateSearch = async (config: Config, address: string, definitionHashStr: string) => {
    if(!definitionHashStr) return;
    const adjustedAddress = address.toLowerCase().startsWith('0x') ? address : `0x${address}`;
    const adjustedDefinitionHashStr = definitionHashStr.toLowerCase().startsWith('0x') ? definitionHashStr.slice(2) : definitionHashStr;
    const definitionState = await this.getDefinitionState(adjustedAddress, adjustedDefinitionHashStr);
    const searchPath = config.paths.search;
    const subPath1 = path.join(searchPath, './definitions');
    const subPath2 = path.join(subPath1, './states');
    if (!fs.existsSync(searchPath)) fs.mkdirSync(searchPath);
    if (!fs.existsSync(subPath1)) fs.mkdirSync(subPath1);
    if (!fs.existsSync(subPath2)) fs.mkdirSync(subPath2);
    const filePath = path.join(subPath2, `./${adjustedDefinitionHashStr.toUpperCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(definitionState, undefined, 2), { encoding: 'utf-8' });
  }

}