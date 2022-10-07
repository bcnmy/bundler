import axios from 'axios';

const baseUrl = 'http://localhost:3000';

// test feeoption endpoint
describe('get fee options', () => {
  it('should return fee options for chain id 5', async () => {
    const result = await axios.get(`${baseUrl}/api/v1/relay/feeOptions?chainId=5`);
    // expect status code to be 200
    expect(result.status).toBe(200);
    const { data } = result;
    const { response, chainId, code } = data.data;

    expect(code).toBe(200);
    expect(chainId).toBe(5);

    expect(Array.isArray(response)).toBe(true);

    expect(response.length).toBeGreaterThan(0);

    expect(response[0]).toHaveProperty('tokenGasPrice');
    expect(response[0]).toHaveProperty('symbol');
    expect(response[0]).toHaveProperty('decimal');
    expect(response[0]).toHaveProperty('offset');
    expect(response[0]).toHaveProperty('address');
    expect(response[0]).toHaveProperty('logoUrl');
    expect(response[0]).toHaveProperty('feeTokenTransferGas');
    expect(response[0]).toHaveProperty('refundReceiver');

    expect(typeof response[0].tokenGasPrice).toBe('number');
    expect(typeof response[0].symbol).toBe('string');
    expect(typeof response[0].decimal).toBe('number');
    expect(typeof response[0].offset).toBe('number');
    expect(typeof response[0].address).toBe('string');
    expect(typeof response[0].logoUrl).toBe('string');
    expect(typeof response[0].feeTokenTransferGas).toBe('number');
    expect(typeof response[0].refundReceiver).toBe('string');

    expect(response[0].symbol).toBe('ETH');
    expect(response[0].decimal).toBe(18);
    expect(response[0].offset).toBe(1);
    expect(response[0].address).toBe('0x0000000000000000000000000000000000000000');
    expect(response[0].logoUrl).toBe('https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880');
    expect(response[0].feeTokenTransferGas).toBe(7300);
    expect(response[0].refundReceiver).toBe('0x040a9cbC4453B0eeaE12f3210117B422B890C1ED');
  });
});
