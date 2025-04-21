export default () => ({
  blockchain: {
    network: 'bsc_testnet',
    bsc: {
      rpcUrl: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      contracts: {
        flashSwap: '0x31CAB5aa101991d064613f5b6D79738Cb63045b8',
      },
      gasMultiplier: 1.2,
      defaultGasLimit: 3000000,
    },
    bsc_testnet: {
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: 97,
      contracts: {
        flashSwap: '0x275640A37f3CDA170E2aDF5d4904F7ef5D40BA56',
      },
      gasMultiplier: 1.2,
      defaultGasLimit: 3000000,
    },
  },
});
