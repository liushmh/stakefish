import express from 'express';
import bodyParser from 'body-parser';
import dns from 'dns';
import net from 'net';
import pkg from 'validator';

// swagger lib
import swaggerUi from 'swagger-ui-express';

// Prometheus client lib
import { collectDefaultMetrics, Registry } from 'prom-client';

import swaggerDocument from './swagger.json' assert { type: 'json' };
import packageJson from './package.json' assert { type: 'json' };

import { getMongoDBInfo, insertDocument, getDocuments } from './db/mongodb.js';
import logger from './logger.js';

// Register the metrics
const register = new Registry();

// Metrics
collectDefaultMetrics({ register });

// DNS Validator
const { isFQDN } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;

        const logMessage = `${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms - IP: ${req.ip}`;

        // Optionally stringify and truncate the request body to avoid large log entries
        const requestBody = JSON.stringify(req.body).substring(0, 100);
        logger.info(`${logMessage} - Body: ${requestBody}`);
    });
    next();
});

app.use((err, req, res, next) => {
    logger.error('Unhandled exception', err);
    res.status(500).send('Internal Server Error');
});


// Metrics endpoint
app.get('/metrics', async (req, res) => {
    // TODO: Add authentication and authorization for this endpoint
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Health check endpoint
app.get('/health', async (req, res) => {
    const mongoDBStatus = await getMongoDBInfo();

    res.json({
        status: 'OK',
        database: mongoDBStatus,
        // TODO: Add more system health checks as needed
    });
});



app.get('/', (req, res) => {
    const version = packageJson.version;
    const kubernetes = process.env.KUBERNETES_SERVICE_HOST ? true : false;

    res.json({
        version: version,
        date: Math.floor(Date.now() / 1000),
        kubernetes: kubernetes
    });
});

app.get('/v1/history', (req, res) => {
    getDocuments({

    })
        .then((documents) => {
            res.json(documents);
        })
        .catch((error) => {
            logger.error('Error fetching documents:', error);
            // Note: This error should be 5xx instead of 4xx, as it's an internal server error
            // but in swagger.json, the response is defined as 400, so use 400 here to match the spec
            res.status(400).json({ error: 'Error fetching documents' });
        });
});

app.get('/v1/tools/lookup', (req, res) => {
    const { domain } = req.query;

    if (!domain) {
        return res.status(400).json({ error: "Missing required 'domain' query parameter." });
    } else if (!isFQDN(domain)) {
        return res.status(400).json({ error: "Invalid 'domain' format." });
    }

    dns.resolve4(domain, (err, addresses) => {
        console.log('addresses', addresses);
        if (err || addresses.length === 0) {
            res.status(404).json({
                error: "No records found for the domain."
            });
        } else {
            const ipV4Addresses = addresses.filter(ip => net.isIPv4(ip));
            if (ipV4Addresses.length === 0) {
                return res.status(404).json({
                    error: "No IPv4 records found for the domain."
                });
            }

            res.json({
                "addresses": ipV4Addresses,
                "client_ip": req.ip,
                "created_at": Date.now(),
                "domain": domain
            });

            try {
                insertDocument({
                    "addresses": ipV4Addresses,
                    "client_ip": req.ip,
                    "created_at": Date.now(),
                    "domain": domain
                });
            }
            catch (e) {

                logger.error('Error inserting document:', e);
            }


        }
    });
});

// ["192.168.1.1", "fe80::1ff:fe23:4567:890a", "127.0.0.1", "10.0.0.1", "abcd"];
app.post('/v1/tools/validate', (req, res) => {
    const { ip } = req.body;

    if (!ip) {
        return res.status(400).json({ error: "Missing required 'ip' in request body." });
    }

    res.json({
        "status": net.isIPv4(ip)
    });
});


const server = app.listen(PORT, () => {
    logger.info(`Server is running on http://localhost:${PORT}`);
});

function shutdown() {
    console.log('Shutting down server...');
    
    logger.info('Shutting down server...');
    server.close(() => {
        logger.info('Server shut down.');
    });

    setTimeout(() => {
        logger.warn('Forcing shutdown of server after timeout');
        process.exit(1);
    }, 10000); // 10 seconds
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);


export default app;