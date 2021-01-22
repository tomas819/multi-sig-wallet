// SPDX-License-Identifier: tomas
pragma solidity 0.8;

contract Ownable {
  // address of the owner of the contract
  // internal for higher version of solidity
  //address public owner;
  address internal owner;

  // constructor runs by deploying the contract
  // save the address of the owner in the beginning of the contract
  constructor() {
    owner = msg.sender;
  }

  // modifier only for the owner
  modifier onlyOwner() {
    require(msg.sender == owner, "the caller needs to be the owner");
    _;
  }
}
