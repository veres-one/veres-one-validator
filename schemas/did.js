/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config} = bedrock;
require('../lib/config');

const cfg = config['veres-one-validator'];

const pattern = cfg.environment === 'live' ?
  "^(did\:v1\:nym\:|did\:v1\:uuid\:)([-_A-Za-z0-9.]+)$" :
  "^(did\:v1\:test\:nym\:|did\:v1\:test\:uuid\:)([-_A-Za-z0-9.]+)$";

const schema = {
  title: 'Decentralized Identifier',
  description: 'A decentralized identifier.',
  type: 'string',
  pattern,
  errors: {
    invalid: 'The decentralized identifier is invalid.',
    missing: 'Please enter a decentralized identifier.'
  }
};

module.exports = extend => {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
