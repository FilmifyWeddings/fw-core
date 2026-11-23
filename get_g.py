import glob, json, urllib.request

env_vars = {}
for path in glob.glob('/var/www/fw-core/.env*'):
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    k, v = line.split('=', 1)
                    if k not in env_vars:
                        env_vars[k] = v.strip().strip("'").strip('"')
    except Exception as e:
        pass

supa_url = env_vars.get('NEXT_PUBLIC_SUPABASE_URL') or env_vars.get('SUPABASE_URL')
supa_key = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')
headers = {'apikey': supa_key, 'Authorization': f'Bearer {supa_key}'}

ws_id = 'f9359a12-3f2e-430c-9cec-2ec9841ec83e'
req = urllib.request.Request(f'{supa_url}/rest/v1/event_galleries?workspace_id=eq.{ws_id}&limit=2', headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        for g in data:
            print('Gallery:', g['id'], g['title'], g.get('slug'))
except Exception as e:
    print('Err:', e)
