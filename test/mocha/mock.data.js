/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {constants} = bedrock.config;
const uuid = require('uuid/v4');
const {BedrockError} = bedrock.util;

const mock = {};
module.exports = mock;

mock.existingDids = {};
const capabilities = mock.capabilities = {};
const didDocuments = mock.didDocuments = {};
const electorPoolDocument = mock.electorPoolDocument = {};
const ldDocuments = mock.ldDocuments = {};
const ledgerConfigurations = mock.ledgerConfigurations = {};
const operations = mock.operations = {};
const privateDidDocuments = mock.privateDidDocuments = {};
// TODO: for testnet v2, this proof is only validated using json-schema
mock.proof = {
  type: "Ed25519Signature2018",
  created: "2019-01-10T23:10:25Z",
  capability: 'did:v1:uuid:c37e914a-1e2a-4d59-9668-ee93458fd19a',
  capabilityAction: "AuthorizeRequest",
  jws: "MOCKPROOF",
  proofPurpose: "capabilityInvocation",
  verificationMethod: "did:v1:test:nym:z279yHL6HsxRzCPU78DAWgZVieb8xPK1mJKJBbP8T2CezuFY#z279tKmToKKMjQ8tsCgTbBBthw5xEzHWL6GCqZyQnzZr7wUo"
}

// need to return document for beta but *not* for alpha
mock.ledgerNode = {
  records: {
    async get({maxBlockHeight, recordId}) {
      const record = mock.existingDids[recordId];
      if(record) {
        return {
          meta: {sequence: 0},
          record,
        };
      }
      throw new BedrockError(
        'DID Document not found.', 'NotFoundError', {recordId});
    }
  }
};

const electorEndpoint = mock.electorEndpoint = [];

// NOTE: actual endpoints terminate with a base58 encoded public key
for(let i = 0; i < 10; ++i) {
  electorEndpoint.push('https://example.com/consensus/continuity2017/voters/' +
    uuid());
}

electorPoolDocument.alpha = {
  '@context': constants.VERES_ONE_CONTEXT_URL,
  id: 'urn:uuid:b3275fed-daf4-4c07-b63a-747fa8857609',
  // FIXME: this has to be in the v1 context before we can sign documents
  // veresOneTicketRate: 10, /* TBD */
  invoker: '', // replaced with DID in test
  electorPool: [{
    id: 'urn:uuid:89a62413-0ada-461b-b672-1b28afefaca8',
    elector: 'did:v1:test:nym:50f28192-8f52-4bf2-a9b1-d203f6611456',
    service: 'urn:uuid:50f28192-8f52-4bf2-a9b1-d203f6611456',
    type: ['Continuity2017GuarantorElector', 'Continuity2017Elector'],
    // other restrictions/capabilities like guarantor, recovery,
    // or ocap w/ticket caveat
    capability: [{
      id: '', // replaced with DID in test
      caveat: [{
        type: 'VeresOneElectorTicketAgent' /* TBD */
      }]
    }]
  }],
  maximumElectorCount: 10,
};

privateDidDocuments.alpha = {
  "@context": [
    constants.DID_CONTEXT_URL,
    constants.VERES_ONE_CONTEXT_URL
  ],
  "id": "did:v1:test:nym:z279yHL6HsxRzCPU78DAWgZVieb8xPK1mJKJBbP8T2CezuFY",
  "authentication": [
    {
      "id": "did:v1:test:nym:z279yHL6HsxRzCPU78DAWgZVieb8xPK1mJKJBbP8T2CezuFY#z279jeddPcVScp2qcA476nxuQnZGnmBHcXSKWgNusrT1u1V1",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:v1:test:nym:z279yHL6HsxRzCPU78DAWgZVieb8xPK1mJKJBbP8T2CezuFY",
      "publicKeyBase58": "2vXXVcAkogFwWGBHsyU1KCJrsFJLtuE8xnzyVNwmhhdq"
    }
  ],
  "capabilityDelegation": [
    {
      "id": "did:v1:test:nym:z279yHL6HsxRzCPU78DAWgZVieb8xPK1mJKJBbP8T2CezuFY#z279odRyQVywHaU723iXRVncxmd4ELNzCL5gGfcQgDVg6mhV",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:v1:test:nym:z279yHL6HsxRzCPU78DAWgZVieb8xPK1mJKJBbP8T2CezuFY",
      "publicKeyBase58": "6uKsWVfFUShCv9qiCgHisBNeJpW3UhsVinEUHjzRuTrK"
    }
  ],
  "capabilityInvocation": [
    {
      "id": "did:v1:test:nym:z279yHL6HsxRzCPU78DAWgZVieb8xPK1mJKJBbP8T2CezuFY#z279yHL6HsxRzCPU78DAWgZVieb8xPK1mJKJBbP8T2CezuFY",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:v1:test:nym:z279yHL6HsxRzCPU78DAWgZVieb8xPK1mJKJBbP8T2CezuFY",
      "publicKeyBase58": "GZDzPsdkB4ca1ELMHs4bd4Lj2sS53g77di1C4YhQobQN"
    }
  ]
};

