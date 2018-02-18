/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const config = require('bedrock').config;
const path = require('path');

config['veres-one-validator'] = {};
const cfg = config['veres-one-validator'];

cfg.equihash = {
  equihashParameterN: 128,
  equihashParameterK: 7
};

cfg.updateSignatureType = ['RsaSignature2018', 'EquihashProof2018'];

// common validation schemas
config.validation.schema.paths.push(
  path.join(__dirname, '..', 'schemas')
);
