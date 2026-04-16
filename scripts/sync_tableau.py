#!/usr/bin/env python3
"""
Tableau Cloud Sync Script
=========================
Pulls workbooks and views from Tableau Cloud and updates data/reports.json.

Prerequisites:
  pip install pyjwt requests

Environment variables required:
  TABLEAU_CONNECTED_APP_CLIENT_ID  - Connected App Client ID
  TABLEAU_CONNECTED_APP_SECRET_ID  - Connected App Secret ID
  TABLEAU_CONNECTED_APP_SECRET_VALUE - Connected App Secret Value
  TABLEAU_USER                     - Email of user to impersonate
  TABLEAU_SITE                     - Tableau site name (from URL)
  TABLEAU_SERVER                   - Tableau server URL (e.g., https://prod-useast-b.online.tableau.com)

Usage:
  python scripts/sync_tableau.py

Setup Guide:
  1. Log in to Tableau Cloud as Site Admin
  2. Go to Settings -> Connected Apps
  3. Click "New Connected App" -> "Direct Trust"
  4. Name it "report-hub-integration"
  5. Copy Client ID, Secret ID, and Secret Value
  6. Set the environment variables above
  7. Run this script manually or via GitHub Actions (see .github/workflows/sync-tableau.yml)
"""

import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

try:
    import jwt
    import requests
    import xml.etree.ElementTree as ET
except ImportError:
    print("Error: Missing dependencies. Run: pip install pyjwt requests")
    sys.exit(1)

# Tableau REST API XML namespace
NS = {"t": "http://tableau.com/api"}


def get_env(key, required=True):
    """Get an environment variable or exit with a helpful message."""
    value = os.environ.get(key)
    if required and not value:
        print(f"Error: {key} environment variable is not set.")
        print(f"See the setup guide at the top of this script.")
        sys.exit(1)
    return value


def create_jwt_token():
    """Create a JWT token for Tableau Connected App authentication."""
    client_id = get_env("TABLEAU_CONNECTED_APP_CLIENT_ID")
    secret_id = get_env("TABLEAU_CONNECTED_APP_SECRET_ID")
    secret_value = get_env("TABLEAU_CONNECTED_APP_SECRET_VALUE")
    user = get_env("TABLEAU_USER")

    now = int(time.time())
    token = jwt.encode(
        {
            "iss": client_id,
            "exp": now + 600,  # 10 minutes
            "jti": str(uuid.uuid4()),
            "aud": "tableau",
            "sub": user,
            "scp": ["tableau:content:read"],
            "iat": now,
        },
        secret_value,
        algorithm="HS256",
        headers={
            "kid": secret_id,
            "iss": client_id,
        },
    )
    return token


def sign_in(server, site, jwt_token):
    """Sign in to the Tableau REST API using XML payloads.

    Tries multiple API versions for compatibility.
    """
    api_versions = ["3.24", "3.22", "3.20", "3.19"]

    # Tableau REST API expects XML
    xml_payload = f"""
    <tsRequest>
      <credentials jwt="{jwt_token}">
        <site contentUrl="{site}" />
      </credentials>
    </tsRequest>
    """
    headers = {"Content-Type": "application/xml", "Accept": "application/xml"}

    for version in api_versions:
        url = f"{server}/api/{version}/auth/signin"
        print(f"   Trying API version {version}...")
        response = requests.post(url, data=xml_payload, headers=headers)

        if response.status_code == 200:
            root = ET.fromstring(response.text)
            cred = root.find(".//t:credentials", NS)
            site_elem = cred.find("t:site", NS)
            print(f"   Success with API version {version}")
            return {
                "token": cred.get("token"),
                "site_id": site_elem.get("id"),
                "api_version": version,
            }
        else:
            print(f"   API {version}: {response.status_code} - {response.text[:300]}")

    print(f"\n   ERROR: All API versions failed.")
    print(f"   Server: {server}")
    print(f"   Site: {site}")
    print(f"   Common fixes:")
    print(f"   - Verify the Connected App is 'Enabled' (not 'Disabled') in Tableau settings")
    print(f"   - Ensure TABLEAU_USER email matches exactly (case-sensitive)")
    print(f"   - Check that the user has at least Explorer role on the site")
    print(f"   - Verify the Connected App has 'All projects' access scope")
    sys.exit(1)


def get_workbooks(server, site_id, auth_token, api_version="3.24"):
    """Fetch all workbooks from Tableau Cloud (XML parsing)."""
    url = f"{server}/api/{api_version}/sites/{site_id}/workbooks"
    headers = {"X-Tableau-Auth": auth_token, "Accept": "application/xml"}
    params = {"pageSize": 100}

    all_workbooks = []
    page = 1

    while True:
        params["pageNumber"] = page
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()

        root = ET.fromstring(response.text)
        pagination = root.find(".//t:pagination", NS)
        total = int(pagination.get("totalAvailable", "0"))

        for wb in root.findall(".//t:workbook", NS):
            owner_elem = wb.find("t:owner", NS)
            project_elem = wb.find("t:project", NS)
            all_workbooks.append({
                "id": wb.get("id", ""),
                "name": wb.get("name", ""),
                "description": wb.get("description", ""),
                "contentUrl": wb.get("contentUrl", ""),
                "createdAt": wb.get("createdAt", ""),
                "updatedAt": wb.get("updatedAt", ""),
                "owner": {
                    "name": owner_elem.get("name", "Unknown") if owner_elem is not None else "Unknown",
                    "email": owner_elem.get("name", "unknown") if owner_elem is not None else "unknown",
                },
                "project": {
                    "name": project_elem.get("name", "General") if project_elem is not None else "General",
                },
            })

        if len(all_workbooks) >= total:
            break
        page += 1

    return all_workbooks


