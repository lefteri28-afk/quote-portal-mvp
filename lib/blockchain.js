const { ethers } = require('ethers');

function getContract(){
  const rpc = process.env.SEPOLIA_RPC_URL;
  const pk  = process.env.PRIVATE_KEY;
  const addr= process.env.CONTRACT_ADDRESS;
  if(!rpc || !pk || !addr) throw new Error('Missing RPC/PRIVATE_KEY/CONTRACT_ADDRESS');
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const abi = [
    'function logQuoteCreated(string,uint32,bytes32,bytes32) external',
    'function logQuoteViewed(string,uint32,bytes32) external',
    'function logQuoteRevised(string,uint32,bytes32,bytes32) external'
  ];
  return new ethers.Contract(addr, abi, wallet);
}

module.exports = { getContract };
