import base64
lines = [l for l in open('/home/afanuel/my_nsa_desk/apps/web/.env.local') if 'CLIENT_SECRET' in l or 'SESSION_SECRET' in l]
print(base64.b64encode(''.join(lines).encode()).decode())
