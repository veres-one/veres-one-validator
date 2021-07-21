/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

require('../lib/config');

// a did reference contains an anchor tag `#`
const pattern =
 '^did:v1(:[a-z][a-z0-9]+)*:nym:(z[A-Za-z1-9]+)#(z[A-Za-z1-9]+)$';
// did:v1:nym:[48 base58 characters]#[48 base58 characters]
const minLength = 108;
// did:v1[:[16 character network ID]:nym:z[32 bytes of base58 + 2 byte header]
const maxLength = 126;

const schema = {
  title: 'Decentralized Identifier',
  description: 'A decentralized identifier.',
  type: 'string',
  pattern,
  minLength,
  maxLength,
  errors: {
    invalid: 'The decentralized identifier reference is invalid.',
    missing: 'Please provide a decentralized identifier reference.'
  }
};

module.exports = () => schema;
