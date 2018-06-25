/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const BedrockError = bedrock.util.BedrockError;

const mock = {};
module.exports = mock;

const ledgerConfigurations = mock.ledgerConfigurations = {};
const operations = mock.operations = {};
const didDocuments = mock.didDocuments = {};
const privateDidDocuments = mock.privateDidDocuments = {};
const capabilities = mock.capabilities = {};
const ldDocuments = mock.ldDocuments = {};

mock.ledgerNode = {
  stateMachine: {
    get(id, options, callback) {
      if(id === didDocuments.beta.id) {
        return callback(null, {
          object: ldDocuments[didDocuments.beta.id],
          meta: {sequence: 0}
        });
      }
      callback(new BedrockError(
        'DID Document not found.', 'NotFoundError', {id}));
    }
  }
};

privateDidDocuments.alpha = {
  "@context": "https://w3id.org/veres-one/v1",
  "id": "did:v1:test:nym:BcNkgGmGEpCGSJSMPB4BvWvwVM6YeTR52BSWcZTbzU23",
  "authentication": [
    {
      "type": "Ed25519SignatureAuthentication2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:BcNkgGmGEpCGSJSMPB4BvWvwVM6YeTR52BSWcZTbzU23#authn-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:BcNkgGmGEpCGSJSMPB4BvWvwVM6YeTR52BSWcZTbzU23",
          "publicKeyBase58": "BcNkgGmGEpCGSJSMPB4BvWvwVM6YeTR52BSWcZTbzU23",
          "privateKey": {
            "privateKeyBase58": "28EbEJsAiCd5yuQ2utpyUy4Hf32ifdSqNBboNLobqDVzy8uR4cG5vPvJuNDxMaEeAGjcADT7hQx7eQ62eraGGxwq"
          }
        }
      ]
    }
  ],
  "capabilityDelegation": [
    {
      "type": "Ed25519SignatureCapabilityAuthorization2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:BcNkgGmGEpCGSJSMPB4BvWvwVM6YeTR52BSWcZTbzU23#ocap-grant-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:BcNkgGmGEpCGSJSMPB4BvWvwVM6YeTR52BSWcZTbzU23",
          "publicKeyBase58": "7CbTNMtPS41BQvfpX1JnyUQwNbTZ1aSvYxdVu9PUVVub",
          "privateKey": {
            "privateKeyBase58": "4rcazrrKy3zEyZMim6R9kKDB1D514kS48bFVsZGd6oMwuah4WkgfHpQzpF47bhiPdDz5AFvP8gHsGhfZcKFmS2m"
          }
        }
      ]
    }
  ],
  "capabilityInvocation": [
    {
      "type": "Ed25519SignatureCapabilityAuthorization2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:BcNkgGmGEpCGSJSMPB4BvWvwVM6YeTR52BSWcZTbzU23#ocap-invoke-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:BcNkgGmGEpCGSJSMPB4BvWvwVM6YeTR52BSWcZTbzU23",
          "publicKeyBase58": "Gwuv2E78E4rqgqe1csXJMFZjXNcAii84vdbfFNi5McFe",
          "privateKey": {
            "privateKeyBase58": "62mGnmB5LWD2fH8VzywWVkrDux8mCGQt1h3MRJk1bG5FsZzc83bzEw9BcvfJLST6jgmHJbGoLRUys8en7h4dChPA"
          }
        }
      ]
    }
  ]
};

privateDidDocuments.beta = {
  "@context": "https://w3id.org/veres-one/v1",
  "id": "did:v1:test:nym:3C49qmqRaXBd6CeAz6p3HXS4Wb5UFafxX4xQcPH3xmsf",
  "authentication": [
    {
      "type": "Ed25519SignatureAuthentication2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:3C49qmqRaXBd6CeAz6p3HXS4Wb5UFafxX4xQcPH3xmsf#authn-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:3C49qmqRaXBd6CeAz6p3HXS4Wb5UFafxX4xQcPH3xmsf",
          "publicKeyBase58": "3C49qmqRaXBd6CeAz6p3HXS4Wb5UFafxX4xQcPH3xmsf",
          "privateKey": {
            "privateKeyBase58": "3avMZE8LEVnnLVPTRH3L6pJCzAjH7qxjt3wajm5gg7Ap6VeR3xgtmU983WovAYJSvMwiHUhkQRcw5A5oP4f7yRVB"
          }
        }
      ]
    }
  ],
  "capabilityDelegation": [
    {
      "type": "Ed25519SignatureCapabilityAuthorization2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:3C49qmqRaXBd6CeAz6p3HXS4Wb5UFafxX4xQcPH3xmsf#ocap-grant-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:3C49qmqRaXBd6CeAz6p3HXS4Wb5UFafxX4xQcPH3xmsf",
          "publicKeyBase58": "3E4MyTQupGp1PDU8FDTEoLFs9ZbXCgEKaNBBHonNc3Cn",
          "privateKey": {
            "privateKeyBase58": "4YArwy9Z1ProBZvSa9oZurg4WKKnDMdSfJ9fgtiu8ZSCJzxT9sPyMzu7bnYKaa4ki86SJ18rVeJXJ1UyRt8NhwEa"
          }
        }
      ]
    }
  ],
  "capabilityInvocation": [
    {
      "type": "Ed25519SignatureCapabilityAuthorization2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:3C49qmqRaXBd6CeAz6p3HXS4Wb5UFafxX4xQcPH3xmsf#ocap-invoke-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:3C49qmqRaXBd6CeAz6p3HXS4Wb5UFafxX4xQcPH3xmsf",
          "publicKeyBase58": "6GFLJVexLiGhqmHbT3kcaeHiwqfY3by26HsqGB94G9Vy",
          "privateKey": {
            "privateKeyBase58": "2tQWQVtueMLLAmbNHXMHwbwgYXgtLf1ESk2m92ErMdTgengxrss6AKVPgKcTDquc8f6Qpu3bfjDRagkCQ2jdDqwV"
          }
        }
      ]
    }
  ]
};

