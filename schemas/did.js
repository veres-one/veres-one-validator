/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {maxLength} = require('../lib/constants');
const {config} = bedrock;
require('../lib/config');

const cfg = config['veres-one-validator'];

const pattern = cfg.environment === 'test' ?
  '^(did\:v1\:test\:nym\:)([-_A-Za-z0-9.]+)$' :
  '^(did\:v1\:nym\:)([-_A-Za-z0-9.]+)$';

const schema = {
  title: 'Decentralized Identifier',
  description: 'A decentralized identifier.',
  type: 'string',
  pattern,
  minLength: cfg.environment === 'test' ? 17 : 12,
  maxLength,
  errors: {
    invalid: 'The decentralized identifier is invalid.',
    missing: 'Please enter a decentralized identifier.'
  }
};

module.exports = () => schema;
