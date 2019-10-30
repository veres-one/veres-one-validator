/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {util: {BedrockError}} = bedrock;
const helpers = require('./helpers');
const jsonpatch = require('fast-json-patch');
const {validate} = require('bedrock-validation');
const {VeresOneDidDoc} = require('did-veres-one');
const cfg = bedrock.config['veres-one-validator'];

module.exports = async ({electorPool, validatorInput, ledgerNode}) => {
  const {recordPatch} = validatorInput;
  const record = await ledgerNode.records.get({recordId: recordPatch.target});
  const {sequence} = recordPatch;
  const {sequence: expectedSequence = 0} = record.meta;
  if(sequence !== expectedSequence) {
    const error = new BedrockError(
      'The given sequence number does not match the current DID ' +
      'Document record.',
      'ValidationError', {
        httpStatusCode: 409,
        public: true,
        sequence,
        expectedSequence
      });
    return {error, valid: false};
  }
  const {patch} = recordPatch;
  const {record: didDocument} = record;
  const errors = jsonpatch.validate(patch, didDocument);
  if(errors) {
    const error = new BedrockError(
      'The given JSON patch is invalid.', 'ValidationError', {
        httpStatusCode: 400,
        public: true,
        patch,
        errors
      });
    return {error, valid: false};
  }

  // apply patch and compact
  const patched = jsonpatch.applyPatch(didDocument, patch).newDocument;

  if(patched.type === 'ElectorPool') {
    // electorPool document
    const result = validate('veres-one-validator.electorPoolDocument', patched);
    if(!result.valid) {
      return result;
    }
  } else if(patched.type === 'ValidationParameterSet') {
    // validationRule document
    const result = validate(
      'veres-one-validator.validationParameterSet', patched);
    if(!result.valid) {
      return result;
    }
  } else {
    // didDocument
    let result = validate('veres-one-validator.didDocument', patched);
    if(!result.valid) {
      return result;
    }
    const patchedDidDocument = new VeresOneDidDoc({doc: patched});
    result = await patchedDidDocument.validateDid({mode: cfg.environment});
    if(!result.valid) {
      return {
        error: BedrockError(
          'Error validating DID.', 'ValidationError', {
            httpStatusCode: 400,
            public: true,
          }, result.error),
        valid: false
      };
    }
    // ensure method IDs are valid
    result = await patchedDidDocument.validateMethodIds();
    if(!result.valid) {
      return {
        error: BedrockError(
          'Error validating DID.', 'ValidationError', {
            httpStatusCode: 400,
            public: true,
          }, result.error),
        valid: false
      };
    }
  }

  // validate a patched electorPool document
  if(electorPool && electorPool === patched.id) {
    const {electorPool, maximumElectorCount} = patched;
    return helpers.validateElectorPoolElectors(
      {electorPool, ledgerNode, maximumElectorCount});
  }
  // success
  return {valid: true};
};
