/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

const config = require('bedrock').config;
const path = require('path');

config.mocha.tests.push(path.join(__dirname, 'mocha'));

const cfg = config['veres-one-validator'];

// use quick equihash setting for tests
cfg.equihash.equihashParameterN = 64;
cfg.equihash.equihashParameterK = 3;
