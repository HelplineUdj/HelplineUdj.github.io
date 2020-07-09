#!/usr/bin/env python
import requests

url = "https://dev69517.service-now.com/api/now/table/sys_user?mobile_phone=33627083847"

payload = {}
headers = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Authorization': 'Bearer UG_XJYV1g1JLFLTe90cL8s3OIdfxFr1zcdRmdQYX7j4kq9OdY_K_975jKxkb2C4ZTS730bkkOEjsNvK3yARgeQ',
  'Cookie': 'glide_user_route=glide.90e60ed4fb4511e25587a1f56affb556; BIGipServerpool_dev69517=2659211274.1857.0000; JSESSIONID=F29F2B43A02B56E124A98EE8F8745B92; glide_user_activity=U0N2MzpOT0tSQ1haSHZIdGdjL0poQnNRMG5SUVBaaDVJbmxTcjpWOUpWMHI4RENZSXY0L1RycTlwWmUxOUZYYUo1K2NwM2oyenRPaUc2RHJVPQ==; glide_session_store=A363F2F2DB3D101090B99FD2CA96199F; __CJ_g_startTime=%221594199529368%22'
}

response = requests.request("GET", url, headers=headers, data = payload)

print(response.text.encode('utf8'))
