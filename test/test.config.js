/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

const config = require('bedrock').config;
const path = require('path');

config.mocha.tests.push(path.join(__dirname, 'mocha'));

const cfg = config['veres-one-validator'];

// Set mode to 'test', so that DIDs are created as 'did:v1:test:...' in tests
cfg.environment = 'test';

// use quick equihash setting for tests
cfg.equihash.equihashParameterN = 64;
cfg.equihash.equihashParameterK = 3;
