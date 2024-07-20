import * as fs from 'fs';
import * as path from 'path';
import { Config, InterfaceState, SubmitItem, SubmitJson } from '../../grammar/base.interfaces.js';
import { delay, sha256Buffer } from '../common.js';
import { Contract } from './common.js';

export class InterfaceContract extends Contract {
  constructor(config: Config) {
    const contractName = 'InterfaceContract';
    super(config, contractName);
  }

  registerInterface = async (rootHash: Uint8Array, prevHash: Uint8Array, fileHash: Uint8Array) => {
    const tx = await this.contract.registerInterface(rootHash, prevHash, fileHash)
      .catch((error) => console.log((error as any).reason));
    if(tx) await tx.wait();
    await delay(1000);
  }

  getInterfaceVersions = async (interfaceName: string) => {
    const rootHash: Uint8Array = new Uint8Array(sha256Buffer(interfaceName));
    const tx = await this.contract.getInterfaceVersions(rootHash);
    return [...tx].map(k => k.slice(2).toUpperCase()) as string[];
  }

  getUserInterfaces = async (address: string) => {
    const adjustedAddress = address.toLowerCase().startsWith('0x') ? address : `0x${address}`;
    const tx = await this.contract.getUserInterfaces(adjustedAddress)
      .catch((error) => console.log((error as any)));
    return [...(tx || [])].map(k => k.slice(2).toUpperCase()) as string[];
  }

  getInterfaceState = async (interfaceHashStr: string) => {
    const interfaceHash: Uint8Array = new Uint8Array(Buffer.from(interfaceHashStr, 'hex'));
    const tx = await this.contract.getInterfaceState(interfaceHash)
      .catch((error) => console.log((error as any)));
    const adjustedHashes = [...tx].slice(0,-1).map((k: string) => k.slice(2).toUpperCase());
    return {
      rootHash:      adjustedHashes[0],
      prevHash:      adjustedHashes[1],
      interfaceHash: adjustedHashes[2],
      fileHash:      adjustedHashes[3],
      exists:        tx[4],
    } as InterfaceState;
  }

  registerBuiltInterfaces = async (config: Config) => {
    const submitJsonPath = path.join(config.paths.build, './submit.json');
    const submitJson: SubmitJson = JSON.parse(fs.readFileSync(submitJsonPath, 'utf-8'));
    for (const interfaceName in submitJson) {
      const submitItem = submitJson[interfaceName];
      const [root, prev, file] = (['root', 'prev', 'file'] as (keyof SubmitItem)[]).map(k =>
        new Uint8Array(Buffer.from(submitItem[k], 'hex'))
      );
      console.log(`Registering Interface ${interfaceName}...`)
      await this.registerInterface(root, prev, file);
    }
  }

  saveInterfaceVersionsSearch = async (config: Config, interfaceName: string) => {
    if(!interfaceName) return;
    const interfaceHashes = await this.getInterfaceVersions(interfaceName);
    const searchPath = config.paths.search;
    const subPath1 = path.join(searchPath, './interfaces');
    const subPath2 = path.join(subPath1, './versions');
    if (!fs.existsSync(searchPath)) fs.mkdirSync(searchPath);
    if (!fs.existsSync(subPath1)) fs.mkdirSync(subPath1);
    if (!fs.existsSync(subPath2)) fs.mkdirSync(subPath2);
    const filePath = path.join(subPath2, `./${interfaceName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(interfaceHashes, undefined, 2), { encoding: 'utf-8' });
  }

  saveUserInterfacesSearch = async (config: Config, address: string) => {
    if(!address) return;
    const userInterfaces = await this.getUserInterfaces(address);
    const adjustedAddress = address.toLowerCase().startsWith('0x') ? address : `0x${address}`;
    const searchPath = config.paths.search;
    const subPath1 = path.join(searchPath, './interfaces');
    const subPath2 = path.join(subPath1, './users');
    if (!fs.existsSync(searchPath)) fs.mkdirSync(searchPath);
    if (!fs.existsSync(subPath1)) fs.mkdirSync(subPath1);
    if (!fs.existsSync(subPath2)) fs.mkdirSync(subPath2);
    const filePath = path.join(subPath2, `./${adjustedAddress.toUpperCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(userInterfaces, undefined, 2), { encoding: 'utf-8' });
  }

  saveInterfaceStateSearch = async (config: Config, interfaceHashStr: string) => {
    if(!interfaceHashStr) return;
    const adjustedInterfaceHashStr = interfaceHashStr.toLowerCase().startsWith('0x') ? interfaceHashStr.slice(2) : interfaceHashStr;
    const interfaceState = await this.getInterfaceState(adjustedInterfaceHashStr);
    const searchPath = config.paths.search;
    const subPath1 = path.join(searchPath, './interfaces');
    const subPath2 = path.join(subPath1, './states');
    if (!fs.existsSync(searchPath)) fs.mkdirSync(searchPath);
    if (!fs.existsSync(subPath1)) fs.mkdirSync(subPath1);
    if (!fs.existsSync(subPath2)) fs.mkdirSync(subPath2);
    const filePath = path.join(subPath2, `./${adjustedInterfaceHashStr.toUpperCase()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(interfaceState, undefined, 2), { encoding: 'utf-8' });
  }

}