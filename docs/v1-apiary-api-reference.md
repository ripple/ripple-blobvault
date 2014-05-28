Format: 1A

# Blobvault v1
Welcome to the Blobvault v1 API. This API provides access to
the Ripple Blobvaut.

# Blobvault Links
+ [This: Raw API Blueprint](https://raw.githubusercontent.com/rook2pawn/ripple-blobvault/master/docs/v1-apiary-api-reference.md)
+ [Blobvault GitHub Repository](https://github.com/ripple/ripple-blobvault)

# Group Creating a user

## POST /v1/user

+ Request (application/json)

        {
            "address": "",
            "encrypted_blobdecrypt_key": "",
            "blob_id" : "",
            "username" : "",
            "auth_secret": "",
            "data" : "",
            "email" : "",
            "hostlink" : "",
            "encrypted_secret" : ""
        }
+ Response 201 (application/json)

         {
         "result" : "success"
         }
         
+ Response 400 (application/json)

        { 
        "result" : "error",
        "message" : ""
        }

# Group Deleting a user

## DELETE /v1/user

+ Request (application/json)

        {
            "foo":"bar"
        }

+ Response 200

# Group Looking up a user

## GET /v1/user

+ Request (application/json)

        {
            "foo":"bar"
        }

+ Response 200

# Group Looking up a user via querstring

## GET /v1/authinfo{?username}

+ Request (application/json)

        {
            "foo":"bar"
        }

+ Response 200

# Group Renaming a user

## POST /v1/user/rename

+ Request (application/json)

        {
            "foo":"bar"
        }

+ Response 200


# Group Changing email address

## POST /v1/user/email

+ Request (application/json)

        {
            "foo":"bar"
        }

+ Response 200

# Group Resending Email

## POST /v1/user/email/resend

+ Request (application/json)

        {
            "foo":"bar"
        }

+ Response 200

# Group Verifying Email Token

## GET /v1/user/{username}/verify/{token}

+ Parameters

    + username ... string
    + token ... string
    
+ Response 200 (application/json)

        { 
            "result" : "success"
        }
        
# Group Retrieve a blob

## GET /v1/blob/{blob_id}

+ Response 200 (application/json)

        { 
            "result" : "success"
        }

# Group Add a blob patch

## POST /v1/blob/patch

+ Response 200 (application/json)

        { 
            "result" : "success"
        }

# Group Get a blob Patch

## GET /v1/blob/{blob_id}/patch/{patch_id}


+ Parameters

    + blob_id ... string
    + patch_id ... string
    
+ Response 200 (application/json)

        { 
            "result" : "success"
        }

# Group Consolidate a set of blob patches

## POST /v1/blob/consolidate

+ Response 200 (application/json)

        { 
            "result" : "success"
        }
        

# Group Checking if a user is locked

## GET /v1/locked{?address}

+ Response 403 (application/json)

        { 
            "result" : "locked"
            "reason" : ""
        }
        
+ Response 200 (application/json)

        { 
            "result" : "not locked"
        }