privateDidDocuments.beta = {
  // FIXME: use constant and cached version when available
  "@context": ['https://w3id.org/did/v0.11', constants.VERES_ONE_CONTEXT_URL],
  "id": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF",
  "authentication": [
    {
      "type": "Ed25519SignatureAuthentication2018",
      "publicKey": [
        {
          "id": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF#authn-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF",
          "publicKeyBase58": "7tJdgUebDRaVFR2d8LzV9BK7RMz5aw2AuW5LsEBBAKWs",
          "privateKey": {
            "privateKeyBase58": "4kftxewt3RQUW7k1MoTqEbZW5MnsJszNAwgEqbjJvKmJYeyUJFmkzYwwMZfB7Z5bWFyo1pQJzZL2mLL5zagc3dAT"
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
          "id": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF#ocap-delegate-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF",
          "publicKeyBase58": "CWERGaLLTsWGAKzpTKpHs9WyZ5Xczgj8HSbcZ7FjGAtQ",
          "privateKey": {
            "privateKeyBase58": "4bzwvphLSbKF3zWEB18dEFusRPSvpFqefeGqUSfNr3dwcN6KD7xNbAG1q1nBAFu7r6Knj4Lmex1zvWXrv632eS4Q"
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
          "id": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF#ocap-invoke-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279nCCZVzxreYfLw3EtFLtBMSVVY2pA6uxKengriMCdG3DF",
          "publicKeyBase58": "5U6TbzeAqQtSq9N52XPHFrF5cWwDPHk96uJvKshP4jN5",
          "privateKey": {
            "privateKeyBase58": "5hvHHCpocudyac6fT6jJCHe2WThQHsKYsjazkGV2L1Umwj5w9HtzcqoZ886yHJdHKbpC4W2qGhUMPbHNPpNDK6Dj"
          }
        }
      ]
    }
  ]
};

didDocuments.alpha = privateDidDocuments.alpha;
// didDocuments.alpha = _stripPrivateKeys(privateDidDocuments.alpha);
// didDocuments.beta = _stripPrivateKeys(privateDidDocuments.beta);

function _stripPrivateKeys(privateDidDocument) {
  const didDocument = bedrock.util.clone(privateDidDocument);
  delete didDocument.authentication[0].publicKey[0].privateKey;
  delete didDocument.capabilityDelegation[0].publicKey[0].privateKey;
  delete didDocument.capabilityInvocation[0].publicKey[0].privateKey;
  return didDocument;
}

mock.authorizedSigners = {
  // fully valid signer
  alpha: didDocuments.alpha.authentication[0].id,
  // beta: didDocuments.beta.authentication[0].id
};

ledgerConfigurations.alpha = {
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'WebLedgerConfiguration',
  ledger: 'did:v1:c02915fc-672d-4568-8e6e-b12a0b35cbb3',
  consensusMethod: 'Continuity2017',
  operationValidator: [{
    type: 'VeresOneValidator2017',
    validatorFilter: [{
      type: 'ValidatorFilterByType',
      validatorFilterByType: ['CreateWebLedgerRecord', 'UpdateWebLedgerRecord']
    }]
  }],
  ledgerConfigurationValidator: [{
    type: 'VeresOneValidator2017',
  }, /*{
    // FIXME: enable signature validation on configuration as well.  How
    // are keys dereferenced?
    type: 'SignatureValidator2017',
    validatorFilter: [{
      type: 'ValidatorFilterByType',
      validatorFilterByType: ['WebLedgerConfiguration']
    }],
    approvedSigner: [
      'did:v1:53ebca61-5687-4558-b90a-03167e4c2838'
    ],
    minimumSignaturesRequired: 1
  }*/],
};

operations.create = {
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'CreateWebLedgerRecord',
  record: didDocuments.alpha,
  // this is the `targetNode` of the ledgerAgent
  creator: 'https://genesis.veres.one.localhost:23443/consensus/' +
    'continuity2017/voters/z6MkhoJ1djxR53kw5fQqRTZ34cGwAdSPvksZR2Xm7u1Y4TfE'
};

operations.createElectorPool = {
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'CreateWebLedgerRecord',
  record: didDocuments.alpha
};

operations.update = {
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    // FIXME: use constant and cached version when available
    "@context": ['https://w3id.org/did/v0.11', constants.VERES_ONE_CONTEXT_URL],
    // target: didDocuments.beta.id,
    sequence: 0,
    patch: [{
      "op": "add",
      "path": "/authentication/1",
      "value": {
        "type": "Ed25519SignatureAuthentication2018",
        "publicKey": [{
          // "id": didDocuments.beta.id + "#authn-key-1",
          "type": "Ed25519VerificationKey2018",
          "owner": "did:v1:test:nym:z279wWXz4nugfh2XATAnFQkqaoSg97AWyNbsvdpr8hujamKJ",
          "publicKeyBase58": "EnRtAnazrZFd4ZHy2bFwVDCGDbHaFkPhNkSukEQVPTU8"
        }]
      }
    }]
  },
  // this is the `targetNode` of the ledgerAgent
  creator: 'https://genesis.veres.one.localhost:23443/consensus/' +
    'continuity2017/voters/z6MkhoJ1djxR53kw5fQqRTZ34cGwAdSPvksZR2Xm7u1Y4TfE'
};

operations.updateInvalidPatch = {
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    // FIXME: use constant and cached version when available
    "@context": ['https://w3id.org/did/v0.11', constants.VERES_ONE_CONTEXT_URL],
    // target: didDocuments.beta.id,
    sequence: 0,
    patch: [{
      op: "invalid"
    }]
  }
};

