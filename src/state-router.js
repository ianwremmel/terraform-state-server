import assert from 'assert';

import express from 'express';
import bodyParser from 'body-parser';
import basicAuth from 'express-basic-auth';

// This'll start initializing the database immediately
import db from './database';

const router = express.Router();
export default router;

if (process.env.BASIC_AUTH_USER || process.env.BASIC_AUTH_PASSWORD) {
  assert(process.env.BASIC_AUTH_USER, `BASIC_AUTH_USER must be set if BASIC_AUTH_PASSWORD is set`);
  assert(process.env.BASIC_AUTH_PASSWORD, `BASIC_AUTH_PASSWORD must be set if BASIC_AUTH_USER is set`);

  router.use(basicAuth({users: {[`${process.env.BASIC_AUTH_USER}`]: process.env.BASIC_AUTH_PASSWORD}}));
}

router.use(bodyParser.json({limit: `10mb`}));

/**
 * A lock payload sent to or from the Terraform command line client. Note that
 * capitalization is non-standard because we don't control the client.
 *
 * @typedef {Object} Lock
 * @property {string} ID
 * @property {string} Operation
 * @property {string} Info
 * @property {string} Who
 * @property {string} Version
 * @property {string} Created
 * @property {string} Path
 */

/**
 * Terraform state object. Not specified further because we just don't care :)
 * It's arbitrary JSON plopped into a field in the database
 * @typedef {Object} State
 */

/*
 * Helpers
 */

async function exec(query, params) {
  const client = await db;
  const {rows} = await client.query(query, params);

  return rows[0];
}

function promisify(fn) {
  return async function wrapper(req, res, next) {
    try {
      await fn(req, res);
    }
    catch (err) {
      next(err);

      return;
    }
    next();
  };
}

/*
 * Queries
 */
const lockQuery = `
INSERT INTO state (id, lock, lockid)
VALUES (1, $1, $2)
  ON CONFLICT (id)
    DO UPDATE SET lock = $1, lockid = $2
    WHERE state.id = 1
`;

const unlockQuery = `
INSERT INTO state (id, lock, lockid)
VALUES (1, null, null)
  ON CONFLICT (id)
    DO UPDATE SET lock = null, lockid = null
    WHERE state.id = 1
`;

const getLockQuery = `
SELECT lock
FROM state
WHERE id = 1
`;

const purgeStateQuery = `
TRUNCATE state
`;

const getStateQuery = `
SELECT data
FROM state
WHERE id = 1
`;

const upsertStateQuery = `
INSERT INTO state (id, data)
VALUES (1, $1)
  ON CONFLICT (id)
    DO UPDATE SET data = $1
    WHERE state.id = 1
`;

/*
 * Query Executors
 */

/**
 * Retrieves the {@link Lock} object
 *
 * @returns {Promise<Lock>}
 */
async function getLock() {
  const row = await exec(getLockQuery);
  if (row) {
    return row.lock;
  }

  return undefined;
}

/**
 * Retrieves the {@link State} object
 *
 * @returns {Promise<State>}
 */
async function getState() {
  const state = await exec(getStateQuery);
  if (state) {
    return state.data;
  }

  return undefined;
}

/**
 * Indicates if there's current a lock in place
 *
 * @returns {Promise<boolean>}
 */
async function isLocked() {
  return !!await getLock();
}

/**
 * Locks the state
 *
 * @param {Lock} newLock
 * @returns {Promise}
 */
async function lock(newLock) {
  await exec(lockQuery, [newLock, newLock.id]);
}

/**
 * Unlocks the state
 *
 * @param {Lock} newLock
 * @returns {Promise}
 */
async function unlock() {
  await exec(unlockQuery);
}

/**
 * Sets a new state
 *
 * @param {Stat} newState
 * @returns {Promise}
 */
async function updateState(newState) {
  await exec(upsertStateQuery, [newState]);
}

/*
 * Routes
 */

router.delete(`/`, promisify(async(req, res) => {
  // If we're already locked, someone would seem to be doing something and we
  // shouldn't drop the state out from under them (which might put their machine
  // in a bad state)
  req.logger.info(`checking for existing lock`);
  if (await isLocked()) {
    req.logger.info(`existing lock found`);
    if (!req.query.force) {
      res
        .status(423)
        .end();

      return;
    }

    req.logger.info(`force specified, ignoring lock`);
  }

  req.logger.info(`purging state`);
  // Purge the state
  await exec(purgeStateQuery);

  req.logger.info(`state purged`);
  // Send success
  res
    .status(200)
    .end();
}));

router.get(`/`, promisify(async(req, res) => {
  req.logger.info(`getting state`);
  const state = await getState();
  if (state) {
    req.logger.info(`no state found`);
    res
      .status(200)
      .send(state)
      .end();
  }
  else {
    req.logger.info(`found state`);
    res
      .status(404)
      .end();
  }
}));

router.lock(`/`, promisify(async(req, res) => {
  req.logger.info(`checking for existing lock`);
  // If there's already a lock, we can't lock again
  const existingLock = await getLock();
  if (existingLock) {
    req.logger.info(`existing lock ${existingLock.ID} found`);
    res
      .status(409)
      .send(existingLock)
      .end();

    return;
  }

  req.logger.info(`no lock found`);
  // Lock it
  const newLock = req.body;
  req.logger.info(`locking with ${newLock.ID}`);
  await lock(newLock);
  req.logger.info(`locked with ${newLock.ID}`);
  // Send success
  res
    .status(200)
    .end();
}));

router.post(`/`, promisify(async(req, res) => {
  const lockId = req.query.ID;
  if (lockId) {
    req.logger.info(`received update request for lock ${lockId}`);
  }
  else {
    req.logger.info(`received update request`);
  }

  req.logger.info(`checking for existing lock`);
  const existingLock = await getLock();

  if (existingLock) {
    if (lockId !== existingLock.ID) {
      req.logger.info(`incoming lock id does not match existing lock`);
      res
        .status(423)
        .send(existingLock)
        .end();

      return;
    }
  }
  else if (lockId) {
    req.logger.info(`receiving locked request but state is not locked`);

    res
      .status(400)
      .send(`state is not locked, but you included a lock id in your request`)
      .end();

    return;
  }

  // Update state
  await updateState(req.body);

  // Send success
  res
    .status(200)
    .end();
}));

router.unlock(`/`, promisify(async(req, res) => {
  req.logger.info(`checking for existing lock`);
  const existingLock = await getLock();
  // If there's no lock, someone's in a bad state and we should send an error
  if (!existingLock) {
    req.logger.info(`no existing lock found, already unlocked`);
    res
      .status(409)
      .end();

    return;
  }

  // If the unlock we received isn't the one we expected, someone's in a bad
  // state
  if (existingLock.ID !== req.body.ID) {
    req.logger.info(`incoming lock id ${req.body.id} does not match current lock ${existingLock.id}`);
    res
      .status(423)
      .send(existingLock)
      .end();

    return;
  }

  req.logger.info(`unlocking`);
  // Unlock it
  await unlock();

  req.logger.info(`unlocked`);
  // Send success
  res
    .status(200)
    .end();
}));
