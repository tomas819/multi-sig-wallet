var web3 = new Web3(Web3.givenProvider);
var contractInstance;
var playerBalance;


$(document).ready(async function() {
    window.ethereum.enable().then(function(accounts) {
        contractAddress = "0xE4110197048bf7995D418A1Ec8F5d40202018105";
        contractInstance = new web3.eth.Contract(abi, contractAddress, {from: accounts[0]});
        console.log(contractInstance);
    }).then(async function() {
        acc = await window.ethereum.request({method: "eth_requestAccounts",});

        updateBalances();
        onlyAdmins();
    });

    $("#wallet_deposit").click(walletDeposit);
    $("#wallet_withdraw").click(walletTransfer);
    $("#all_transfers").click(showAllTransfers);
    $("#wallet_approve").click(approveTransfer);
    $("#wallet_approve_withdraw").click(withdrawApprovedTransfer);
    $("#drain").click(withdrawContractBalance);

    $("#alert_message").hide();
    $("#admin_area").hide();
});

// update contract and players accounts, update the current play
function updateBalances() {
    updateUserBalance();
    updateContractBalance();
    updateWalletBalance();
}

function updateUserBalance() {
    web3.eth.getBalance(contractInstance.options.from).then(function(account_balance) {
        $("#account_address").text(contractInstance.options.from);
        $("#account_balance").text(web3.utils.fromWei(account_balance) + " ETH");
        playerBalance = parseFloat(account_balance);
    });
}

function updateContractBalance() {
    contractInstance.methods.getContractBalance().call().then(function (contract_balance) {
        $("#contract_balance").text(web3.utils.fromWei(contract_balance) + " ETH");
    });
}

function updateWalletBalance() {
    contractInstance.methods.getWalletBalances().call().then(function(wallet_balance) {
        $("#wallet_balance").text(web3.utils.fromWei(wallet_balance.deposited) + " ETH");
        $("#wallet_transfer_open_balance").text(web3.utils.fromWei(wallet_balance.transfersOpen) + " ETH");
        $("#wallet_transfer_open_count").text(wallet_balance.transfersOpenCount);
        $("#wallet_transfer_approved_balance").text(web3.utils.fromWei(wallet_balance.transfersApproved) + " ETH");
        $("#wallet_transfer_approved_count").text(wallet_balance.transfersApprovedCount);
    });
}


function onlyAdmins() {
    contractInstance.methods.senderIsOwner().call().then(function(admin) {
        if (admin) {
            $("#admin_area").show();
        }
    });
}


// check if bet is a positive number and less than players account balance
function checkAmount(amount) {
    if (isNaN(amount)) {
        setAlertMessage("e", "The amount is not a number!");
    }
    else {
        if (amount <= 0) {
            setAlertMessage("e", "The amount must be > 0 ETH!");
        }
        else {
            return true;
        }
    }
}


function walletDeposit() {
    var amount_deposit = $("#amount_deposit").val();
    if (checkAmount(amount_deposit)) {
        var config = {
            value: web3.utils.toWei(amount_deposit, "ether")
        }
        contractInstance.methods.deposit().send(config)
        .on("error", function(error) {
            console.log("error");
            console.log(error);
         })
         .on("transactionHash", function(hash) {
             setAlertMessage("s", "transaction sent, waiting for confirmation...");
         })
         .on("confirmation", function(confirmationNr) {
             if (confirmationNr < 1) {
                 setAlertMessage("s", "transaction confirmed [" + confirmationNr + "], waiting for the result...");
             }
         })
         .on("receipt", function(receipt) {
             setAlertMessage("i", "deposited!");
             updateBalances();
         });
     }
}

