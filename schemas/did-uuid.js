/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

require('../lib/config');

/* eslint-disable-next-line max-len */
const pattern = '^did:v1(:[a-z][a-z0-9]+)*:uuid:' +
  '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})' +
  '\/?(records|config)?$';
const minLength = 48; // did:v1:uuid:<UUID_VALUE>
const maxLength = 74; // minLength + :<16_CHARACTER_NETWORK_ID> + /records

const schema = {
  title: 'DID UUID',
  type: 'string',
  pattern,
  minLength,
  maxLength
};

module.exports = () => schema;
