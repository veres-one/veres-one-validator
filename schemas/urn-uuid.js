/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');

const pattern = "^urn:uuid:([-_A-Za-z0-9.]+)$";

const schema = {
  title: 'URN UUID',
  type: 'string',
  pattern,
};

module.exports = extend => {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
