import { MongoClient } from 'mongodb';

// MongoDB connection URL and Database name
console.log('process.env.MONGO_URL:', process.env.MONGO_URL);

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB_NAME || 'tools_api';
const historyCollectionName = 'ip_lookup_history';

// Create a new MongoClient
const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

async function connect() {
  await client.connect();
  return client.db(dbName);
}

async function getMongoDBInfo() {
  try {
    const db = await connect();

    // Get database statistics
    const dbStats = await db.stats();

    return {
      operational: true,
      dbStats,
    };
  } catch (error) {
    console.error('Error fetching MongoDB info:', error);
    return { operational: false, error: error.message };
  }
}


async function insertDocument(document) {
  try {
    const db = await connect();
    const collection = db.collection(historyCollectionName);
    const result = await collection.insertOne(document);
    return result;
  } catch (error) {
    console.error('Error inserting document:', error);
    throw new Error('Error inserting document', error); // Or handle the error as appropriate for your application
  }
}

async function getDocuments(options = {}) {
  const {
    limit = 20,
  } = options;

  try {
    const db = await connect();
    const collection = db.collection(historyCollectionName);
    const documents = await collection.find({}, { projection: { _id: 0 } })
      .sort({ _id: -1 })
      .limit(limit)
      .toArray();
    return documents;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw new Error('Error fetching documents', error); // Or handle the error as appropriate for your application
  }
}


export { getMongoDBInfo, insertDocument, getDocuments };