didDocuments.alpha = _stripPrivateKeys(privateDidDocuments.alpha);
didDocuments.beta = _stripPrivateKeys(privateDidDocuments.beta);

function _stripPrivateKeys(privateDidDocument) {
  const didDocument = bedrock.util.clone(privateDidDocument);
  delete didDocument.authentication[0].publicKey[0].privateKey;
  delete didDocument.capabilityDelegation[0].publicKey[0].privateKey;
  delete didDocument.capabilityInvocation[0].publicKey[0].privateKey;
  return didDocument;
}

mock.authorizedSigners = {
  // fully valid signer
  alpha: didDocuments.alpha.authentication[0].publicKey[0].id,
  beta: didDocuments.beta.authentication[0].publicKey[0].id
};

ledgerConfigurations.alpha = {
  '@context': 'https://w3id.org/webledger/v1',
  type: 'WebLedgerConfiguration',
  ledger: 'did:v1:c02915fc-672d-4568-8e6e-b12a0b35cbb3',
  consensusMethod: 'UnilateralConsensus2017',
  operationValidator: [{
    type: 'VeresOneValidator2017',
    validatorFilter: [{
      type: 'ValidatorFilterByType',
      validatorFilterByType: ['CreateWebLedgerRecord']
    }]
  }]/*,
  ledgerConfigurationValidator: [{
    type: 'SignatureValidator2017',
    validatorFilter: [{
      type: 'ValidatorFilterByType',
      validatorFilterByType: ['WebLedgerConfiguration']
    }],
    approvedSigner: [
      'did:v1:53ebca61-5687-4558-b90a-03167e4c2838'
    ],
    minimumSignaturesRequired: 1
  }]*/
};

operations.create = {
  '@context': 'https://w3id.org/webledger/v1',
  type: 'CreateWebLedgerRecord',
  record: didDocuments.alpha
};

operations.update = {
  '@context': 'https://w3id.org/webledger/v1',
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    '@context': 'https://w3id.org/veres-one/v1',
    target: didDocuments.beta.id,
    sequence: 0,
    patch: [{
      "op": "add",
      "path": "/authentication/0/publicKey/1",
      "value": {
        "type": "Ed25519SignatureAuthentication2018",
        "publicKey": [
          {
            "id": "did:v1:test:nym:EgTmFEFxUXy2rnw8FPpFxZ9asow4KA2cctbJSQW5s8zG#authn-key-1",
            "type": "Ed25519VerificationKey2018",
            "owner": "did:v1:test:nym:EgTmFEFxUXy2rnw8FPpFxZ9asow4KA2cctbJSQW5s8zG",
            "publicKeyBase58": "EgTmFEFxUXy2rnw8FPpFxZ9asow4KA2cctbJSQW5s8zG"
          }
        ]
      }
    }]
  }
};

operations.updateInvalidPatch = {
  '@context': 'https://w3id.org/webledger/v1',
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    '@context': 'https://w3id.org/veres-one/v1',
    target: didDocuments.beta.id,
    sequence: 0,
    patch: [{
      op: "invalid"
    }]
  }
};

operations.updateInvalidChange = {
  '@context': 'https://w3id.org/webledger/v1',
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    '@context': 'https://w3id.org/veres-one/v1',
    target: didDocuments.beta.id,
    sequence: 0,
    patch: [{
      op: "add",
      path: "/foo:bar",
      value: "test"
    }]
  }
};

capabilities.authorizeRequest =
  'did:v1:test:uuid:652de430-1d6f-11e8-878c-2bfa41196bf6';

// alpha
ldDocuments[didDocuments.alpha.id] = didDocuments.alpha;
ldDocuments[didDocuments.alpha.capabilityDelegation[0].publicKey.id] =
  Object.assign({
    "@context": "https://w3id.org/security/v2"
  }, didDocuments.alpha.capabilityDelegation[0].publicKey);
ldDocuments[didDocuments.alpha.capabilityInvocation[0].publicKey.id] =
  Object.assign({
    "@context": "https://w3id.org/security/v2"
  }, didDocuments.alpha.capabilityInvocation[0].publicKey);

// beta
ldDocuments[didDocuments.beta.id] = didDocuments.beta;
ldDocuments[didDocuments.beta.capabilityDelegation[0].publicKey.id] =
  Object.assign({
    "@context": "https://w3id.org/security/v2"
  }, didDocuments.beta.capabilityDelegation[0].publicKey);
ldDocuments[didDocuments.beta.capabilityInvocation[0].publicKey.id] =
  Object.assign({
    "@context": "https://w3id.org/security/v2"
  }, didDocuments.beta.capabilityInvocation[0].publicKey);

ldDocuments[capabilities.authorizeRequest] = {
  "@context": "https://w3id.org/security/v2",
  "id": capabilities.authorizeRequest,
  // TODO: add capability properties and improve verification testing
};

const jsonld = bedrock.jsonld;
const oldLoader = jsonld.documentLoader;
jsonld.documentLoader = function(url, callback) {
  if(url in mock.ldDocuments) {
    return callback(null, {
      contextUrl: null,
      document: mock.ldDocuments[url],
      documentUrl: url
    });
  }
  oldLoader(url, callback);
};
