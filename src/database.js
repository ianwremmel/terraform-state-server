import assert from 'assert';

import {Client} from 'pg';

const schemaQuery = `
CREATE TABLE IF NOT EXISTS "state" (
  "id" INTEGER PRIMARY KEY UNIQUE,
  "data" JSONB,
  "lock" JSONB,
  "lockid" UUID
)
`;

const promise = new Promise((resolve, reject) => {
  assert(process.env.DATABASE_URL, `DATABASE_URL must be defined`);
  const client = new Client({connectionString: process.env.DATABASE_URL});
  client.connect()
    .then(() => client.query(schemaQuery))
    .then(() => resolve(client))
    .catch(reject);
});

export default promise;
