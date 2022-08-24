import { supertest } from 'supertest';
import { Mongo } from '../../common/db';
import app from '../src/app';

beforeEach((done) => {
  const dbInstance = new Mongo(process.env.MONGO_URL || '');
  dbInstance.connect().then(() => {
    done();
  });
});

test('GET /api/posts', async () => {
  const post = await Post.create({ title: 'Post 1', content: 'Lorem ipsum' });

  await supertest(app).get('/api/posts')
    .expect(200)
    .then((response: any) => {
      // Check type and length
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toEqual(1);

      // Check data
      expect(response.body[0]._id).toBe(post.id);
      expect(response.body[0].title).toBe(post.title);
      expect(response.body[0].content).toBe(post.content);
    });
});

afterEach(() => {
  Mongo.close();
});
