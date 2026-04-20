/metadata/{eventId}/{tokenId}

# /metadata/{eventId}/{tokenId}

This endpoint returns metadata for the specified event and token ID.

# OpenAPI definition

```json
{
  "openapi": "3.0.1",
  "info": {
    "title": "Integrators Production API",
    "description": "Endpoint for public API & 3rd party integrations",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://api.poap.tech"
    }
  ],
  "paths": {
    "/metadata/{eventId}/{tokenId}": {
      "get": {
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "description": {
                      "type": "string",
                      "description": "The description of the event. Max length is 1500 characters.",
                      "example": "This is an example event description",
                      "maxLength": 1500
                    },
                    "external_url": {
                      "type": "string",
                      "description": "The metadata external URL: https://api.poap.tech/metadata/{eventId}/{tokenId}"
                    },
                    "home_url": {
                      "type": "string",
                      "description": "The metadata home URL: https://api.poap.xyz/token/{tokenId}"
                    },
                    "image_url": {
                      "type": "string",
                      "description": "This provides the URL of the POAP image.\nTo request a smaller, lower resolution version of the image, simply append \"?size=small\" to the end of the URL. For example, \"https://poap.xyz/image.png?size=small\".",
                      "example": "https://poap.xyz/image.png"
                    },
                    "name": {
                      "type": "string",
                      "description": "The name of the event.",
                      "example": "Example event 2022",
                      "maxLength": 256
                    },
                    "year": {
                      "type": "number",
                      "description": "The year the event took place.",
                      "example": 2022
                    },
                    "tags": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "attributes": {
                      "type": "array",
                      "description": "An array of the metadata and respective values.",
                      "items": {
                        "type": "object",
                        "properties": {
                          "trait_type": {
                            "type": "string"
                          },
                          "value": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "x-amazon-apigateway-integration": {
          "httpMethod": "GET",
          "uri": "https://${stageVariables.poapServerInternalDomain}/metadata/{eventId}/{tokenId}",
          "responses": {
            "default": {
              "statusCode": "200",
              "responseParameters": {
                "method.response.header.Access-Control-Allow-Origin": "'*'"
              }
            }
          },
          "requestParameters": {
            "integration.request.header.x-poap-gateway": "stageVariables.serverApiGwKey",
            "integration.request.header.requestid": "context.requestId",
            "integration.request.header.x-gateway-source": "'poap-public-api'",
            "integration.request.header.apiKeyId": "context.identity.apiKeyId",
            "integration.request.header.auth0-consumer-id": "context.authorizer.consumerId",
            "integration.request.path.eventId": "method.request.path.eventId",
            "integration.request.path.tokenId": "method.request.path.tokenId"
          },
          "passthroughBehavior": "when_no_match",
          "connectionId": "rgv50m",
          "connectionType": "VPC_LINK",
          "type": "http_proxy",
          "contentHandling": "CONVERT_TO_TEXT"
        },
        "parameters": [
          {
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "name": "eventId",
            "description": "The numeric ID of the event."
          },
          {
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "name": "tokenId",
            "description": "The unique POAP token ID."
          }
        ],
        "summary": "/metadata/{eventId}/{tokenId}",
        "description": "This endpoint returns metadata for the specified event and token ID.",
        "tags": [
          "Tokens"
        ],
        "operationId": "GET:/metadata/*/*",
        "x-amazon-apigateway-request-validator": "Validate query string parameters and headers"
      }
    }
  },
  "x-amazon-apigateway-request-validators": {
    "Validate query string parameters and headers": {
      "validateRequestParameters": true,
      "validateRequestBody": false
    }
  },
  "x-amazon-apigateway-binary-media-types": [
    "multipart/form-data"
  ]
}
```