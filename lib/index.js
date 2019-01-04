/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const _ = require('lodash');
const bedrock = require('bedrock');
const {config: {constants}, util: {BedrockError}} = bedrock;
const brLedgerNode = require('bedrock-ledger-node');
const brLedgerUtils = require('bedrock-ledger-utils');
const jsigs = require('jsonld-signatures');
const jsonpatch = require('fast-json-patch');
const {validate} = require('bedrock-validation');
require('bedrock-ledger-context');
require('bedrock-veres-one-context');
const {VeresOneDidDoc} = require('did-veres-one');

require('./config');
const cfg = bedrock.config['veres-one-validator'];

const api = {};
module.exports = api;

bedrock.events.on('bedrock.start', () => {
  brLedgerNode.use('VeresOneValidator2017', {api, type: 'validator'});
});

api.mustValidate = async ({validatorConfig, validatorInput}) => {
  const result = await api.validateConfiguration({validatorConfig});
  if(!result.valid) {
    throw result.error;
  }
  if(validatorInput.type === 'WebLedgerConfiguration') {
    return true;
  }
  if(validatorConfig.validatorFilter &&
    !validatorConfig.validatorFilter.some(f =>
      f.type === 'ValidatorFilterByType' &&
      f.validatorFilterByType.includes(validatorInput.type))) {
    return false;
  }
  return true;
};

api.validateConfiguration = async ({validatorConfig}) => {
  return validate('veres-one-validator.config', validatorConfig);
};

api.validate = async (
  {ledgerConfig = {}, ledgerNode, validatorInput}) => {
  if(!ledgerNode) {
    throw new TypeError('"ledgerNode" must be a LedgerNode instance.');
  }

  if(validatorInput.type === 'WebLedgerConfiguration') {
    return _validateWebLedgerConfiguration({ledgerNode, validatorInput});
  }

  let result = validate('veres-one-validator.operation', validatorInput);
  if(!result.valid) {
    return result;
  }

  result = await _validateProofs({ledgerNode, validatorInput});
  if(!result.valid) {
    return result;
  }

  const electorPool = _.get(ledgerConfig, 'electorSelectionMethod.electorPool');

  if(validatorInput.type === 'CreateWebLedgerRecord') {
    return _validateCreateOperation({electorPool, validatorInput, ledgerNode});
  }
  // must be an UpdateWebLedgerRecord op
  return _validateUpdateOperation({electorPool, ledgerNode, validatorInput});
};

async function _validateCreateOperation(
  {electorPool, validatorInput, ledgerNode}) {

  // NOTE: urn:uuid exception is for electorPool documents
  if(!validatorInput.record.id.startsWith('urn:uuid:')) {
    try {
      await _validateDid(validatorInput);
    } catch(error) {
      return {error, valid: false};
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
    return _validateElectorPoolElectors(
      {electorPool, ledgerNode, maximumElectorCount});
  }
  // success
  return {valid: true};
}

async function _validateElectorPoolElectors(
  {electorPool, ledgerNode, maximumElectorCount}) {
  const {id: ledgerNodeId} = ledgerNode;
  let result;
  try {
    result = await brLedgerUtils.dereferenceElectorPool(
      {electorPool, ledgerNode});
  } catch(e) {
    const error = new BedrockError(
      'An error occurred while dereferencing elector pool electors.',
      e.name, {electorPool, ledgerNodeId}, e);
    return {error, valid: false};
  }
  const electors = Object.values(result);
  const electorCount = Math.min(maximumElectorCount, electors.length);
  const electorIds = [];
  let guarantorElectorCount = 0;
  // collect information about the electors
  for(const elector of electors) {
    electorIds.push(elector.id);
    if(elector.type.includes('Continuity2017GuarantorElector')) {
      guarantorElectorCount++;
    }
  }
  // ensure that there are no duplicate electors
  if(_.uniq(electorIds).length !== electorIds.length) {
    const error = new BedrockError(
      'Duplicate electors detected in the elector pool document.',
      'SyntaxError', {electorPool, ledgerNodeId});
    return {error, valid: false};
  }
  // ensure that an adequate number (f+1) of guarantor electors are defined
  const targetGuarantorElectorCount = _computeTargetElectorCount(
    {coefficient: 1, originalCount: electorCount});
  if(guarantorElectorCount < targetGuarantorElectorCount) {
    const error = new BedrockError(
      'An insufficient number of guarantor electors are defined in the ' +
      'elector pool document.', 'SyntaxError', {
        electorPool, guarantorElectorCount, ledgerNodeId,
        targetGuarantorElectorCount
      });
    return {error, valid: false};
  }
  // success
  return {valid: true};
}

async function _validateUpdateOperation(
  {electorPool, validatorInput, ledgerNode}) {
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
    return _validateElectorPoolElectors(
      {electorPool, ledgerNode, maximumElectorCount});
  }
  // success
  return {valid: true};
}

