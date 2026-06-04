path = '/home/afanuel/my_nsa_desk/apps/web/.env.local'
with open(path, 'r') as f:
    content = f.read()

# vars to add if missing
to_add = {
    'NEXT_PUBLIC_AZURE_POST_LOGOUT_REDIRECT_URI': 'https://dev-mydesk.nsa.org.na/',
    'NEXT_PUBLIC_AZURE_API_SCOPE': 'api://3c2914fe-2bab-4c24-b0e8-a3a394022859/access_as_user',
    'MICROSOFT_CLIENT_ID': '39aa72fc-14a4-48be-b263-4624fea34018',
    'MICROSOFT_TENANT_ID': '8d5664e4-f94a-4f3b-a9eb-da674717443b',
    'NEXT_PUBLIC_WEB_URL': 'https://dev-mydesk.nsa.org.na',
    'NEXT_PUBLIC_API_URL': 'https://dev-mydesk.nsa.org.na',
    'SESSION_MAX_AGE': '604800000',
    'INTERNAL_API_URL': 'http://localhost:34567',
}

for key, val in to_add.items():
    if key not in content:
        content += key + '=' + val + '\n'
        print('Added: ' + key)
    else:
        print('Already present: ' + key)

with open(path, 'w') as f:
    f.write(content)

print('\nFinal .env.local:')
print(content)
