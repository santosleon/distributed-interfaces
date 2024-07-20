import { execSync } from 'child_process';
import path from 'path';

export const compileHardhatContracts = () => {
  execSync('npx hardhat compile', {
    cwd: path.join(process.cwd(), '/src/hardhat'),
    stdio: 'inherit',
  });
}

export const runLocalEVM = () => {
  execSync('npx hardhat node', {
    cwd: path.join(process.cwd(), '/src/hardhat'),
    stdio: 'inherit',
  });
}

export const deployContractsToLocalEVM = () => {
  const contractNames = ['InterfaceContract', 'DefinitionContract'];
  for (const cn of contractNames) {
    execSync(`npx hardhat ignition deploy ./ignition/modules/${cn}.cts --network localhost`, {
      cwd: path.join(process.cwd(), '/src/hardhat'),
      stdio: 'inherit'
    });
  }
}