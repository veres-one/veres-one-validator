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
  validate('ledger-validator-multiproof', validatorConfig, callback);

api.validateEvent = (event, validatorConfig, callback) => {
  async.auto({
    schema: callback => callback(),
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
  proofType.forEach(type => signature[type] = event.signature
    .filter(s => s.type === type));

  const hasOneOfEach = proofType.every(type => signature[type].length !== 0);
  if(!hasOneOfEach) {
    return callback(new BedrockError(
      'The signature requirements have not been met.',
      'ValidationError', {
        httpStatusCode: 400,
        public: true,
        event,
        updateSignatureType,
      }));
  }

  async.each(signature, (s, callback) => {
    const sigZero = s[0];
    const e = bedrock.util.clone(event);
    e.signature = sigZero;
    if(sigZero.type === 'LinkedDataSignature2015') {
      return _verifyLinkedData(e, (err, result) => {
        if(err) {
          return callback(err);
        }
        if(!result.verified) {
          callback(new BedrockError(
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
    if(sigZero.type === 'EquihashProof2017') {
      return _verifyEquihash(e, (err, result) => {
        if(err) {
          return callback(err);
        }
        if(!result) {
          callback(new BedrockError(
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

function _verifyEquihash(doc, callback) {
  if(!(doc.signature.equihashParameterN === cfg.equihash.equihashParameterN &&
    doc.signature.equihashParameterK === cfg.equihash.equihashParameterK)) {
    return callback(new BedrockError(
      'The Equihash proof does not have the proper parameters.',
      'ValidationError', {
        httpStatusCode: 400,
        public: true,
        requiredEquihashParams: cfg.equihash,
        signature: doc.signature,
      }));
  }
  equihashSigs.verify(doc, callback);
}
