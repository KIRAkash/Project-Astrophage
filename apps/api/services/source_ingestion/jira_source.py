import requests
from urllib.parse import urlparse

def fetch_jira_project(jira_url: str, api_token: str) -> str:
    if not api_token:
        return "Jira token not provided."
        
    parsed = urlparse(jira_url)
    domain = f"{parsed.scheme}://{parsed.netloc}"
    project_key = jira_url.split('/')[-1]
    
    headers = {
        'Authorization': f'Basic {api_token}',
        'Accept': 'application/json'
    }
    
    jql = f"project = {project_key} AND type in (Epic, Story, Task) ORDER BY created DESC"
    url = f"{domain}/rest/api/2/search?jql={jql}&maxResults=100"
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return f"Error fetching Jira project: {response.text}"
        
    issues = response.json().get('issues', [])
    content = f"--- Jira Project: {project_key} ---\n\n"
    
    for issue in issues:
        key = issue['key']
        summary = issue['fields'].get('summary', '')
        description = issue['fields'].get('description', '')
        i_type = issue['fields'].get('issuetype', {}).get('name', '')
        content += f"\n\n--- [{i_type}] {key}: {summary} ---\n{description}"
        
    return content
