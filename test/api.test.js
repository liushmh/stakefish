import supertest from 'supertest';
import { expect } from 'chai';

import app from '../server.js'; // Adjust this path to where your Express app is exported

const request = supertest(app);

describe('REST API tests', function () {

    describe('GET /', () => {
        it('should GET the app version, date, and Kubernetes status', (done) => {
            request
                .get('/')
                .expect(200)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                    if (err) return done(err);
                    console.log("body :", res.body);
                    expect(res.body).to.have.property('version');
                    expect(res.body).to.have.property('date');
                    expect(res.body).to.have.property('kubernetes');
                    done();
                });
        });
    });

    describe('GET /v1/history', () => {
        it('should GET the documents history limited to 20', (done) => {
            request
                .get('/v1/history')
                .expect(200)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                    if (err) return done(err);

                    console.log("history body :", res.body);
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.at.most(20); // Ensure it doesn't exceed the limit
                    done();
                });
        });
    });

    describe('GET /v1/tools/lookup', () => {
        it('should require a domain query parameter', (done) => {
            request
                .get('/v1/tools/lookup')
                .expect(400, done); // If no parameters are provided, expect a 400 error
        });

        it('should validate domain format', (done) => {
            request
                .get('/v1/tools/lookup?domain=invalid-domain')
                .expect(400, done); // Expect a 400 error for invalid domain format
        });

        it('should return correct response for a valid domain', (done) => {
            request
                .get('/v1/tools/lookup?domain=github.com')
                .expect(200)
                .expect('Content-Type', /json/)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.have.property('addresses');
                    expect(res.body).to.have.property('client_ip');
                    expect(res.body).to.have.property('created_at');
                    expect(res.body).to.have.property('domain').eql('github.com');
                    done();
                });
        });
    });

    describe('POST /v1/tools/validate', () => {
        it('should require an IP in the request body', (done) => {
            request
                .post('/v1/tools/validate')
                .send({})
                .expect(400, done);
        });

        it('should validate IPv4 format', (done) => {
            request
                .post('/v1/tools/validate')
                .send({ ip: '192.168.1.1' })
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.have.property('status').eql(true);
                    done();
                });
        });

        it('should validate IPv6 format', (done) => {
            request
                .post('/v1/tools/validate')
                .send({ ip: 'fe80::1ff:fe23:4567:890a' })
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.have.property('status').eql(false);
                    done();
                });
        });
    });
});
