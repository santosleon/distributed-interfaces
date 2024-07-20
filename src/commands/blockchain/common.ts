import * as ethers from "ethers";
import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../../grammar/base.interfaces.js';

export const getContractJson = (config: Config, contractName: string) => {
  const jsonRelativePath = path.join(config.codePath, `./hardhat/artifacts/contracts/${contractName}.sol/${contractName}.json`);
  const jsonStr = fs.readFileSync(jsonRelativePath, 'utf-8') ;
  return JSON.parse(jsonStr);
}

export const getContractAddress = (config: Config, contractName: string) => {
  const jsonRelativePath = path.join(config.codePath, `./hardhat/ignition/deployments/chain-31337/deployed_addresses.json`);
  const jsonStr = fs.readFileSync(jsonRelativePath, 'utf-8') ;
  return JSON.parse(jsonStr)[`Contract#${contractName}`];
}

export class Contract {
  abi: ethers.ethers.Interface;
  contractAddress: string;
  contract: ethers.ethers.Contract;

  constructor(config: Config, contractName: string) {
    const contractJson = getContractJson(config, contractName);
    this.contractAddress = getContractAddress(config, contractName);
    this.abi = contractJson.abi;
    try {
      if(!config.blockchain.privateKey) {
        throw new Error('Please, provide a private key in config file...');
      }
      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const wallet   = new ethers.Wallet(config.blockchain.privateKey, provider);
      this.contract  = new ethers.Contract(this.contractAddress, this.abi, wallet);
    } catch (error) {
      console.log(error);
      process.exit();
    }
  }
}