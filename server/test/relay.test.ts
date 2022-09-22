import supertest from 'supertest';
import { Mongo } from '../../common/db/mongo/models';
import app from '../src/app';

beforeEach((done) => {
  const dbInstance = new Mongo(process.env.MONGO_URL || '');
  dbInstance.connect().then(() => {
    done();
  });
});

test('POST /api/relay', async () => {
  await supertest(app).post('/api/relay')
    .expect(200)
    .then((response: any) => {
    });
});

afterEach(() => {
  Mongo.close();
});
