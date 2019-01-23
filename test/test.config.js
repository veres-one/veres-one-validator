/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

const config = require('bedrock').config;
const path = require('path');

config.mocha.tests.push(path.join(__dirname, 'mocha'));

const cfg = config['veres-one-validator'];

// Set mode to 'dev', so that DIDs are created as 'did:v1:...' in tests
cfg.environment = 'dev';
