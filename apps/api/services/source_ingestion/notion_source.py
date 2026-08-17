import requests
import re

def fetch_notion_page(notion_url: str, api_token: str) -> str:
    if not api_token:
        return "Notion token not provided."
        
    match = re.search(r'-([a-f0-9]{32})$', notion_url)
    if not match:
        match = re.search(r'([a-f0-9]{32})$', notion_url)
    if not match:
        return "Invalid Notion URL format"
        
    page_id = match.group(1)
    
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
    }
    
    def get_blocks(block_id: str) -> str:
        url = f"https://api.notion.com/v1/blocks/{block_id}/children"
        resp = requests.get(url, headers=headers)
        if resp.status_code != 200:
            return ""
        
        blocks = resp.json().get('results', [])
        text = ""
        for block in blocks:
            b_type = block['type']
            if b_type in block and 'rich_text' in block[b_type]:
                rich_texts = block[b_type]['rich_text']
                for rt in rich_texts:
                    text += rt['plain_text']
                text += "\n"
            if block.get('has_children'):
                text += get_blocks(block['id'])
        return text
        
    return f"--- Notion Page: {page_id} ---\n\n" + get_blocks(page_id)
