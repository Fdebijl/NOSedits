import assert from 'assert';

import { initializeTwit } from '../../../dist/twitter/initializeTwit';

describe('initializeTwit', () => {
  it('Should fail when no credentials are set', () => {
    assert.rejects(async () => {
      initializeTwit();
    });
    return;
  });

  it('Should return an instance of Twit when credentials are set', async () => {
    process.env.CONSUMER_KEY = 'ABCDEFGHIJKLMNOPQRSTUVWXY';
    process.env.CONSUMER_SECRET = 'ABCDEFGHIJKLMNOPQRSTUVWXYABCDEFGHIJKLMNOPQRSTUVWXY';
    process.env.ACCESS_TOKEN = '5812395832712489607-ABCDEFGHIJKLMNOPQRSTUVWXYABCDE'
    process.env.ACCESS_TOKEN_SECRET = 'ABCDEFGHIJKLMNOPQRSTUVWXYABCDEFGHIJKLMNOPQRST';

    assert.doesNotThrow(async () => {
      const T = await initializeTwit();
      return;
    })
    return;
  });
});