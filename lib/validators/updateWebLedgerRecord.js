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

  // FIXME: can we do better than testing for particular properties?
  // could there be a `record.type`?
  if(patched.electorPool) {
    // electorPool document
    const result = validate('veres-one-validator.electorPoolDocument', patched);
    if(!result.valid) {
      return result;
    }
  } else {
    // didDocument
    const result = validate('veres-one-validator.didDocument', patched);
    if(!result.valid) {
      return result;
    }

    // ensure key IDs are valid
    const didDoc = new VeresOneDidDoc({doc: patched});
    try {
      didDoc.validateKeyIds();
    } catch(e) {
      const error = new BedrockError(
        `Error validating DID document: ${e.message}`, 'ValidationError', {
          httpStatusCode: 400,
          public: true,
        }, e);
      return {
        valid: false,
        error
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