// FIXME: support remove operation
// async function _validateRemoveOperation(input) {}

async function _validateDid(input) {
  const didDocument = new VeresOneDidDoc({doc: input.record});
  try {
    await didDocument.validateDid({env: cfg.environment});
    await didDocument.validateKeyIds();
  } catch(e) {
    throw new BedrockError(
      `Error validating DID: ${e.message}`, 'ValidationError', {
        httpStatusCode: 400,
        public: true,
      }, e);
  }
}

async function _validateProofs({ledgerNode, validatorInput}) {
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
    DidDocument if they have been delegated the capability to do so.

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
  if(!_checkProofCombination(validatorInput.proof)) {
    const error = new BedrockError(
      'Insufficient proof provided on operation.',
      'NotAllowedError', {
        httpStatusCode: 400,
        public: true,
        operation: validatorInput
      });
    return {error, valid: false};
  }
  let record;
  if(validatorInput.type === 'CreateWebLedgerRecord') {
    record = validatorInput.record;
  }

  // verify all proofs, if any fail, reject the operation, even if not relevant
  const result = await jsigs.verify(validatorInput, {
    documentLoader: _createDidDocumentLoader(ledgerNode, record),
    // must allow for old operations to pass validation
    checkTimestamp: false
  });

  // FIXME: remove
  // const result = {verified: true};

  if(!result.verified) {
    const error = new BedrockError(
      'Proof verification failed.', 'ValidationError', {
        httpStatusCode: 400,
        public: true,
        operation: validatorInput,
        proofVerifyResult: result
      });
    return {valid: false, error};
  }
  // success
  return {valid: true};

  // FIXME: Need to check to see if `invocationTarget` is specified ... and if
  // so, it needs to be the same as the DID capability document OR, the
  // delegator of the capability needs to be the `capabilityRoot` in the
  // latest config for the ledger
}

async function _validateWebLedgerConfiguration({ledgerNode, validatorInput}) {
  // TODO: configuration will need to be signed
  // according to the validator config (use approvedSigners)... and also
  // require the ledgerConfiguration to include a `capabilityRoot` for now
  return validate('veres-one-validator.ledgerConfiguration', validatorInput);

  // FIXME: what sort of keys will be used to sign the initial ledger
  // configuration?  Will it be signed by a DID that will be uploaded to the
  // ledger later or something along those lines? Otherwise, where does the
  // public key live?  Exactly what sort of signature are we talking about here?

  // await _validateConfigurationProofs({ledgerNode, validatorInput});
}

// FIXME: this needs to be audited by somone who is more familiar with the
// requirements. It appears that the proofs need to be connected with the
// operation.type here, which is not happening. e.g. if it's a
// UpdateWebLedger operation, it needs a certain set of proofs
// as is, an update with a RegisterDid capability is passing

