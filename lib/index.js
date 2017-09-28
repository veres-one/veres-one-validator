/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const constants = bedrock.config.constants;
const brLedgerNode = require('bedrock-ledger-node');
const jsigs = require('jsonld-signatures')();
const equihashSigs = require('equihash-signature');
const brDidClient = require('bedrock-did-client');
const validate = require('bedrock-validation').validate;
const BedrockError = bedrock.util.BedrockError;
require('veres-one-context');

require('./config');
const cfg = bedrock.config['veres-one-validator'];

jsigs.use('jsonld', brDidClient.jsonld);
equihashSigs.use('jsonld', brDidClient.jsonld);

bedrock.events.on('bedrock.start', () => {
  brLedgerNode.use('VeresOneValidator2017', {
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
  validate('veres-one-validator.config', validatorConfig, callback);

api.validateEvent = (event, validatorConfig, callback) => {
  const didDocument = event.input[0];
  async.auto({
    schema: callback => validate(
      'veres-one-validator.didDocument', didDocument, callback),
    signatures: ['schema', (results, callback) =>
      _validateSignatures(event, callback)]
  }, err => callback(err));
};

function _validateSignatures(event, callback) {
  // TODO: implement other operations
  const supportedOperation = ['Create'];
  if(!supportedOperation.includes(event.operation)) {
    return callback(new BedrockError(
      'Unsupported DID document operation.',
      'NotSupportedError', {
        httpStatusCode: 400,
        public: true,
        event,
        supportedOperation,
      }));
  }

  const capability = event.input[0].authorizationCapability[0];
  if(capability.permission !== 'UpdateDidDocument') {
    return callback(new BedrockError(
      'The required `UpdateDidDocument` permission has not been specified.',
      'DataError', {
        httpStatusCode: 400,
        public: true,
        event
      }));
  }

  const proofType = capability.permittedProofType.map(type => type.proofType);
  const updateSignatureType = cfg.updateSignatureType;

  if(!updateSignatureType.every(type => proofType.includes(type))) {
    return callback(new BedrockError(
      'The document does not contain the required signature types.',
      'DataError', {
        httpStatusCode: 400,
        public: true,
        event,
        updateSignatureType
      }));
  }

  if(!proofType.every(type => cfg.updateSignatureType.includes(type))) {
    return callback(new BedrockError(
      'Unsupported signature type.',
      'NotSupportedError', {
        httpStatusCode: 400,
        public: true,
        event,
        updateSignatureType,
      }));
  }

  const signature = {};
  proofType.forEach(type => signature[type] = [].concat(event.signature)
    .filter(s => {
      if(s.type !== type) {
        return false;
      }
      if(type === 'LinkedDataSignature2015') {
        return s.creator === event.input[0].authenticationCredential[0].id;
      }
      if(type === 'EquihashProof2017') {
        return (s.equihashParameterN === cfg.equihash.equihashParameterN &&
          s.equihashParameterK === cfg.equihash.equihashParameterK);
      }
      // NOTE: this should never be reached
      return false;
    }));

  if(!signature['LinkedDataSignature2015'].length) {
    return callback(new BedrockError(
      'A Linked Data Signature created with the proper key was not found.',
      'ValidationError', {
        httpStatusCode: 400,
        public: true,
        event,
        requiredCreator: event.input[0].authenticationCredential[0].id,
      }));
  }
  if(!signature['EquihashProof2017'].length) {
    return callback(new BedrockError(
      'An Equihash signature with the proper parameters was not found.',
      'ValidationError', {
        httpStatusCode: 400,
        public: true,
        event,
        requiredEquihashParams: cfg.equihash,
      }));
  }

  async.eachOf(signature, (sig, sigType, callback) => {
    const e = bedrock.util.clone(event);
    if(sigType === 'LinkedDataSignature2015') {
      // verify all signatures
      e.signature = sig;
      return _verifyLinkedData(e, (err, result) => {
        if(err) {
          return callback(err);
        }
        if(!result.verified) {
          return callback(new BedrockError(
            'LinkedData Signature(s) could not be verified.',
            'ValidationError', {
              httpStatusCode: 400,
              public: true,
              event,
              keyResults: result.keyResults
            }));
        }
        // success, do not return an error
        callback();
      });
    }
    if(sigType === 'EquihashProof2017') {
      // even if there are multiple proofs, only one needs to be verified
      e.signature = sig[0];
      return equihashSigs.verify(e, (err, result) => {
        if(err) {
          return callback(err);
        }
        if(!result) {
          return callback(new BedrockError(
            'Equihash Signature could not be verified.',
            'ValidationError', {
              httpStatusCode: 400,
              public: true,
              event
            }));
        }
        // success, do not return an error
        callback();
      });
    }
    // NOTE: this callback is for safety and *should* never be reached
    callback(new BedrockError(
      'Unsupported signature type.',
      'OperationError', {
        httpStatusCode: 400,
        public: true,
        event,
      }));
  }, err => callback(err));
}

function _verifyLinkedData(doc, callback) {
  let cacheKey;
  jsigs.verify(doc, {
    getPublicKey: _getPublicKey,
    getPublicKeyOwner: _getPublicKeyOwner
  }, callback);

  function _getPublicKey(keyId, options, callback) {
    const publicKey = doc.input[0].authenticationCredential
      .filter(k => k.id === keyId);
    if(publicKey.length !== 1) {
      return callback(new BedrockError(
        'Public key not found.',
        'NotFoundError', {
          httpStatusCode: 404,
          public: true,
          keyId,
        }));
    }

    const key = publicKey[0];
    if(!key['@context']) {
      key['@context'] = doc.input[0]['@context'];
    }
    cacheKey = key;
    callback(null, key);
  } // end _getPublicKey

  function _getPublicKeyOwner(owner, options, callback) {
    if(owner !== doc.input[0].id) {
      return callback(new BedrockError(
        'Owner document not found.',
        'NotFoundError', {
          httpStatusCode: 404,
          public: true,
          owner,
        }));
    }
    const identity = {
      '@context': constants.IDENTITY_CONTEXT_V1_URL,
      type: ['Identity'],
      id: owner,
      // publicKey: cacheKey,
      authenticationCredential: cacheKey,
    };
    callback(null, identity);
  } // end _getPublicKeyOwner
} // end _verifyLinkedData
