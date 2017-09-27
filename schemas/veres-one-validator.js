/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
const constants = require('bedrock').config.constants;
const schemas = require('bedrock-validation').schemas;
const did = require('./did');

const config = {
  title: 'Veres One Validator Config',
  required: true,
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['VeresOneValidator2017'],
      required: true
    },
    eventFilter: {
      title: 'Event Filter',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            required: true
          },
          eventType: {
            type: 'array',
            items: {
              type: 'string'
            },
            required: true
          }
        },
        additionalProperties: false
      },
      required: true
    }
  },
  additionalProperties: false
};

const capability = {
  title: 'Capability',
  type: 'object',
  required: true,
  properties: {
    permission: {
      type: 'string',
      required: true
    },
    entity: did(),
    permittedProofType: {
      title: 'Permitted Proof Type',
      type: 'array',
      minItems: 1,
      items: [{
        type: 'object',
        properties: {
          proofType: {
            type: 'string',
            enum: ['LinkedDataSignature2015'],
            required: true
          },
          additionalProperties: false
        },
        additionalProperties: false
      }, {
        type: 'object',
        properties: {
          proofType: {
            type: 'string',
            enum: ['EquihashProof2017'],
            required: true
          },
          equihashParameterAlgorithm: {
            type: 'string',
            required: true,
            enum: ['VeresOne2017']
          }
        },
        additionalProperties: false
      }],
      required: true
    }
  },
  additionalProperties: false
};

const didDocument = {
  title: 'DID Document',
  required: true,
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.VERES_ONE_CONTEXT),
    id: did(),
    authorizationCapability: {
      type: 'array',
      required: true,
      items: capability
    },
    authenticationCredential: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            required: true
          },
          type: {
            type: 'string',
            required: true,
            enum: ['CryptographicKey'],
          },
          owner: did(),
          publicKeyPem: schemas.publicKeyPem()
        },
        additionalProperties: false
      },
      required: true
    },
  },
  additionalProperties: false
};

module.exports.config = () => config;
module.exports.didDocument = () => didDocument;
