const Wallet = artifacts.require("Wallet");

module.exports = async function(deployer, network, accounts) {
  //deployer.deploy(Wallet);
  var owners = ["0x4d8629d48a044A05D8Ae0a6a0EC3D4710150068E", "0x1808Eb0847DbCAD83F7AcC0D12fb8E4439E13308"];
  const walletContract = await Wallet.new(owners, 2);
  console.log("wallet contract address: " + walletContract.address);
};