def download_thumbnail(server, site_id, auth_token, workbook_id, output_path, api_version="3.24"):
    """Download a workbook preview image."""
    url = f"{server}/api/{api_version}/sites/{site_id}/workbooks/{workbook_id}/previewImage"
    headers = {"X-Tableau-Auth": auth_token}

    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(response.content)
        return True
    return False


def workbook_to_report(workbook, server, site):
    """Convert a Tableau workbook to our report format."""
    wb_id = workbook["id"][:8]
    content_url = workbook.get("contentUrl", "")
    owner = workbook.get("owner", {})

    return {
        "id": f"tab-{wb_id}",
        "name": workbook["name"],
        "description": workbook.get("description", f"Tableau workbook: {workbook['name']}"),
        "thumbnail": f"thumbnails/tab-{wb_id}.png",
        "url": f"{server}/site/{site}/views/{content_url}",
        "source": "tableau",
        "bu": workbook.get("project", {}).get("name", "General"),
        "category": "General",
        "tags": ["tableau", "auto-synced"],
        "owner": {
            "name": owner.get("name", "Unknown"),
            "email": owner.get("email", owner.get("name", "unknown")),
        },
        "certification": {
            "status": "none",
            "certified_by": None,
            "certified_at": None,
        },
        "access": {"restricted": False},
        "last_refreshed_at": workbook.get("updatedAt", datetime.now(timezone.utc).isoformat()),
        "created_at": workbook.get("createdAt", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "updated_at": workbook.get("updatedAt", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
    }


def load_existing_reports(reports_path):
    """Load existing reports.json."""
    if not os.path.exists(reports_path):
        return {"reports": [], "categories": [], "business_units": [], "sources": []}

    with open(reports_path, "r") as f:
        return json.load(f)


def merge_reports(existing_data, new_tableau_reports):
    """Merge new Tableau reports into existing data, preserving manual entries and certifications."""
    existing_reports = existing_data["reports"]
    existing_by_id = {r["id"]: r for r in existing_reports}

    merged = []

    # Keep all non-Tableau reports unchanged
    for report in existing_reports:
        if not report["id"].startswith("tab-"):
            merged.append(report)

    # For Tableau reports, update or add
    for new_report in new_tableau_reports:
        existing = existing_by_id.get(new_report["id"])
        if existing:
            # Preserve certification status and manual overrides
            new_report["certification"] = existing["certification"]
            new_report["bu"] = existing.get("bu", new_report["bu"])
            new_report["category"] = existing.get("category", new_report["category"])
            new_report["tags"] = existing.get("tags", new_report["tags"])
            new_report["access"] = existing.get("access", new_report["access"])
            if existing.get("description") and existing["description"] != f"Tableau workbook: {existing['name']}":
                new_report["description"] = existing["description"]
        merged.append(new_report)

    existing_data["reports"] = merged
    return existing_data


def main():
    """Main sync function."""
    print("=" * 60)
    print("Tableau Cloud -> Report Registry Sync")
    print("=" * 60)

    server = get_env("TABLEAU_SERVER")
    site = get_env("TABLEAU_SITE")
    project_root = Path(__file__).parent.parent
    reports_path = project_root / "data" / "reports.json"
    thumbnails_dir = project_root / "public" / "thumbnails"

    # Step 1: Authenticate
    print("\n1. Authenticating with Tableau Cloud...")
    jwt_token = create_jwt_token()
    auth = sign_in(server, site, jwt_token)
    api_version = auth["api_version"]
    print(f"   Authenticated. Site ID: {auth['site_id'][:8]}... (API {api_version})")

    # Step 2: Fetch workbooks
    print("\n2. Fetching workbooks...")
    workbooks = get_workbooks(server, auth["site_id"], auth["token"], api_version)
    print(f"   Found {len(workbooks)} workbooks")

    # Step 3: Convert to report format
    print("\n3. Converting to report format...")
    new_reports = [workbook_to_report(wb, server, site) for wb in workbooks]

    # Step 4: Download thumbnails
    print("\n4. Downloading thumbnails...")
    for wb, report in zip(workbooks, new_reports):
        thumb_path = thumbnails_dir / f"tab-{wb['id'][:8]}.png"
        if download_thumbnail(server, auth["site_id"], auth["token"], wb["id"], str(thumb_path), api_version):
            print(f"   Downloaded: {report['name']}")
        else:
            print(f"   Skipped (no preview): {report['name']}")

    # Step 5: Merge with existing
    print("\n5. Merging with existing registry...")
    existing = load_existing_reports(str(reports_path))
    merged = merge_reports(existing, new_reports)
    print(f"   Total reports after merge: {len(merged['reports'])}")

    # Step 6: Save
    print("\n6. Saving updated reports.json...")
    os.makedirs(os.path.dirname(reports_path), exist_ok=True)
    with open(reports_path, "w") as f:
        json.dump(merged, f, indent=2)
    print(f"   Saved to {reports_path}")

    print("\n" + "=" * 60)
    print("Sync complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
