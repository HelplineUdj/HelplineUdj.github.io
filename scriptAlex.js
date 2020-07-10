_CLIENT_ID = '4d7b3393-c5ed-45de-9597-9a433cf174a5'
_CLIENT_SECRET = 'hyLIJem6rtYJNQaoNZzzn3eDIPDHuuA6zkfD7qdqp_4'

function getBase64EncodedAuth()
{
    return 'Basic ' + + Buffer.from(_CLIENT_ID + ':' + _CLIENT_SECRET).toString('base64');
}

