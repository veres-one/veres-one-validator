/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {util: {BedrockError}} = bedrock;
const helpers = require('./helpers');
const {VeresOneDidDoc} = require('did-veres-one');
const cfg = bedrock.config['veres-one-validator'];

module.exports = async ({electorPool, validatorInput, ledgerNode}) => {
  // NOTE: urn:uuid exception is for electorPool documents
  if(!validatorInput.record.id.startsWith('urn:uuid:')) {
    const result = await _validateDid(validatorInput);
    if(!result.valid) {
      return result;
    }
  }

  let err;
  try {
    await ledgerNode.records.get({recordId: validatorInput.record.id});
  } catch(e) {
    err = e;
  }
  if(!err) {
    const error = new BedrockError(
      'Duplicate DID Document.', 'DuplicateError', {
        httpStatusCode: 400,
        public: true,
        operation: validatorInput
      });
    return {error, valid: false};
  }
  // if state machine does not have DID and it is to be created (i.e.
  // the record matches the DID), use it as the DID Document
  if(err.name !== 'NotFoundError') {
    return {error: err, valid: false};
  }

  // validate a new electorPool document
  if(electorPool && electorPool === validatorInput.record.id) {
    const {electorPool, maximumElectorCount} = validatorInput.record;
    return helpers.validateElectorPoolElectors(
      {electorPool, ledgerNode, maximumElectorCount});
  }
  // success
  return {valid: true};
};

async function _validateDid(input) {
  const didDocument = new VeresOneDidDoc({doc: input.record});
  let result = await didDocument.validateDid({mode: cfg.environment});
  if(!result.valid) {
    return {
      error: new BedrockError(
        'Error validating DID.', 'ValidationError', {
          httpStatusCode: 400,
          public: true,
        }, result.error),
      valid: false
    };
  }
  result = await didDocument.validateMethodIds();
  if(!result.valid) {
    return {
      error: new BedrockError(
        'Error validating DID.', 'ValidationError', {
          httpStatusCode: 400,
          public: true,
        }, result.error),
      valid: false
    };
  }
  // success
  return {valid: true};
}
