import re
import logging
from typing import Dict, List, Set, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class LintIssue(BaseModel):
    category: str  # 'schema', 'wikilink', 'orphan', 'index', 'stub', 'security'
    severity: str  # 'error', 'warning', 'info'
    file_path: str
    message: str
    line_number: Optional[int] = None

class LintReport(BaseModel):
    is_valid: bool = True
    total_files: int = 0
    errors: List[LintIssue] = Field(default_factory=list)
    warnings: List[LintIssue] = Field(default_factory=list)
    stats: Dict[str, int] = Field(default_factory=dict)


def check_schemas(files: Dict[str, str]) -> List[LintIssue]:
    """Validate that OpenKB pages adhere to structural schema requirements."""
    issues = []
    
    # Required sections for specific folders
    schema_rules = {
        'decisions/': ['## Status', '## Context', '## Decision'],
        'entities/': ['## Responsibilities', '## Dependencies'],
    }
    
    for path, content in files.items():
        for prefix, required_sections in schema_rules.items():
            if path.startswith(prefix) and path.endswith('.md'):
                for section in required_sections:
                    if section.lower() not in content.lower():
                        issues.append(
                            LintIssue(
                                category='schema',
                                severity='warning',
                                file_path=path,
                                message=f"Missing recommended section header: '{section}'",
                            )
                        )
    return issues


def check_wikilinks(
    files: Dict[str, str],
    valid_cross_kb_targets: Optional[Set[str]] = None
) -> tuple[List[LintIssue], Dict[str, Set[str]]]:
    """Verify that all [[wikilinks]] point to existing files (or valid cross-KB repositories) and return inbound link map."""
    issues = []
    
    # Build set of valid link targets (with and without .md extension)
    valid_targets = set()
    for path in files.keys():
        clean_name = path.replace('.md', '')
        valid_targets.add(clean_name)
        valid_targets.add(path)
        valid_targets.add(clean_name.split('/')[-1])
        
    inbound_links: Dict[str, Set[str]] = {p: set() for p in files.keys()}
    link_pattern = re.compile(r'\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]')

    for path, content in files.items():
        # Strip fenced code blocks and inline code spans to avoid checking code examples
        clean_content = re.sub(r'```[\s\S]*?```', '', content)
        clean_content = re.sub(r'`[^`\n]+`', '', clean_content)
        
        matches = link_pattern.findall(clean_content)
        for target in matches:
            target_clean = target.strip().replace('.md', '')
            
            # Handle Cross-KB Links: [[ap:<repo>/<path>]] or [[kb:<app>/<path>]]
            if target_clean.startswith('ap:') or target_clean.startswith('kb:'):
                prefix_len = 3
                parts = target_clean[prefix_len:].split('/', 1)
                if len(parts) == 2 and parts[0].strip() and parts[1].strip():
                    # Valid cross-KB link format
                    continue
                else:
                    issues.append(
                        LintIssue(
                            category='wikilink',
                            severity='error',
                            file_path=path,
                            message=f"Malformed cross-KB wikilink: '[[{target}]]'. Expected format: [[ap:<repo-name>/<page-path>]].",
                        )
                    )
                continue


            target_leaf = target_clean.split('/')[-1]
            
            matched_file = None
            for p in files.keys():
                p_clean = p.replace('.md', '')
                if p_clean == target_clean or p == target or p_clean.split('/')[-1] == target_leaf:
                    matched_file = p
                    break
                    
            if matched_file:
                inbound_links[matched_file].add(path)
            else:
                issues.append(
                    LintIssue(
                        category='wikilink',
                        severity='error',
                        file_path=path,
                        message=f"Broken wikilink: '[[{target}]]' does not resolve to any page in the knowledge base.",
                    )
                )

    return issues, inbound_links


def check_orphans_and_stubs(files: Dict[str, str], inbound_links: Dict[str, Set[str]]) -> List[LintIssue]:
    """Flag pages with 0 inbound backlinks (excluding root files) or under-specified stub content."""
    issues = []
    exempt_from_orphan_check = {'index.md', 'AGENTS.md', 'log.md', '.astrophage/brief.md'}

    for path, content in files.items():
        words = content.split()
        if len(words) < 25 and path.endswith('.md') and path not in exempt_from_orphan_check:
            issues.append(
                LintIssue(
                    category='stub',
                    severity='warning',
                    file_path=path,
                    message=f'Page is an under-specified stub ({len(words)} words). Minimum recommended is 25 words.',
                )
            )

        if path not in exempt_from_orphan_check and path.endswith('.md'):
            incoming = inbound_links.get(path, set())
            if len(incoming) == 0:
                issues.append(
                    LintIssue(
                        category='orphan',
                        severity='warning',
                        file_path=path,
                        message='Orphan page: No other pages contain a [[wikilink]] pointing to this page.',
                    )
                )

    return issues


def check_index_coverage(files: Dict[str, str]) -> List[LintIssue]:
    """Ensure every content markdown file is referenced in index.md."""
    issues = []
    index_content = files.get('index.md', '')
    exempt_from_index = {'index.md', 'AGENTS.md', 'log.md', '.astrophage/brief.md'}

    for path in files.keys():
        if path not in exempt_from_index and path.endswith('.md'):
            slug = path.replace('.md', '')
            leaf = slug.split('/')[-1]
            if slug not in index_content and leaf not in index_content:
                issues.append(
                    LintIssue(
                        category='index',
                        severity='warning',
                        file_path=path,
                        message="Page is missing from 'index.md' navigation overview.",
                    )
                )

    return issues


def check_secrets_and_pii(files: Dict[str, str]) -> List[LintIssue]:
    """Screen generated markdown for accidental leakage of API keys, private keys, or passwords."""
    issues = []
    patterns = [
        (r'-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----', 'Private Key block detected'),
        (r'(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}', 'GitHub Personal Access Token detected'),
        (r'sk-[a-zA-Z0-9]{32,}', 'API Secret Key pattern detected'),
        (r'AIza[0-9A-Za-z-_]{35}', 'Google API Key detected'),
    ]

    for path, content in files.items():
        for pattern, label in patterns:
            if re.search(pattern, content):
                issues.append(
                    LintIssue(
                        category='security',
                        severity='error',
                        file_path=path,
                        message=f'Security alert: {label}',
                    )
                )

    return issues


def run_linter(files: Dict[str, str], plan: Optional[list] = None) -> LintReport:
    """Run all deterministic quality gates across the knowledge base files."""
    report = LintReport(total_files=len(files))
    
    schema_issues = check_schemas(files)
    wikilink_issues, inbound_links = check_wikilinks(files)
    orphan_stub_issues = check_orphans_and_stubs(files, inbound_links)
    index_issues = check_index_coverage(files)
    security_issues = check_secrets_and_pii(files)
    
    all_issues = schema_issues + wikilink_issues + orphan_stub_issues + index_issues + security_issues
    
    for issue in all_issues:
        if issue.severity == 'error':
            report.errors.append(issue)
        else:
            report.warnings.append(issue)
            
    report.is_valid = len(report.errors) == 0
    report.stats = {
        'total_files': len(files),
        'total_errors': len(report.errors),
        'total_warnings': len(report.warnings),
        'total_wikilinks': sum(len(links) for links in inbound_links.values()),
    }
    
    return report
