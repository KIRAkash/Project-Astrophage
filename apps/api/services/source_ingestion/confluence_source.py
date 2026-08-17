import requests
from urllib.parse import urlparse

def fetch_confluence_space(space_url: str, api_token: str) -> str:
    if not api_token:
        return "Confluence token not provided."
        
    parsed = urlparse(space_url)
    domain = f"{parsed.scheme}://{parsed.netloc}"
    space_key = space_url.split('/')[-1]
    
    api_url = f"{domain}/wiki/api/v2/spaces/{space_key}/pages"
    
    headers = {
        'Authorization': f'Basic {api_token}',
        'Accept': 'application/json'
    }
    
    response = requests.get(api_url, headers=headers)
    if response.status_code != 200:
        return f"Error fetching space: {response.text}"
        
    pages = response.json().get('results', [])
    content = f"--- Confluence Space: {space_key} ---\n\n"
    
    for page in pages:
        page_id = page['id']
        page_title = page['title']
        body_url = f"{domain}/wiki/api/v2/pages/{page_id}?body-format=storage"
        body_resp = requests.get(body_url, headers=headers)
        if body_resp.status_code == 200:
            body_data = body_resp.json()
            body_content = body_data.get('body', {}).get('storage', {}).get('value', '')
            content += f"\n\n--- Page: {page_title} ---\n{body_content}"
            
    return content
