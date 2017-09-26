/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
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

cfg.updateSignatureType = ['LinkedDataSignature2015', 'EquihashProof2017'];

// common validation schemas
config.validation.schema.paths.push(
  path.join(__dirname, '..', 'schemas')
);
