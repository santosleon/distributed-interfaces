//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract DefinitionContract {
  struct DefinitionState {
    bytes32 definitionHash;
    bool active;
    bool exists;
  }

  mapping(address => mapping(bytes32 => DefinitionState)) public definitionsMap;
  mapping(address => bytes32[]) public definitionsList;

  function registerDefinition(bytes32 definitionHash, bool active) public returns (bool) {
    if(definitionsMap[msg.sender][definitionHash].exists == true) {
      definitionsMap[msg.sender][definitionHash].active = active;
    } else {
      definitionsMap[msg.sender][definitionHash] = DefinitionState(definitionHash, active, true);
      definitionsList[msg.sender].push(definitionHash);
    }
    return true;
  }

  function getUserDefinitions(address userPublicKey) public view returns (bytes32[] memory) {
    return definitionsList[userPublicKey];
  }

  function getDefinitionState(address userPublicKey, bytes32 definitionHash) public view returns (DefinitionState memory) {
    return definitionsMap[userPublicKey][definitionHash];
  }
}
