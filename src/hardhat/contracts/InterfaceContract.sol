//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract InterfaceContract {
  struct InterfaceState {
    bytes32 rootHash;
    bytes32 prevHash;
    bytes32 interfaceHash;
    bytes32 fileHash;
    bool exists;
  }

  mapping(bytes32 => InterfaceState) public interfaces;
  mapping(address => bytes32[]) public userInterfaces;
  mapping(bytes32 => bytes32[]) public interfaceVersions;

  function registerInterface(bytes32 rootHash, bytes32 prevHash, bytes32 fileHash) public returns (bool) {
    require(prevHash == rootHash || interfaces[prevHash].exists == true, "Previous Interface does not exist.");
    bytes32 interfaceHash = sha256(abi.encodePacked(prevHash, fileHash));
    require(interfaces[interfaceHash].exists == false, "Interface already exists.");
    interfaces[interfaceHash] = InterfaceState(rootHash, prevHash, interfaceHash, fileHash, true);
    userInterfaces[msg.sender].push(interfaceHash);
    interfaceVersions[rootHash].push(interfaceHash);
    return true;
  }

  function getInterfaceVersions(bytes32 rootHash) public view returns (bytes32[] memory) {
    return interfaceVersions[rootHash];
  }

  function getUserInterfaces(address userPublicKey) public view returns (bytes32[] memory) {
    return userInterfaces[userPublicKey];
  }

  function getInterfaceState(bytes32 interfaceHash) public view returns (InterfaceState memory) {
    return interfaces[interfaceHash];
  }
}
