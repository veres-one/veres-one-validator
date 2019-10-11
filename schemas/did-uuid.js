/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');

/* eslint-disable-next-line max-len */
const pattern = '^did:v1:uuid:([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4[a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12})$';

const schema = {
  title: 'DID UUID',
  type: 'string',
  pattern,
};

module.exports = extend => {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
