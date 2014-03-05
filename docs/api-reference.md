# `ripple-blobvault` API Reference

**Table of Contents**

- [`ripple-blobvault` API Reference](#ripple-blobvault-api-reference)
    - [API Endpoints](#api-endpoints)
		- [GET /v1](#get-v1)
		- [Blob Management](#blob-management)
			- [POST /v1/blob/create](#post-v1blobcreate)
			- [POST /v1/blob/patch](#post-v1blobpatch)
			- [POST /v1/blob/consolidate](#post-v1blobconsolidate)
			- [POST /v1/blob/delete](#post-v1blobdelete)
			- [GET /v1/blob/:blob_id](#get-v1blobblob_id)
			- [GET /v1/blob/:id/patch/:patch_rev](#get-v1blobidpatchpatch_rev)

## Schemas

### RippleAddress

``` js
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "RippleAddress",
  "description": "A Ripple account address",
  "type": "string",
  "pattern": "^r[1-9A-HJ-NP-Za-km-z]{25,33}$"
}
```

## API Endpoints

### GET /v1

This is the API root and it returns a list of API endpoints.

### Blob Management

#### POST /v1/blob/create

Create a new blob to be stored on this blobvault server. Each new blob must be associated with a Ripple account that has not yet stored any blob on this server (in order to prevent spam.)

Request JSON Body:

``` js
{
  blob_id: [hash],
  username: [username],
  address: [address],
  signature: [ECDSA signature using account key],
  pubkey: [pubkey],
  auth_secret: [auth_secret],
  data: [encrypted_blob]
}
```

#### POST /v1/blob/patch

Submit a patch to an existing blob. A patch represents a diff between the previous state of the blob and a new state. Multiple clients can submit patches at the same time and the server will assign a unique order to them.

Request JSON Body:

``` js
{
  blob_id: [hash],
  patch: [blob_patch],
  signature: [HMAC using auth_secret]
}
```

#### POST /v1/blob/consolidate

Since the patches will be unnecessarily large, it makes sense to occasionally apply them to the blob and reencrypt the result. The client will do this periodically calling this API method.

Request JSON Body:

``` js
{
  blob_id: [hash],
  data: [consolidated_blob],
  revision: 42,
  signature: [HMAC using auth_secret]
}
```

#### POST /v1/blob/delete

This method deletes the blob from the server entirely.

Request JSON Body:

``` js
{
  blob_id: [hash],
  signature: [HMAC using auth_secret]
}
```

#### GET /v1/blob/:blob_id

Retrieve a blob by ID.

Response:

``` js
{
  blob: [encrypted_blob],
  patches: [
    [blob_patch_43],
    [blob_patch_44]
  ],
  revision: 42,
}
```

#### GET /v1/blob/:id/patch/:patch_rev

Retrieve a specific patch by revision.

Response:

``` js
{
  patch: [encrypted_patch]
}
```