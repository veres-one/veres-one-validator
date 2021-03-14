/*!
 * Copyright (c) 2017-2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const _ = require('lodash');
const bedrock = require('bedrock');
const brLedgerUtils = require('bedrock-ledger-utils');
const {config: {constants}, util: {BedrockError}} = bedrock;
const {documentLoader} = require('bedrock-jsonld-document-loader');

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

api.validateService = async ({
  basisBlockHeight, did, ledgerNode, service, validatorParameterSet
}) => {
  let allowedServiceBaseUrl;
  try {
    ({allowedServiceBaseUrl} = await api.getValidatorParameterSet({
      basisBlockHeight, ledgerNode, validatorParameterSet
    }));
  } catch(error) {
    // let NotFoundError pass
    if(error.name !== 'NotFoundError') {
      return {
        error: new BedrockError(
          'Unable to retrieve ValidatorParameterSet.', 'UnknownError', {
            basisBlockHeight,
            // do not expose unknown error details to the user
            public: false,
            httpStatusCode: 400,
            validatorParameterSet,
          }, error),
        valid: false
      };
    }
  }

  if(!allowedServiceBaseUrl) {
    return {
      error: new BedrockError(
        'Invalid ledger validator configuration. `allowedServiceBaseUrl` ' +
        'is not defined.', 'InvalidStateError', {
          basisBlockHeight,
          httpStatusCode: 400,
          public: true,
          validatorParameterSet,
        }),
      valid: false
    };
  }

  const result = api.validateServiceEndpoints(
    {allowedServiceBaseUrl, did, service});
  if(!result.valid) {
    return result;
  }
  // success
  return {valid: true};
};

api.validateServiceEndpoints = ({allowedServiceBaseUrl, did, service}) => {
  const valid = service.every(({serviceEndpoint}) =>
    // NOTE: baseUrl does not end with a forward slash
    allowedServiceBaseUrl.some(baseUrl => {
      if(serviceEndpoint.startsWith(baseUrl)) {
        const path = serviceEndpoint.substr(baseUrl.length);
        if(path === `/${encodeURIComponent(did)}`) {
          return true;
        }
      }
      return false;
    })
  );
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

api.validateValidatorParameterSet = ({validatorInput}) => {
  const {record: {allowedServiceBaseUrl}} = validatorInput;
  for(const baseUrl of allowedServiceBaseUrl) {
    if(baseUrl.endsWith('/')) {
      const error = new BedrockError(
        'An allowed service base URL must not end with `/`.', 'SyntaxError', {
          allowedServiceBaseUrl, baseUrl
        });
      return {error, valid: false};
    }
  }
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
  // find verification method in DID document
  for(const property in didDocument) {
    // veres one documents have a rigid structure, only array values contain
    // other nodes to pluck
    const nodes = didDocument[property];
    if(!Array.isArray(nodes)) {
      continue;
    }
    for(const node of nodes) {
      if(node.id === target) {
        return {
          '@context': didDocument['@context'],
          ...node
        };
      }
    }
  }

  const err = new Error('Not Found.');
  err.name = 'NotFoundError';
  err.httpStatusCode = 404;
  err.status = 404;
  throw err;
}
