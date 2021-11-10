/*!
 * Copyright (c) 2017-2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

require('../lib/config');

const patterns = {
  uuid: '^did:v1(:[a-z][a-z0-9]+)*:uuid:' +
    '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})',
  nym: '^did:v1(:[a-z][a-z0-9]+)*:nym:(z[A-Za-z1-9]+)'
};

const getPath = path => {
  if(path) {
    return `(${patterns.uuid}|${patterns.nym})\/${path}$`;
  }
  return `(${patterns.uuid}|${patterns.nym})$`;
};

module.exports.path = ({path = ''} = {}) => ({
  title: 'DID with Path',
  type: 'string',
  pattern: getPath(path),
  // did:v1:uuid:<UUID_VALUE>
  minLength: 48,
  // did:v1:[16 character network ID]:nym:[48 base58 characters]
  maxLength: 77

});

module.exports.uuid = () => ({
  title: 'DID UUID',
  type: 'string',
  pattern: patterns.uuid + '$',
  // did:v1:uuid:<UUID_VALUE>
  minLength: 48,
  // minLength + :<16_CHARACTER_NETWORK_ID> + /records
  maxLength: 74
});

/**
 * A DID with no fragments or references attached at the end.
 *
 * @returns {object} A validator for `did:v1:nym`
 */
module.exports.nym = () => ({
  title: 'Decentralized Identifier',
  description: 'A decentralized identifier.',
  type: 'string',
  pattern: patterns.nym + '$',
  // did:v1:nym:[48 base58 characters (z + 2 byte multicodec header + 32 bytes]
  minLength: 59,
  // did:v1:[16 character network ID]:nym:[48 base58 characters]
  maxLength: 77,
  errors: {
    invalid: 'The decentralized identifier is invalid.',
    missing: 'Please enter a decentralized identifier.'
  }
});

/**
 * A DID reference is a DID followed by a fragment.
 * The fragment should be a reference to a publicKey in a didDocument.
 *
 * @returns {object} - A validator for a DID Doc reference.
 */
module.exports.reference = () => ({
  title: 'Decentralized Identifier',
  description: 'A decentralized identifier.',
  type: 'string',
  // a did reference contains an anchor tag `#`
  pattern: patterns.nym + '#(z[A-Za-z1-9]+)$',
  // did:v1:nym:[48 base58 characters]#[48 base58 characters]
  minLength: 108,
  // did:v1[:[16 character network ID]:nym:z[32 bytes of base58 + 2 byte header]
  maxLength: 126,
  errors: {
    invalid: 'The decentralized identifier reference is invalid.',
    missing: 'Please provide a decentralized identifier reference.'
  }
});
