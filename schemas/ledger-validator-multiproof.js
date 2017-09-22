/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const schemas = require('bedrock-validation').schemas;

const schema = {
  title: 'Bedrock Ledger Multiproof Validator Config',
  required: true,
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['MultiproofValidator2017'],
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
    },
    permittedProofType: {
      title: 'Permitted Proof Type',
      type: 'array',
      minItems: 1,
      items: [{
        type: 'object',
        properties: {
          proofType: {
            type: 'string',
            enum: ['RsaSignatureProof2015'],
            required: true
          },
          requiredProof: {
            type: 'boolean'
          },
          minimumSignatures: {
            type: 'number'
          },
          authenticationCredential: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: [{
                id: {
                  type: 'string',
                  required: true
                },
                type: {
                  type: 'string',
                  enum: ['RsaCryptographicKey'],
                },
                owner: {
                  type: 'string',
                },
                publicKeyPem: {
                  type: 'string'
                }
              }]
            },
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
          requiredProof: {
            type: 'boolean'
          },
          equihashParameterN: {
            type: 'number',
            required: true
          },
          equihashParameterK: {
            type: 'number',
            required: true
          }
        },
        additionalProperties: false
      }],
      required: true
    },
  },
  additionalProperties: false
};

module.exports = extend => {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
