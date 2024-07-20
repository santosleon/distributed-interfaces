import hardhat from "hardhat";

const main = async () => {
  // Retrieve the contract artifacts
  const InterfaceContract = await hardhat.ethers.getContractFactory("InterfaceContract");

  // Deploy the contract
  const interfaceContract = await InterfaceContract.deploy();

  // Wait for the contract to be mined
  await interfaceContract.waitForDeployment();
}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
