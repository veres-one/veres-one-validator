/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

require('../lib/config');

const pattern = '^did:v1(:[a-z][a-z0-9]+)*:nym:(z[A-Za-z1-9]+)$';
// did:v1:nym:[48 base58 characters (z + 2 byte multicodec header + 32 bytes]
const minLength = 59;
// did:v1:[16 character network ID]:nym:[48 base58 characters]
const maxLength = 77;

const schema = {
  title: 'Decentralized Identifier',
  description: 'A decentralized identifier.',
  type: 'string',
  pattern,
  minLength,
  maxLength,
  errors: {
    invalid: 'The decentralized identifier is invalid.',
    missing: 'Please enter a decentralized identifier.'
  }
};

module.exports = () => schema;
