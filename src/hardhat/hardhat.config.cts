import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  defaultNetwork: "localhost",
  networks: {
    hardhat: {
      mining: {
        auto: true,
        mempool: {
          order: "fifo"
        }
      }
    }
  }
};

export default config;
