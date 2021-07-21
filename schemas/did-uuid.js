/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

require('../lib/config');

/* eslint-disable-next-line max-len */
const pattern = `^did:v1(:[a-z][a-z0-9]+)*:uuid:([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$`;
const minLength = 49; // did:v1:uuid:<UUID_VALUE>
const maxLength = 66; // minLength + :<16_CHARACTER_NETWORK_ID>

const schema = {
  title: 'DID UUID',
  type: 'string',
  pattern,
  minLength,
  maxLength
};

module.exports = () => schema;
