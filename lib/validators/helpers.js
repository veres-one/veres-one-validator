/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const _ = require('lodash');
const bedrock = require('bedrock');
const brLedgerUtils = require('bedrock-ledger-utils');
const {config: {constants}, util: {BedrockError}} = bedrock;
const {documentLoader} = require('bedrock-jsonld-document-loader');
const jsonld = require('jsonld');

const api = {};
module.exports = api;

// delimiters for a DID URL
const splitRegex = /[;|\/|\?|#]/;
// all the keys extracted using the document loader are restricted by the
// `basisBlockHeight` of the operation being validated. This ensures that
// the signatures were valid at the time of signing.
api.createDidDocumentLoader = ({basisBlockHeight, ledgerNode, record}) => {
  return async function(url) {
    if(!url.startsWith('did:')) {
      return documentLoader(url);
    }
    const [did] = url.split(splitRegex);
    // try to get DID from records API
    let didDocument;
    try {
      const result = await ledgerNode.records.get(
        {maxBlockHeight: basisBlockHeight, recordId: did});
      didDocument = result.record;
    } catch(err) {
      // if record API does not have DID and it is to be created (i.e.
      // the record matches the DID), use it as the DID Document
      if(!(err.name === 'NotFoundError' && record && record.id === did)) {
        throw err;
      }
      // FIXME: cloning is required to to jsonld mutating the document
      didDocument = bedrock.util.clone(record);
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
};

api.getValidatorParameterSet = async ({
  basisBlockHeight, ledgerNode, validatorParameterSet
}) => {
  const {record} = await ledgerNode.records.get(
    {maxBlockHeight: basisBlockHeight, recordId: validatorParameterSet});
  return record;
};

api.validateService = async ({allowedServiceBaseUrl, service}) => {
  let valid = false;
  for(const {serviceEndpoint} of service) {
    valid = allowedServiceBaseUrl.some(baseUrl =>
      serviceEndpoint.startsWith(baseUrl));
  }
  if(!valid) {
    return {
      valid: false,
      error: new BedrockError(
        'Invalid service endpoint.', 'ValidationError', {
          allowedServiceBaseUrl,
          httpStatusCode: 400,
          public: true,
          service,
        })
    };
  }
  return {valid};
};

api.validateElectorPoolElectors = async (
  {electorPool, ledgerNode, maximumElectorCount}) => {
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
};

function _computeTargetElectorCount({coefficient, originalCount}) {
  if(originalCount === 0) {
    return 0;
  }
  // compute target length
  const f = Math.ceil(originalCount / 3);
  return coefficient * (f - 1) + 1;
}

async function _pluckDidNode(did, target, didDocument) {
  // flatten to isolate target
  const flattened = await jsonld.flatten(didDocument);
  // filter out non-DID nodes and find target
  let found = false;
  const filtered = [];
  for(const node of flattened) {
    const id = node['@id'];
    if(id === target) {
      filtered.push(node);
      found = true;
      break;
    }
  }
  // target not found
  if(!found) {
    const err = new Error('Not Found');
    err.httpStatusCode = 404;
    err.status = 404;
    throw err;
  }

  const context = [
    constants.DID_CONTEXT_URL,
    constants.VERES_ONE_CONTEXT_V1_URL
  ];
  // frame target
  const framed = await jsonld.frame(
    filtered, {'@context': context, id: target}, {embed: '@always'});

  return Object.assign({'@context': context}, framed['@graph'][0]);
}
