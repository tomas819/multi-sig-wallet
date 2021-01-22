// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8;
pragma abicoder v2;

contract Wallet {
    address[] public owners;
    uint approvalLimit;

    struct WalletContent {
        uint deposited;
        uint transfersOpen;
        uint transfersOpenCount;
        uint transfersApproved;
        uint transfersApprovedCount;
    }

    mapping(address => WalletContent) walletUsers;

    struct Transfer {
        uint id;
        address payable receiver;
        uint amount;
        uint approved;
        bool hasBeenSent;
    }

    Transfer[] transferRequests;

    mapping(address => mapping(uint => bool)) approvals;


    //Should only allow people in the owners list to continue the execution.
    modifier onlyOwners() {
        bool isOwner = false;
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == msg.sender) {
                isOwner = true;
            }
        }
        require(isOwner == true, "not owner");
        _;
    }


    event transferOverLimit_event(bool over_limit);


    //Should initialize the owners list and the limit
    constructor(address[] memory _owners, uint _limit) {
        owners = _owners;
        approvalLimit = _limit;
    }


    function getOwners() public view returns(address[] memory) {
        return owners;
    }

    function senderIsOwner() public view returns(bool) {
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == msg.sender) {
                return true;
            }
        }
        return false;
    }

    // deposit funds
    function deposit() public payable {
        walletUsers[msg.sender].deposited += msg.value;
    }

    // total contract balance
    function getContractBalance() public view returns(uint) {
        return (payable(address(this))).balance;
    }

    // balances for each wallet user
    function withdrawContractBalance() public onlyOwners {
        uint contractBalance = getContractBalance();
        require(contractBalance > 0, "contract balance is 0 ETH");
        payable(msg.sender).transfer(contractBalance);
    }

    //Create an instance of the Transfer struct and add it to the transferRequests array
    function createTransfer(uint _amount) public {
        //require(_amount <= walletUsers[msg.sender].deposited, "withdrawal amount is higher than your deposits");
        if (_amount > walletUsers[msg.sender].deposited) {
            emit transferOverLimit_event(true);
        }
        else {
            emit transferOverLimit_event(false);
            Transfer memory transferReq;
            transferReq.id = transferRequests.length;
            transferReq.receiver = payable(msg.sender);
            transferReq.amount = _amount;
            transferReq.approved = 0;
            transferReq.hasBeenSent = false;

            walletUsers[msg.sender].deposited -= _amount;
            walletUsers[msg.sender].transfersOpen += _amount;
            walletUsers[msg.sender].transfersOpenCount += 1;

            transferRequests.push(transferReq);
        }
    }

    // all transfer requests
    function getAllTransferRequests() public view returns(Transfer[] memory) {
        return transferRequests;
    }

    function getWalletBalances() public view returns(WalletContent memory) {
        return walletUsers[msg.sender];
    }

    // approve transfers
    function approveTransfer(uint _id) public onlyOwners {
        require(approvals[msg.sender][_id] == false, "this msg.sender already approved");
        require(transferRequests[_id].hasBeenSent == false, "funds have already been sent");
        approvals[msg.sender][_id] = true;
        transferRequests[_id].approved += 1;

        if (transferRequests[_id].approved >= approvalLimit) {
            walletUsers[transferRequests[_id].receiver].transfersOpen -= transferRequests[_id].amount;
            walletUsers[transferRequests[_id].receiver].transfersOpenCount -= 1;
            walletUsers[transferRequests[_id].receiver].transfersApproved += transferRequests[_id].amount;
            walletUsers[transferRequests[_id].receiver].transfersApprovedCount += 1;
        }
    }

    // withdraw approved transfers
    function withdrawApprovedTransfer(uint _id) public onlyOwners {
        uint contractBalance = getContractBalance();
        require(contractBalance > 0, "contract balance is 0 ETH");
        require(transferRequests[_id].approved >= approvalLimit, "not enough approvals");
        require(transferRequests[_id].hasBeenSent == false, "transfer already sent");

        walletUsers[transferRequests[_id].receiver].transfersApproved -= transferRequests[_id].amount;
        walletUsers[transferRequests[_id].receiver].transfersApprovedCount -= 1;

        transferRequests[_id].hasBeenSent = true;
        transferRequests[_id].receiver.transfer(transferRequests[_id].amount);
    }

}
