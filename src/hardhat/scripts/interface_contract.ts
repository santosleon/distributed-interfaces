import hardhat from "hardhat";
import * as crypto from 'crypto';

const sha256 = (input: string | Uint8Array): Uint8Array => {
  return crypto.createHash('sha256').update(input).digest();
}

const main = async () => {
  // Retrieve the contract artifacts
  const contractFactory = await hardhat.ethers.getContractFactory("InterfaceContract");

  // Deploy the contract
  const interfaceContract = await contractFactory.deploy();

  // Wait for the contract to be mined
  await interfaceContract.waitForDeployment();

  const signers = await hardhat.ethers.getSigners();
  const userAddress = signers[0].address;

  const rootHash = sha256('a');
  let prevHash = rootHash;
  for (let i = 0; i < 3; i++) {
    const fileHash = sha256(`file${i}`);
    await interfaceContract.registerInterface(rootHash, prevHash, fileHash);
    prevHash = sha256(new Uint8Array([...prevHash, ...fileHash]));
  }

  const b = await interfaceContract.getInterfaceVersions(rootHash);
  console.log(b)

  const c = await interfaceContract.getUserInterfaces(userAddress);
  console.log(c)

  const d = await interfaceContract.getInterfaceState(c[0]);
  console.log(d)

}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
