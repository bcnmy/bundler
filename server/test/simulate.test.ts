import supertest from 'supertest';
import { Mongo } from '../../common/db/mongo/models';
import app from '../src/app';

beforeEach((done) => {
  const dbInstance = new Mongo(process.env.MONGO_URL || '');
  dbInstance.connect().then(() => {
    done();
  });
});

test('POST /api/relay/simulate', async () => {
  await supertest(app).post('/api/relay/simulate')
    .send({
      to: '0xbD1E8F64A50765C1e477492c72Cd2d0280171722',
      data: '0xe3de17030000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000b48656c6c6f207468657265000000000000000000000000000000000000000000',
      chainId: '5',
      refundInfo: {},
    })
    .expect(200)
    .then((response: any) => {
    });
});

afterEach(() => {
  Mongo.close();
});
