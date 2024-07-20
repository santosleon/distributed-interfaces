import hardhat from "hardhat";
import * as crypto from 'crypto';

const sha256 = (input: string | Uint8Array): Uint8Array => {
  return crypto.createHash('sha256').update(input).digest();
}

const main = async () => {
  // Retrieve the contract artifacts
  const contractFactory = await hardhat.ethers.getContractFactory("DefinitionContract");

  // Deploy the contract
  const definitionContract = await contractFactory.deploy();

  // Wait for the contract to be mined
  await definitionContract.waitForDeployment();

  const signers = await hardhat.ethers.getSigners();
  const userAddress = signers[0].address;

  for (let i = 0; i < 3; i++) {
    const definitionHash = sha256(`file${i}`);
    const active = true;
    await definitionContract.registerDefinition(definitionHash, active);
  }

  const b = await definitionContract.getUserDefinitions(userAddress);
  console.log(b)

  const c = await definitionContract.getDefinitionState(userAddress, b[0]);
  console.log(c)

}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