function walletTransfer() {
    var amount_withdraw = $("#amount_withdraw").val();
    if (checkAmount(amount_withdraw)) {
        contractInstance.methods.createTransfer(contractInstance.options.from, web3.utils.toWei(amount_withdraw)).send()
        .on("error", function(error) {
            console.log("error");
        })
        .on("transactionHash", function(hash) {
            setAlertMessage("s", "transaction sent, waiting for confirmation...");
        })
        .on("confirmation", function(confirmationNr) {
            if (confirmationNr < 1) {
                setAlertMessage("s", "transaction confirmed [" + confirmationNr + "], waiting for the result...");
            }
        })
        .on("receipt", function(receipt) {
            if (receipt.events.transferOverLimit_event.returnValues.over_limit == true) {
                setAlertMessage("e", "withdrawal amount is higher then your balance");
            }
            else {
                setAlertMessage("i", "transfer registered!");
            }
            updateBalances();
        });
    }
}

function showAllTransfers() {
    contractInstance.methods.getAllTransferRequests().call().then(function(res) {
        var html = '';
        for (var i = 0; i < res.length; i++) {
            html += '<tr>';
            html += '<td><button type="button" id="wallet_approve_withdraw_item" class="btn btn-success" onclick="return approveTransfer('+ res[i][0][0] +')">A</button> '
            html += '<button type="button" id="wallet_withdraw_item" class="btn btn-primary" onclick="return withdrawApprovedTransfer('+ res[i][0][0] +')">W</button></td>'
            for (var j = 0; j < 5; j++) {
                if (j == 2) {
                    html += '<td>' + web3.utils.fromWei(res[i][j]) + ' ETH</td>';
                }
                else {
                    html += '<td>' + res[i][j] + '</td>';
                }
            }
            html += '</tr>';
        }
        $('#transfer_table').html(html);
    });
}


function approveTransfer(id) {
    contractInstance.methods.approveTransfer(id).send()
    .on("error", function(error) {
       console.log("error");
       console.log(error);
    })
    .on("transactionHash", function(hash) {
      setAlertMessage("s", "transaction sent, waiting for confirmation...");
    })
    .on("confirmation", function(confirmationNr) {
      if (confirmationNr < 1) {
        setAlertMessage("s", "transaction confirmed [" + confirmationNr + "], waiting for the result...");
      }
    })
    .on("receipt", function(receipt) {
      setAlertMessage("i", "transfer approved!");
      showAllTransfers();
    });
}



function withdrawApprovedTransfer(id) {
    contractInstance.methods.withdrawApprovedTransfer(id).send()
    .on("error", function(error) {
       console.log("error");
       console.log(error);
    })
    .on("transactionHash", function(hash) {
      setAlertMessage("s", "transaction sent, waiting for confirmation...");
    })
    .on("confirmation", function(confirmationNr) {
      if (confirmationNr < 1) {
        setAlertMessage("s", "transaction confirmed [" + confirmationNr + "], waiting for the result...");
      }
    })
    .on("receipt", function(receipt) {
      setAlertMessage("i", "approved transfer withdrawed!");
      updateBalances();
      showAllTransfers();
    });
}




// alert message appears on the top;
//  set message color and text
function setAlertMessage(alert_type, alert_message) {
    let alert_class;
    switch (alert_type) {
        case "e":
            alert_class = "alert alert-danger";
            break;
        case "i":
            alert_class = "alert alert-warning";
            break;
        case "s":
            alert_class = "alert alert-primary";
            break;
    }
    $("#alert_message").removeClass();
    $("#alert_message").addClass(alert_class);
    $("#alert_message").show();
    $("#alert_message_text").text(alert_message);
}


function withdrawContractBalance() {
    contractInstance.methods.withdrawContractBalance().send()
    .on("error", function(error) {
         console.log("error");
         console.log(error);
    })
    .on("transactionHash", function(hash) {
        setAlertMessage("s", "transaction sent, waiting for confirmation...");
    })
    .on("confirmation", function(confirmationNr) {
        if (confirmationNr < 1) {
          setAlertMessage("s", "transaction confirmed [" + confirmationNr + "], waiting for the result...");
        }
    })
    .on("receipt", function(receipt) {
        setAlertMessage("i", "contract balance withdrawed!");
        updateBalances();
    });
}
