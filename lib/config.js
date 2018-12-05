/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const config = require('bedrock').config;
const path = require('path');

config['veres-one-validator'] = {};
const cfg = config['veres-one-validator'];

cfg.updateSignatureType = ['RsaSignature2018', 'Ed25519Signature2018'];

// DIDs are created and validated in "dev" mode
cfg.environment = 'dev';

// common validation schemas
config.validation.schema.paths.push(
  path.join(__dirname, '..', 'schemas')
);
