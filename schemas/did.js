/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');

const schema = {
  required: true,
  title: 'Decentralized Identifier',
  description: 'A decentralized identifier.',
  type: 'string',
  // FIXME: review regex pattern for spec conformance`
  pattern: "^(did:v1:|did:v1:testnet:|did:)([A-Za-z0-9.-]+)$",
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
