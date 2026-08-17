from github import Github, InputGitTreeElement, GithubException
from ..core.config import settings
import base64

def get_github_client():
    return Github(settings.GITHUB_APP_TOKEN)

def provision_kb_repo(org_slug: str, app_name: str, github_org: str) -> str:
    g = get_github_client()
    org = g.get_organization(github_org) if github_org else g.get_user()
    repo_name = f"kb-{org_slug}-{app_name}"
    try:
        repo = org.create_repo(name=repo_name, private=True, auto_init=True)
    except GithubException:
        repo = org.get_repo(repo_name)
    return repo.html_url

def commit_kb_to_branch(repo_full_name: str, branch_name: str, kb_files: dict[str, str]):
    g = get_github_client()
    repo = g.get_repo(repo_full_name)
    
    try:
        repo.get_branch(branch_name)
    except GithubException:
        main_ref = repo.get_git_ref("heads/main")
        repo.create_git_ref(ref=f"refs/heads/{branch_name}", sha=main_ref.object.sha)
    
    branch_ref = repo.get_git_ref(f"heads/{branch_name}")
    branch_sha = branch_ref.object.sha
    base_tree = repo.get_git_tree(branch_sha)

    element_list = list()
    for filepath, content in kb_files.items():
        if not filepath: continue
        element = InputGitTreeElement(filepath.lstrip("/"), '100644', 'blob', content or "")
        element_list.append(element)

    if not element_list:
        return  # Nothing to commit

    tree = repo.create_git_tree(element_list, base_tree)
    parent = repo.get_git_commit(branch_sha)
    commit = repo.create_git_commit(f"Update KB for {branch_name}", tree, [parent])
    branch_ref.edit(commit.sha)

def open_pull_request(repo_full_name: str, branch: str, title: str, body: str) -> str:
    g = get_github_client()
    repo = g.get_repo(repo_full_name)
    pr = repo.create_pull(title=title, body=body, head=branch, base="main")
    return pr.html_url

def register_push_webhook(repo_full_name: str, webhook_url: str) -> str:
    g = get_github_client()
    repo = g.get_repo(repo_full_name)
    config = {
        "url": webhook_url,
        "content_type": "json",
        "secret": settings.WEBHOOK_SECRET
    }
    hook = repo.create_hook("web", config, ["push"], active=True)
    return str(hook.id)

def register_pr_webhook(repo_full_name: str, webhook_url: str) -> str:
    g = get_github_client()
    repo = g.get_repo(repo_full_name)
    config = {
        "url": webhook_url,
        "content_type": "json",
        "secret": settings.WEBHOOK_SECRET
    }
    hook = repo.create_hook("web", config, ["pull_request"], active=True)
    return str(hook.id)

def get_commit_diff(repo_full_name: str, commit_sha: str) -> str:
    g = get_github_client()
    repo = g.get_repo(repo_full_name)
    commit = repo.get_commit(commit_sha)
    diff = []
    for file in commit.files:
        diff.append(f"File: {file.filename}\nPatch: {file.patch}")
    return "\n".join(diff)

def provision_org_kb_repo(org_slug: str, github_org: str) -> str:
    return provision_kb_repo("org", org_slug, github_org)
