import supertest from 'supertest';
import { expect } from 'chai';

import app from '../server.js'; // Adjust this path to where your Express app is exported

const request = supertest(app);

describe('REST API tests', function() {
    describe('GET /', function() {
        it('should return version, date, and Kubernetes status', async function() {
          const response = await request.get('/');
      
          expect(response.status).to.equal(200);
          expect(response.body).to.have.property('version');
          expect(response.body).to.have.property('date');
          expect(response.body).to.have.property('kubernetes').that.is.a('boolean');
        });
      });
      
});
