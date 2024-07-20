import * as crypto from 'crypto';
import * as fs from 'fs';
import { CID } from 'multiformats/cid';
import * as path from 'path';
import * as stream from 'stream';

import pinataSDK from '@pinata/sdk';
import { Config, Definition } from '../grammar/base.interfaces.js';
import { sha256Str, sortObjectKeys } from './common.js';
import { create as createDigest } from 'multiformats/hashes/digest';
import { CLI } from '../commands/cli.js';

export class IPFS {
  pinata: pinataSDK;
  gateway: string = 'https://rose-cautious-felidae-436.mypinata.cloud/ipfs';

  constructor(config: Config) {
    const jwtPath = path.join(config.processPath, './.env');
    const jwt = fs.readFileSync(jwtPath, 'utf-8');
    this.pinata = new pinataSDK({ pinataJWTKey: jwt });
    this.checkAuth();
  }

  static dataToCID = (data: string) => {
    const bytes = Buffer.from(data);
    const hash = crypto.createHash('sha256').update(bytes).digest();
    return IPFS.sha256ToCID(hash);
  }

  static sha256ToCID = (buffer: Buffer) => {
    const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const sha256Code = 0x12;
    const hash = createDigest(sha256Code, uint8Array);
    const rawCode = 0x55;
    const cid = CID.create(1, rawCode, hash);
    return cid;
  }

  checkAuth = async () => {
    const res = await this.pinata.testAuthentication();
    if(!res.authenticated) {
      console.log('IPFS connection not authenticated...')
      process.exit();
    }
  }

  send = async (data: Buffer, name: string) => {
    this.pinata.pinFileToIPFS(stream.Readable.from(data), {
      pinataOptions: { cidVersion: 1 },
      pinataMetadata: { name },
    });
  }

  sendFromFs = async (config: Config, relativePath: string) => {
    const filePath = path.join(config.codePath, relativePath);
    this.pinata.pinFromFS(filePath, { pinataOptions: { cidVersion: 1 } });
  }
  
  get = async (cid: CID) => {
    let result: string | null = null;
    result = await fetch(`${this.gateway}/${cid.toString()}`)
    .then(async (response) => {
      if(response.status === 200) {
        return response.text();
      } else {
        throw new Error(await response.text())
      }
    });
    return result;
  }

  sendBuiltInterfaces = async (config: Config) => {
    const [modelFilePaths, relationFilesPaths] = ['models', 'relations'].map((interfaceType) => {
      const folderPath = path.join(config.paths.build, `./${interfaceType}`);
      const fileNames = fs.readdirSync(folderPath);
      return fileNames
        .filter(k => k.endsWith('.di') && fs.statSync(path.join(folderPath, k)).isFile())
        .map(k => {
          const filePath = path.join(config.paths.build, `./${interfaceType}/${k}`);
          return path.relative(config.codePath, filePath);
        });
    });
    const interfaceFilePaths = [...modelFilePaths, ...relationFilesPaths];

    for (const k of interfaceFilePaths) {
      await this.sendFromFs(config, k);
    }
  }

  getRemoteInterfaces = async (config: Config) => {
    if(!config.paths.definition) {
      console.log(`Please, include definition path to config file...`);
      process.exit();
    }

    let flatDefinition: Record<string, string> | null;
    try {
      const definitionFromFile: Definition = JSON.parse(fs.readFileSync(config.paths.definition, 'utf-8'));
      flatDefinition = definitionFromFile && {
        ...sortObjectKeys(definitionFromFile.models),
        ...sortObjectKeys(definitionFromFile.compositions),
        ...sortObjectKeys(definitionFromFile.relations),
      }
    } catch (error) {
      console.log(`Definition file Error...`);
      process.exit();
    }
    if(!flatDefinition) return;
    if (!fs.existsSync(config.paths.interfaces)) fs.mkdirSync(config.paths.interfaces);

    for (const [k, v] of Object.entries(flatDefinition)) {
      if(v) {
        const remoteHashBuffer = Buffer.from(v, 'hex');
        let fileAlreadyDownloaded = false;
        const filePath = path.join(config.paths.interfaces, `./${v.toUpperCase()}.di`);
        try {
          const data = fs.readFileSync(filePath, 'utf-8');
          const fileHash = crypto.createHash('sha256').update(data).digest('hex');
          const fileHashBuffer = Buffer.from(fileHash, 'hex');
          fileAlreadyDownloaded = Buffer.compare(fileHashBuffer, remoteHashBuffer) === 0;
          if(fileAlreadyDownloaded) {
            console.log(`Interface ${k} already downloaded...`);
            continue;
          } else {
            console.log(`Interface ${k} changed, please delete it...`);
            process.exit();
          }
        } catch (error) {/* no local file */}

        let fileData: string;
        try {
          console.log(`Downloading Interface ${k}...`);
          const result = await this.get(IPFS.sha256ToCID(remoteHashBuffer));
          if(!result) throw new Error();
          fileData = result;
        } catch (error) {
          console.log(`Interface ${k} (${v}) not found in remote...`)
          process.exit();
        }
        fs.writeFileSync(filePath, fileData, { encoding: 'utf-8' });
      }
    }
  }

  
  sendDefinition = async (config: Config) => {
    const defJson: Definition = JSON.parse(fs.readFileSync(config.paths.definition, 'utf-8'));

    if(!defJson.server) {
      console.log('Please, include a server to definition file...')
      process.exit();
    }
  
    const definition: Definition = {
      server:       config.server,
      models:       sortObjectKeys(defJson.models),
      compositions: sortObjectKeys(defJson.compositions),
      relations:    sortObjectKeys(defJson.relations),
    }

    const defStr = JSON.stringify(definition);
    const fileName = `${sha256Str(defStr)}.json`;

    await this.send(Buffer.from(defStr), fileName);
  }

  getRemoteDefinition = async (config: Config, definitionHashStr: string) => {
    if(!definitionHashStr) {
      console.log(`No definition hash...`);
      process.exit();
    }
    if(!config.paths.definition) {
      console.log(`Please, include definition path to config file...`);
      process.exit();
    }
    let mustReplaceFile = true;
    if(fs.existsSync(config.paths.definition)) {
      mustReplaceFile = await CLI.confirmDefinitionFileReplacement();
    }
    if(!mustReplaceFile) {
      console.log(`Definition file not replaced...`);
      process.exit();
    }
    
    const adjustedDefinitionHashStr = definitionHashStr.toLowerCase().startsWith('0x') ? definitionHashStr.slice(2) : definitionHashStr;

    console.log(`Downloading Definition...`);
    const result = await this.get(IPFS.sha256ToCID(Buffer.from(adjustedDefinitionHashStr, 'hex')));
    if(!result) {
      console.log(`Definition not found in remote...`);
      process.exit();
    }
    fs.writeFileSync(config.paths.definition, JSON.stringify(JSON.parse(result), undefined, 2), { encoding: 'utf-8' });
  }
}

