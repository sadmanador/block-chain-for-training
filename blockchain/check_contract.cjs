const { ethers } = require('ethers');

async function main() {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const address = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    try {
        const code = await provider.getCode(address);
        if (code === '0x') {
            console.log('Contract not deployed at ' + address);
        } else {
            console.log('Contract found at ' + address);
        }
    } catch (e) {
        console.log('Error: ' + e.message);
    }
}

main();
