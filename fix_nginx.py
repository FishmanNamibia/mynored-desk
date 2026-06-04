d = chr(36)
lines = [
    'server {',
    '    listen 80;',
    '    server_name dev-mydesk.nsa.org.na www.dev-mydesk.nsa.org.na;',
    '    return 301 https://' + d + 'host' + d + 'request_uri;',
    '}',
    '',
    'server {',
    '    listen 443 ssl http2;',
    '    server_name dev-mydesk.nsa.org.na www.dev-mydesk.nsa.org.na;',
    '',
    '    ssl_certificate /etc/nginx/ssl/fullchain.pem;',
    '    ssl_certificate_key /etc/nginx/ssl/privkey.pem;',
    '',
    '    location / {',
    '        proxy_pass https://172.16.192.243;',
    '        proxy_ssl_verify off;',
    '        proxy_set_header Host ' + d + 'host;',
    '        proxy_set_header X-Real-IP ' + d + 'remote_addr;',
    '        proxy_set_header X-Forwarded-For ' + d + 'proxy_add_x_forwarded_for;',
    '        proxy_set_header X-Forwarded-Proto ' + d + 'scheme;',
    '        proxy_http_version 1.1;',
    '        proxy_set_header Upgrade ' + d + 'http_upgrade;',
    '        proxy_set_header Connection upgrade;',
    '        proxy_read_timeout 300;',
    '        proxy_connect_timeout 300;',
    '        proxy_send_timeout 300;',
    '    }',
    '}',
    '',
]
config = '\n'.join(lines)
with open('/tmp/dev-mydesk-prod.conf', 'w') as f:
    f.write(config)
print('Written:')
print(config)
