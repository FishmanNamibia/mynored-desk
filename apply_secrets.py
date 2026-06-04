import base64
b64 = open('/tmp/secrets.b64').read().strip()
secrets = base64.b64decode(b64).decode()
path = '/home/afanuel/my_nsa_desk/apps/web/.env.local'
with open(path, 'r') as f:
    existing = f.read()
added = []
for line in secrets.splitlines():
    key = line.split('=')[0]
    if key and key not in existing:
        existing += line + '\n'
        added.append(key)
with open(path, 'w') as f:
    f.write(existing)
print('Added: ' + ', '.join(added) if added else 'Already present')
print('Done.')
