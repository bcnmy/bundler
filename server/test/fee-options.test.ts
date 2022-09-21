import supertest from 'supertest';
import { Mongo } from '../../common/db/mongo/models';
import app from '../src/app';

beforeEach((done) => {
  const dbInstance = new Mongo(process.env.MONGO_URL || '');
  dbInstance.connect().then(() => {
    done();
  });
});

test('GET /api/relay/feeOptions', async () => {
  await supertest(app).get('/api/relay/feeOptions?chainId=5')
    .expect(200)
    .then((response: any) => {
      // Check type and length
      // expect(Array.isArray(response.body)).toBeTruthy();
      // expect(response.body.length).toEqual(1);

      // Check data
      // expect(response.body[0]._id).toBe(post.id);
      // expect(response.body[0].title).toBe(post.title);
      // expect(response.body[0].content).toBe(post.content);
    });
});

afterEach(() => {
  Mongo.close();
});
