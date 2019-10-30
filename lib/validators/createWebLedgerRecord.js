/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {util: {BedrockError}} = bedrock;
const helpers = require('./helpers');
const {VeresOneDidDoc} = require('did-veres-one');
const cfg = bedrock.config['veres-one-validator'];

module.exports = async ({
  basisBlockHeight, electorPool, ledgerNode, validatorInput,
  validatorParameterSet
}) => {
  // NOTE: did:v1:uuid: exception is for electorPool documents
  if(!validatorInput.record.id.startsWith('did:v1:uuid:')) {
    const result = await _validateDid({
      basisBlockHeight, ledgerNode, validatorInput, validatorParameterSet
    });
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

async function _validateDid({
  basisBlockHeight, ledgerNode, validatorInput, validatorParameterSet
}) {
  const didDocument = new VeresOneDidDoc({doc: validatorInput.record});
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

  const {service} = didDocument.toJSON();
  if(service) {
    let allowedServiceBaseUrl;
    try {
      ({allowedServiceBaseUrl} = await helpers.getValidatorParameterSet({
        basisBlockHeight, ledgerNode, validatorParameterSet
      }));
    } catch(e) {
      // let NotFoundError pass
      if(e.name !== 'NotFoundError') {
        throw e;
      }
    }

    if(!allowedServiceBaseUrl) {
      return {
        error: new BedrockError(
          'Invalid ledger configuration. allowedServiceBaseUrl is not defined.',
          'InvalidStateError', {
            basisBlockHeight,
            httpStatusCode: 400,
            public: true,
            validatorParameterSet,
          }),
        valid: false
      };
    }

    const result = helpers.validateService({allowedServiceBaseUrl, service});
    if(!result.valid) {
      return result;
    }
  }
  // success
  return {valid: true};
}
