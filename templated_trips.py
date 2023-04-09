import json

import requests

cookies = {
}

headers = {
}
json_data = {
    'guest': '0',
    'alertType': 9,
    'dateRange': {
        'startDate': '20230101',
        'endDate': '20230408',
    },
}

response = requests.post(
    'https://owners.kia.com/apps/services/owners/mytrips/get/trip.html',
    cookies=cookies,
    headers=headers,
    json=json_data,
)
print(json.dumps(json.loads(response.text), indent=4))

# Note: json_data will not be serialized by requests
# exactly as it was in the original request.
#data = '{"guest":"0","alertType":9,"dateRange":{"startDate":"20230101","endDate":"20230408"}}'
#response = requests.post(
#    'https://owners.kia.com/apps/services/owners/mytrips/get/trip.html',
#    cookies=cookies,
#    headers=headers,
#    data=data,
#)