operations.updateInvalidChange = {
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'UpdateWebLedgerRecord',
  recordPatch: {
    // FIXME: use constant and cached version when available
    "@context": ['https://w3id.org/did/v0.11', constants.VERES_ONE_CONTEXT_URL],
    // target: didDocuments.beta.id,
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

/*

// alpha
ldDocuments[didDocuments.alpha.id] = didDocuments.alpha;
ldDocuments[didDocuments.alpha.authentication[0].publicKey[0].id] =
  Object.assign({
    "@context": constants.SECURITY_CONTEXT_V2_URL
  }, didDocuments.alpha.authentication[0].publicKey[0]);
ldDocuments[didDocuments.beta.capabilityDelegation[0].publicKey[0].id] =
ldDocuments[didDocuments.alpha.capabilityDelegation[0].publicKey[0].id] =
  Object.assign({
    "@context": constants.SECURITY_CONTEXT_V2_URL
  }, didDocuments.alpha.capabilityDelegation[0].publicKey);
ldDocuments[didDocuments.alpha.capabilityInvocation[0].publicKey[0].id] =
  Object.assign({
    "@context": constants.SECURITY_CONTEXT_V2_URL
  }, didDocuments.alpha.capabilityInvocation[0].publicKey[0]);

// beta
ldDocuments[didDocuments.beta.id] = didDocuments.beta;
ldDocuments[didDocuments.beta.authentication[0].publicKey[0].id] =
  Object.assign({
    "@context": constants.SECURITY_CONTEXT_V2_URL
  }, didDocuments.beta.authentication[0].publicKey[0]);
ldDocuments[didDocuments.beta.capabilityDelegation[0].publicKey[0].id] =
  Object.assign({
    "@context": constants.SECURITY_CONTEXT_V2_URL
  }, didDocuments.beta.capabilityDelegation[0].publicKey[0]);
ldDocuments[didDocuments.beta.capabilityInvocation[0].publicKey[0].id] =
  Object.assign({
    "@context": constants.SECURITY_CONTEXT_V2_URL
  }, didDocuments.beta.capabilityInvocation[0].publicKey[0]);

ldDocuments[capabilities.authorizeRequest] = {
  "@context": constants.SECURITY_CONTEXT_V2_URL,
  "id": capabilities.authorizeRequest,
  // TODO: add capability properties and improve verification testing
};

// used in conjuction with the mock record.get API. By default, beta will be
// an existing DID and alpha will not exist. Tests can make various DIDs exist
// or not exist based on their needs. The default configuration should be
// stored and restored in before/after functions.
mock.existingDids = {};
mock.existingDids[didDocuments.beta.id] = ldDocuments[didDocuments.beta.id];

// const jsonld = bedrock.jsonld;
// const oldLoader = jsonld.documentLoader;
// jsonld.documentLoader = function(url, callback) {
//   if(url in mock.ldDocuments) {
//     return callback(null, {
//       contextUrl: null,
//       document: mock.ldDocuments[url],
//       documentUrl: url
//     });
//   }
//   oldLoader(url, callback);
// };

*/
