#!/usr/bin/env python
import base64, requests, sys, json
import browser_cookie3
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
cookies = browser_cookie3.chrome(domain_name='apps.mypurecloud.de')
# headers = {
#     "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36", 
#     "Accept-Encoding":"gzip, deflate", 
#     "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", 
#     "DNT":"1",
#     "Connection":"close", 
#     "Upgrade-Insecure-Requests":"1"
# }
# response = requests.get('https://apps.mypurecloud.de/', verify=False, headers=headers, cookies=cookies, timeout=3)
print(cookies)
for c in cookies:
    print(c)
# print(response.text)
# print("-----------------------------------------------")
# print("- PureCloud Python Client Credentials Example -")
# print("-----------------------------------------------")



# # client_id = "d3d0641c-359c-4deb-8723-703f49075de9"
# # client_secret = "_zOFyAjpAnMVDGE3L0j4tlE-pSEvjbc7K7iGSl0xCCg"
# client_id = "d3d0641c-359c-4deb-8723-703f49075de9"
# client_secret = "_zOFyAjpAnMVDGE3L0j4tlE-pSEvjbc7K7iGSl0xCCg"
# # Base64 encode the client ID and client secret
# authorization = base64.b64encode(bytes(client_id + ":" + client_secret, "ISO-8859-1")).decode("ascii")

# # Prepare for POST /oauth/token request
# request_headers = {
#     "Authorization": f"Basic {authorization}",
#     "Content-Type": "application/x-www-form-urlencoded"
# }
# request_body = {
#     "grant_type": "client_credentials"
# }

# # Get token
# response = requests.post("https://login.mypurecloud.de/oauth/token", data=request_body, headers=request_headers)

# # Check response
# if response.status_code == 200:
#     print("Got token")
# else:
#     print(f"Failure: { str(response.status_code) } - { response.reason }")
#     sys.exit(response.status_code)

# # Get JSON response body
# response_json = response.json()
# print(response_json)


# # Prepare for GET /api/v2/authorization/roles request
# requestHeaders = {
#     "Authorization": f"{ response_json['token_type'] } { response_json['access_token']}"
# }

# # Get roles
# response = requests.get("https://api.mypurecloud.de/api/v2/authorization/roles", headers=requestHeaders)

# # Check response
# if response.status_code == 200:
#     print("Got roles")
# else:
#     print(f"Failure: { str(response.status_code) } - { response.reason }")
#     sys.exit(response.status_code)

# # Print roles
# print("\nRoles:")
# for entity in response.json()["entities"]:
#     print(f"  { entity['name'] }")

# # Get roles
# response = requests.get("https://api.mypurecloud.de/api/v2/analytics/conversations/details", headers=requestHeaders)
# print(response.json())

# print("\nDone")


