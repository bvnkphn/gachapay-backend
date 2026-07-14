import json, urllib.request, urllib.error
secret='WMwEoEjNiVPvRACu8Rc2CcDCQop1sbeW6vgxhJzOHJA='
req = urllib.request.Request(
    'https://connect.slip2go.com/api/verify-slip/qr-image/info',
    data=json.dumps({'image':'https://example.com/test-slip.png','amount':'100','reference':'test-ref'}).encode(),
    headers={'Authorization':'Bearer ' + secret, 'Content-Type':'application/json'},
    method='POST'
)
try:
    with urllib.request.urlopen(req, timeout=20) as r:
        print('STATUS', r.status)
        print(r.read().decode())
except urllib.error.HTTPError as e:
    print('STATUS', e.code)
    print(e.read().decode())
except Exception as e:
    print('ERROR', e)