function _checkProofCombination(proof) {
  const proofs = [].concat(proof);
  // valid combinations:
  // 1. (Rsa/Ed25519 + RegisterDid/UpdateDidDocument)
  // 2. (Rsa/Ed25519 + AuthorizeRequest),
  //    (Rsa/Ed25519 + RegisterDid/UpdateDidDocument)

  const hasRegisterDidOcap =
    _hasOcapInvocationProof(proofs, 'RsaSignature2018', 'RegisterDid') ||
    _hasOcapInvocationProof(proofs, 'Ed25519Signature2018', 'RegisterDid');

  const hasUpdateDidDocumentOcap =
    _hasOcapInvocationProof(proofs, 'RsaSignature2018', 'UpdateDidDocument') ||
    _hasOcapInvocationProof(
      proofs, 'Ed25519Signature2018', 'UpdateDidDocument');

  if(hasRegisterDidOcap || hasUpdateDidDocumentOcap) {
    return true;
  }

  const hasAuthorizeRequestOcap =
    _hasOcapInvocationProof(proofs, 'RsaSignature2018', 'AuthorizeRequest') ||
    _hasOcapInvocationProof(proofs, 'Ed25519Signature2018', 'AuthorizeRequest');

  if(hasAuthorizeRequestOcap &&
    (hasRegisterDidOcap || hasUpdateDidDocumentOcap)) {
    return true;
  }

  return false;
}

function _hasProofType(proofs, type) {
  return proofs.some(proof => proof.type === type);
}

function _hasOcapInvocationProof(proofs, type, action) {
  return proofs.some(proof =>
    proof.type === type &&
    proof.proofPurpose === 'capabilityInvocation' &&
    proof.capabilityAction === action);
}

function _computeTargetElectorCount({coefficient, originalCount}) {
  if(originalCount === 0) {
    return 0;
  }
  // compute target length
  const f = Math.ceil(originalCount / 3);
  return coefficient * (f - 1) + 1;
}

function _createDidDocumentLoader(ledgerNode, record) {
  // delimiters for a DID URL
  const splitRegex = /[;|\/|\?|#]/;
  return async function(url) {
    if(!url.startsWith('did:')) {
      return bedrock.jsonld.documentLoader(url);
    }
    const [did] = url.split(splitRegex);
    // try to get DID from state machine
    let didDocument;
    try {
      const result = await ledgerNode.records.get({recordId: did});
      didDocument = result.record;
    } catch(err) {
      // if record API does not have DID and it is to be created (i.e.
      // the record matches the DID), use it as the DID Document
      if(!(err.name === 'NotFoundError' && record && record.id === did)) {
        throw err;
      }
      didDocument = record;
    }
    if(!url.includes('#')) {
      return {
        contextUrl: null,
        document: didDocument,
        documentUrl: url
      };
    }
    // try to find the specific object in the DID document
    const document = await _pluckDidNode(did, url, didDocument);
    return {
      contextUrl: null,
      document,
      documentUrl: url
    };
  };
}

async function _pluckDidNode(did, target, didDocument) {
  const {jsonld} = bedrock;
  // flatten to isolate target
  const flattened = await jsonld.flatten(didDocument);
  // filter out non-DID nodes and find target
  let found = false;
  const filtered = [];
  console.log('TTTTTTTTTTTT', target);
  console.log('FFFFFFFFF', JSON.stringify(flattened, null, 2));
  for(const node of flattened) {
    const id = node['@id'];
    if(id === target) {
      filtered.push(node);
      found = true;
      break;
    }
    // if(id !== did) {
    //   filtered.push(node);
    //   if(id === target) {
    //     found = true;
    //   }
    // }
  }
  console.log('UUUUUUU', found, filtered);
  // target not found
  if(!found) {
    const err = new Error('Not Found');
    err.httpStatusCode = 404;
    err.status = 404;
    throw err;
  }

  const context = [
    constants.DID_CONTEXT_URL,
    constants.VERES_ONE_CONTEXT_URL
  ];
  // frame target
  const framed = await jsonld.frame(
    filtered, {'@context': context, id: target}, {embed: '@always'});

  const result = Object.assign({'@context': context}, framed['@graph'][0]);
  console.log('RRRRRRRr', JSON.stringify(result, null, 2));
  return result;
}
