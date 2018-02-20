/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const constants = bedrock.config.constants;
const brLedgerNode = require('bedrock-ledger-node');
const didv1 = require('did-veres-one');
const jsigs = require('jsonld-signatures')();
const equihashSigs = require('equihash-signature');
const brDidClient = require('bedrock-did-client');
const validate = require('bedrock-validation').validate;
const BedrockError = bedrock.util.BedrockError;
require('veres-one-context');

require('./config');
const cfg = bedrock.config['veres-one-validator'];

let cryptonymDidRegex;

bedrock.events.on('bedrock.start', () => {
  jsigs.use('jsonld', brDidClient.jsonld);
  equihashSigs.install(jsigs);

  brLedgerNode.use('VeresOneValidator2017', {
    type: 'validator',
    api: api
  });

  if(cfg.environment === 'live') {
    cryptonymDidRegex = /^did\:v1\:nym\:.*/;
  } else {
    cryptonymDidRegex = /^did\:v1\:test\:nym\:.*/;
  }
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

api.validateConfiguration = (validatorConfig, options, callback) => {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  validate('veres-one-validator.config', validatorConfig, callback);
};

api.validate = (input, validatorConfig, options, callback) => {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  const {ledgerNode = null} = options;
  if(!ledgerNode) {
    return callback(new TypeError(
      '"options.ledgerNode" must be a LedgerNode instance.'));
  }

  // TODO: this validator also needs to handle and input with
  // a type of `WebLedgerConfiguration`... which will need to be signed
  // according to the validator config (use approvedSigners)... and also
  // require the ledgerConfiguration to include a `capabilityRoot` for now

  async.auto({
    operationSchema: callback => {
      validate('veres-one-validator.operation', input, callback);
    },
    recordSchema: ['operationSchema', (results, callback) => {
      let schemaId;
      let toValidate;
      if(input.type === 'CreateWebLedgerRecord') {
        schemaId = 'veres-one-validator.didDocument';
        toValidate = input.record;
      } else if(input.type === 'UpdateWebLedgerRecord') {
        return callback(new Error('Not implemented'));
        /*schemaId = 'veres-one-validator.didDocumentPatch';
        toValidate = input.patch;*/
      }
      validate(schemaId, toValidate, callback);
    }],
    nymCheck: ['recordSchema', (results, callback) => {
      // if DID is not a cryptonym, skip this check
      const didDocument = input.record;
      const did = didDocument.id;
      if(!_isCryptonymDid(did)) {
        return callback();
      }
      _validateCryptonymDid(didDocument, callback);
    }],
    proofs: ['nymCheck', (results, callback) =>
      _validateProofs(input, ledgerNode, callback)]
  }, err => callback(err));
};

function _validateCryptonymDid(didDocument, callback) {
  // FIXME: make above schema handle this check automatically in `nym` case
  if(!didDocument.authentication) {
    return callback(new BedrockError(
      '"authentication" must be present to register cryptonym DID ' +
      'Documents.', 'ValidationError', {
        httpStatusCode: 400,
        public: true,
        didDocument
      }));
  }

  // FIXME: enforce a single authentication key to start, so there is no
  // ambiguity over which key to use to generate the cryptonym... OR
  // check each authentication key for a match
  const key = didDocument.authentication[0].publicKey;

  // support `publicKeyPem` or `publicKeyBase58` authentication key
  // formats to produce cryptonyms
  let did;
  if('publicKeyPem' in key &&
    bedrock.jsonld.hasValue(key, 'type', 'RsaVerificationKey2018')) {
    did = didv1.createCryptonymDid({
      publicKey: key.publicKeyPem,
      encoding: 'pem',
      env: cfg.environment
    });
  } else if('publicKeyBase58' in key &&
    bedrock.jsonld.hasValue(key, 'type', 'Ed25519VerificationKey2018')) {
    did = didv1.createCryptonymDid({
      publicKey: key.publicKeyBase58,
      encoding: 'base58',
      env: cfg.environment
    });
  } else {
    // FIXME: make above schema handle this check
    return callback(new BedrockError(
      'Cryptonym DIDs can only be created from an "RsaVerificationKey2018" ' +
      'key with a "publicKeyPem" encoding or an "Ed25519VerificationKey2018" ' +
      'key with a "publicKeyBase58" encoding.', 'ValidationError', {
        httpStatusCode: 400,
        public: true,
        publicKey: key
      }));
  }

  if(didDocument.id !== did) {
    return callback(new BedrockError(
      'The DID does not match the cryptonym generated from a public key ' +
      'referenced in "authentication" application suite in the DID Document.',
      'ValidationError', {
        httpStatusCode: 400,
        public: true,
        didDocument
      }));
  }

  callback();
}

function _validateProofs(input, ledgerNode, callback) {
  /* Proofs enable:

    1. The authorization of the request:
      a. A capability proof for `AuthorizeRequest` capabilityAction, i.e.
      an entity's submitted ledger operation will only be authorized if the
      entity has been given a capability invocation from an accelerator that
      authorized it.

      OR...

      b. A proof of work (EquihashProof2018), i.e. an entity's submitted
      ledger operation will only be authorized if they have expended enough
      resources to prevent a Sybil attack.

    AND...

    2. A capability proof for the `RegisterDid` or `UpdateDidDocument`
    capabilityAction, i.e. an entity can only create/patch a particular
    DidDocument if they have been granted the capability to do so.

    Pseudo code explaining this:

    if(hasPow(proof)) {
      authorizeRequest();
    } else if(proof.authorizeRequest) {
      authorizeRequest();
    } else {
      throw Error('Not authorized');
    }

    if(proof.registerDid) {
      registerDid();
    } else if(proof.updateDidDocument) {
      updateDidDocument();
    }
  */

  // ensure a valid proof combination has been given
  if(!_checkProofCombination(input.proof)) {
    return callback(new BedrockError(
      'Insufficient proof provided on operation.',
      'PermissionDenied', {
        httpStatusCode: 400,
        public: true,
        operation: input
      }));
  }

  // verify all proofs, if any fail, reject the operation, even if not relevant
  jsigs.verify(input, {
    documentLoader: _createDidDocumentLoader(ledgerNode, brDidClient.jsonld),
    // must allow for old operations to pass validation
    checkTimestamp: false
  }, callback);

  // FIXME: Need to check to see if `invocationTarget` is specified ... and if
  // so, it needs to be the same as the DID capability document OR, the
  // granter of the capability needs to be the `capabilityRoot` in the
  // latest config for the ledger
}

function _checkProofCombination(proofs) {
  // valid combinations:
  // 1. EquihashProof2018, (Rsa/Ed25519 + RegisterDid)
  // 2. (Rsa/Ed25519 + AuthorizeRequest), (Rsa/Ed25519 + RegisterDid)

  // TODO: support UpdateDidDocument capabilityAction

  const types = {};
  proofs.forEach(proof => {
    types[proof.type] = proof.capabilityAction || null;
  });

  if(types.EquihashProof2018) {
    if(types.RsaSignature2018 === 'RegisterDid' ||
      types.Ed25519Signature2018 === 'RegisterDid') {
      return true;
    }
  }

  if(types.RsaSignature2018 === 'AuthorizeRequest' ||
    types.Ed25519Signature2018 === 'AuthorizeRequest') {
    if(types.RsaSignature2018 === 'RegisterDid' ||
      types.Ed25519Signature2018 === 'RegisterDid') {
      return true;
    }
  }

  return false;
}

function _isCryptonymDid(did) {
  return cryptonymDidRegex.test(did);
}

function _createDidDocumentLoader(ledgerNode, jsonld) {
  // delimiters for a DID URL
  const splitRegex = /[;|\/|\?|#]/;
  const oldDocumentLoader = jsonld.documentLoader;
  return function(url, callback) {
    if(!url.startsWith('did:')) {
      return oldDocumentLoader(url, callback);
    }
    const [did] = url.split(splitRegex);
    // try to get DID from state machine
    ledgerNode.stateMachine.get(did, {}, (err, result) => {
      if(err) {
        return callback(err);
      }
      const didDocument = result.object;
      if(!url.includes('#')) {
        return callback(null, {
          contextUrl: null,
          document: didDocument,
          documentUrl: url
        });
      }
      // try to find the specific object in the DID document
      _pluckDidNode(did, url, didDocument, jsonld, (err, result) => {
        if(err) {
          return callback(err);
        }
        callback(null, {
          contextUrl: null,
          document: result,
          documentUrl: url
        });
      });
    });
  };
}

function _pluckDidNode(did, target, didDocument, jsonld, callback) {
  // flatten to isolate target
  jsonld.flatten(didDocument, (err, flattened) => {
    if(err) {
      return callback(err);
    }

    // filter out non-DID nodes and find target
    let found = false;
    const filtered = [];
    for(const node of flattened) {
      const id = node['@id'];
      if(id !== did) {
        filtered.push(node);
        if(id === target) {
          found = true;
        }
      }
    }

    // target not found
    if(!found) {
      err = new Error('Not Found');
      err.httpStatusCode = 404;
      err.status = 404;
      return callback(err);
    }

    // frame target
    jsonld.frame(
      filtered, {'@context': constants.VERES_ONE_CONTEXT_URL, id: target},
      {embed: '@always'}, (err, framed) => {
        if(err) {
          return callback(err);
        }
        const doc = Object.assign(
          {'@context': constants.VERES_ONE_CONTEXT_URL},
          framed['@graph'][0]);
        callback(null, doc);
      });
  });
}
