/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const brLedgerNode = require('bedrock-ledger-node');
const jsigs = require('jsonld-signatures')();
const equihashSigs = require('equihash-signature');
const brDidClient = require('bedrock-did-client');
const validate = require('bedrock-validation').validate;
const BedrockError = bedrock.util.BedrockError;

require('./config');

jsigs.use('jsonld', brDidClient.jsonld);

bedrock.events.on('bedrock.start', () => {
  brLedgerNode.use('MultiproofValidator2017', {
    type: 'validator',
    api: api
  });
});

const api = {};
// NOTE: only exported for tests
module.exports = api;

api.mustValidateEvent = (event, validatorConfig, options, callback) => {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  api.validateConfiguration(validatorConfig, err => {
    if(err) {
      return callback(err);
    }
    if(validatorConfig.eventFilter && !validatorConfig.eventFilter.some(f =>
      f.type === 'EventTypeFilter' && f.eventType.includes(event.type))) {
      return callback(null, false);
    }
    callback(null, true);
  });
};

api.validateConfiguration = (validatorConfig, callback) =>
  validate('ledger-validator-multiproof', validatorConfig, callback);

api.validateEvent = (event, validatorConfig, callback) => {
  // determine which proof types should be checked

  // FIXME: Implement
  callback();
};
