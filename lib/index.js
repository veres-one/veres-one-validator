/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
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

bedrock.events.on('bedrock.start', () => {
  jsigs.use('jsonld', brDidClient.jsonld);
  equihashSigs.install(jsigs);

  brLedgerNode.use('VeresOneValidator2017', {
    type: 'validator',
    api: api
  });
});

const api = {};
module.exports = api;

api.mustValidate = (input, validatorConfig, options, callback) => {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  api.validateConfiguration(validatorConfig, err => {
    if(err) {
      return callback(err);
    }
    if(validatorConfig.validatorFilter &&
      !validatorConfig.validatorFilter.some(f =>
        f.type === 'ValidatorFilterByType' &&
        f.validatorFilterByType.includes(input.type))) {
      return callback(null, false);
    }
    callback(null, true);
  });
};

api.validateConfiguration = (validatorConfig, callback) =>
  validate('veres-one-validator.config', validatorConfig, callback);

api.validate = (input, validatorConfig, callback) => {
  async.auto({
    schema: callback => {
      let schemaId;
      let toValidate;
      if(input.type === 'CreateWebLedgerRecord') {
        schemaId = 'veres-one-validator.didDocument';
        toValidate = input.record;
      } else if(input.type === 'UpdateWebLedgerRecord') {
        schemaId = 'veres-one-validator.didDocumentPatch';
        toValidate = input.patch;
      }
      validate(schemaId, toValidate, callback);
    },
    proofs: ['schema', (results, callback) =>
      _validateProofs(input, callback)]
  }, err => callback(err));
};

function _validateProofs(input, callback) {
  if(input.type === 'CreateWebLedgerRecord') {
    // TODO: if DID type is `nym`, confirm public key fingerprint (for RSA)
    //   or public key itself (for Ed25519) matches
  }


  // TODO: require:
  //   1.a. A capability proof for `UpdateLedger` capabilityAction, i.e. an
  //     entity can only update the ledger if they have been granted the
  //     capability to do so,
  //   OR...
  //   1.b. A proof of work (EquihashProof2018)
  //   AND...
  //   2. A capability proof for `WriteDidDocument` capabilityAction, i.e.
  //     an entity can only write to a DidDocument (or create one) if they
  //     have been granted the capability to do so


  // FIXME: limit proof types
  /*if(!proofType.every(type => cfg.updateSignatureType.includes(type))) {
    return callback(new BedrockError(
      'Unsupported signature type.',
      'NotSupportedError', {
        httpStatusCode: 400,
        public: true,
        event,
        updateSignatureType,
      }));
  }*/

  // TODO: run jsigs.verify

  // TODO: check results to see if the required proofs passed


  // // TODO: fix up validation of signature and event (i.e. use "proof" and
  // // new data model)
  // const signature = {};
  // proofType.forEach(type => signature[type] = [].concat(event.signature)
  //   .filter(s => {
  //     if(s.type !== type) {
  //       return false;
  //     }
  //     if(type === 'LinkedDataSignature2015') {
  //       return s.creator === event.input[0].authenticationCredential[0].id;
  //     }
  //     if(type === 'EquihashProof2017') {
  //       return (s.equihashParameterN === cfg.equihash.equihashParameterN &&
  //         s.equihashParameterK === cfg.equihash.equihashParameterK);
  //     }
  //     // NOTE: this should never be reached
  //     return false;
  //   }));

  // if(!signature['LinkedDataSignature2015'].length) {
  //   return callback(new BedrockError(
  //     'A Linked Data Signature created with the proper key was not found.',
  //     'ValidationError', {
  //       httpStatusCode: 400,
  //       public: true,
  //       event,
  //       requiredCreator: event.input[0].authenticationCredential[0].id,
  //     }));
  // }
  // if(!signature['EquihashProof2017'].length) {
  //   return callback(new BedrockError(
  //     'An Equihash signature with the proper parameters was not found.',
  //     'ValidationError', {
  //       httpStatusCode: 400,
  //       public: true,
  //       event,
  //       requiredEquihashParams: cfg.equihash,
  //     }));
  // }

  // async.eachOf(signature, (sig, sigType, callback) => {
  //   const e = bedrock.util.clone(event);
  //   if(sigType === 'LinkedDataSignature2015') {
  //     // verify all signatures
  //     e.signature = sig;
  //     return _verifyLinkedData(e, (err, result) => {
  //       if(err) {
  //         return callback(err);
  //       }
  //       if(!result.verified) {
  //         return callback(new BedrockError(
  //           'LinkedData Signature(s) could not be verified.',
  //           'ValidationError', {
  //             httpStatusCode: 400,
  //             public: true,
  //             event,
  //             keyResults: result.keyResults
  //           }));
  //       }
  //       // success, do not return an error
  //       callback();
  //     });
  //   }
  //   if(sigType === 'EquihashProof2017') {
  //     // even if there are multiple proofs, only one needs to be verified
  //     e.signature = sig[0];
  //     return equihashSigs.verify(e, (err, result) => {
  //       if(err) {
  //         return callback(err);
  //       }
  //       if(!result) {
  //         return callback(new BedrockError(
  //           'Equihash Signature could not be verified.',
  //           'ValidationError', {
  //             httpStatusCode: 400,
  //             public: true,
  //             event
  //           }));
  //       }
  //       // success, do not return an error
  //       callback();
  //     });
  //   }
  //   // NOTE: this callback is for safety and *should* never be reached
  //   callback(new BedrockError(
  //     'Unsupported signature type.',
  //     'OperationError', {
  //       httpStatusCode: 400,
  //       public: true,
  //       event,
  //     }));
  // }, err => callback(err));
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
