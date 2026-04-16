#!/usr/bin/env python3
"""
Tableau Cloud Sync Script
=========================
Pulls workbooks and views from [PROD] projects in Tableau Cloud
and updates data/reports.json.

Prerequisites:
  pip install pyjwt requests

Environment variables required:
  TABLEAU_CONNECTED_APP_CLIENT_ID  - Connected App Client ID
  TABLEAU_CONNECTED_APP_SECRET_ID  - Connected App Secret ID
  TABLEAU_CONNECTED_APP_SECRET_VALUE - Connected App Secret Value
  TABLEAU_USER                     - Email of user to impersonate
  TABLEAU_SITE                     - Tableau site name (from URL)
  TABLEAU_SERVER                   - Tableau server URL (e.g., https://10ay.online.tableau.com)

Usage:
  python scripts/sync_tableau.py
"""

import json
import os
import re
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
            "exp": now + 600,
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
    """Sign in to the Tableau REST API using XML payloads."""
    api_versions = ["3.24", "3.22", "3.20", "3.19"]

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
    print(f"   Common fixes:")
    print(f"   - Verify the Connected App is 'Enabled'")
    print(f"   - Ensure TABLEAU_USER email matches exactly")
    print(f"   - Check that the user has at least Explorer role")
    sys.exit(1)


def get_workbooks(server, site_id, auth_token, api_version="3.24"):
    """Fetch all workbooks from [PROD] projects only."""
    url = f"{server}/api/{api_version}/sites/{site_id}/workbooks"
    headers = {"X-Tableau-Auth": auth_token, "Accept": "application/xml"}
    params = {"pageSize": 100}

    all_workbooks = []
    skipped_non_prod = 0
    page = 1

    while True:
        params["pageNumber"] = page
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()

        root = ET.fromstring(response.text)
        pagination = root.find(".//t:pagination", NS)
        total = int(pagination.get("totalAvailable", "0"))

        for wb in root.findall(".//t:workbook", NS):
            project_elem = wb.find("t:project", NS)
            project_name = project_elem.get("name", "") if project_elem is not None else ""

            # FILTER: Only include workbooks from [PROD] projects
            if not project_name.startswith("[PROD]"):
                skipped_non_prod += 1
                continue

            owner_elem = wb.find("t:owner", NS)

            # Parse certification
            is_certified = wb.get("isCertified", "false").lower() == "true"
            certification_note = wb.get("certificationNote", "") or ""
            cert_status = "none"
            if is_certified:
                note_lower = certification_note.lower()
                if "bu" in note_lower and "enterprise" not in note_lower:
                    cert_status = "bu_certified"
                else:
                    cert_status = "enterprise_certified"

            all_workbooks.append({
                "id": wb.get("id", ""),
                "name": wb.get("name", ""),
                "description": wb.get("description", ""),
                "contentUrl": wb.get("contentUrl", ""),
                "createdAt": wb.get("createdAt", ""),
                "updatedAt": wb.get("updatedAt", ""),
                "isCertified": is_certified,
                "certificationNote": certification_note,
                "certStatus": cert_status,
                "owner": {
                    "name": owner_elem.get("name", "Unknown") if owner_elem is not None else "Unknown",
                    "email": owner_elem.get("name", "unknown") if owner_elem is not None else "unknown",
                },
                "project": {
                    "name": project_name,
                },
            })

        fetched_so_far = page * 100  # approximate
        if fetched_so_far >= total:
            break
        page += 1

    print(f"   Skipped {skipped_non_prod} workbooks from non-[PROD] projects")
    return all_workbooks


def get_workbook_details(server, site_id, auth_token, workbook_id, api_version="3.24"):
    """Fetch detailed info for a single workbook (includes certification fields)."""
    url = f"{server}/api/{api_version}/sites/{site_id}/workbooks/{workbook_id}"
    headers = {"X-Tableau-Auth": auth_token, "Accept": "application/xml"}

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return None

        root = ET.fromstring(response.text)
        wb = root.find(".//t:workbook", NS)
        if wb is None:
            return None

        is_certified = wb.get("isCertified", "false").lower() == "true"
        certification_note = wb.get("certificationNote", "") or ""
        description = wb.get("description", "") or ""

        return {
            "isCertified": is_certified,
            "certificationNote": certification_note,
            "description": description,
        }
    except Exception as e:
        print(f"   Warning: Could not fetch details for workbook {workbook_id}: {e}")
        return None


def get_views_for_workbook(server, site_id, auth_token, workbook_id, api_version="3.24"):
    """Fetch views for a specific workbook to get correct view URLs."""
    url = f"{server}/api/{api_version}/sites/{site_id}/workbooks/{workbook_id}/views"
    headers = {"X-Tableau-Auth": auth_token, "Accept": "application/xml"}

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return []

        root = ET.fromstring(response.text)
        views = []
        for view in root.findall(".//t:view", NS):
            views.append({
                "id": view.get("id", ""),
                "name": view.get("name", ""),
                "contentUrl": view.get("contentUrl", ""),
            })
        return views
    except Exception as e:
        print(f"   Warning: Could not fetch views for workbook {workbook_id}: {e}")
        return []


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


def build_tableau_url(server, site, workbook_content_url, view_content_url=None):
    """Build the correct Tableau Cloud URL for a view.

    Tableau Cloud URLs follow the format:
    https://10ay.online.tableau.com/#/site/amplitudeteamspace/views/WorkbookName/ViewName

    The view contentUrl from the API is in format: WorkbookName/ViewName
    """
    if view_content_url:
        # The API returns contentUrl as "WorkbookName/sheets/ViewName"
        # but Tableau Cloud browser URLs use "WorkbookName/ViewName" (no /sheets/)
        clean_url = view_content_url.replace("/sheets/", "/")
        return f"{server}/#/site/{site}/views/{clean_url}"
    else:
        # Fallback: use workbook contentUrl (links to first view)
        return f"{server}/#/site/{site}/workbooks/{workbook_content_url}"


def extract_bu_from_project(project_name):
    """Extract business unit from project name.

    Examples:
      '[PROD] Customer Intelligence' -> 'Customer Intelligence'
      '[PROD] Finance'               -> 'Finance'
      '[PROD] Sales / Pipeline'      -> 'Sales'
    """
    # Strip [PROD] prefix
    bu = re.sub(r'^\[PROD\]\s*', '', project_name).strip()
    # Take the first segment if separated by /
    if '/' in bu:
        bu = bu.split('/')[0].strip()
    return bu or project_name


def workbook_to_report(workbook, server, site, default_view_url=None):
    """Convert a Tableau workbook to our report format."""
    wb_id = workbook["id"][:8]
    content_url = workbook.get("contentUrl", "")
    owner = workbook.get("owner", {})
    cert_status = workbook.get("certStatus", "none")
    cert_note = workbook.get("certificationNote", "")
    project_name = workbook.get("project", {}).get("name", "General")

    # Build the correct URL
    url = build_tableau_url(server, site, content_url, default_view_url)

    # Extract BU from [PROD] project name
    bu = extract_bu_from_project(project_name)

    # Build tags
    tags = ["tableau", "auto-synced"]
    if cert_status == "enterprise_certified":
        tags.append("certified")
    elif cert_status == "bu_certified":
        tags.append("bu-certified")
    if cert_note:
        tags.append(cert_note.lower().replace(" ", "-")[:30])

    return {
        "id": f"tab-{wb_id}",
        "name": workbook["name"],
        "description": workbook.get("description", "") or f"Tableau workbook: {workbook['name']}",
        "thumbnail": f"thumbnails/tab-{wb_id}.png",
        "url": url,
        "source": "tableau",
        "bu": bu,
        "category": "General",
        "tags": tags,
        "owner": {
            "name": owner.get("name", "Unknown"),
            "email": owner.get("email", owner.get("name", "unknown")),
        },
        "certification": {
            "status": cert_status,
            "certified_by": "tableau" if cert_status != "none" else None,
            "certified_at": workbook.get("updatedAt", "")[:10] if cert_status != "none" else None,
            "source": "tableau_api",
            "note": cert_note if cert_note else None,
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
    """Merge new Tableau reports into existing data.

    Since Amplitude does not use Tableau's native certification API feature,
    certification is managed in the Hub (reports.json) and must be preserved
    across syncs. Category, access, description, and certification are all
    treated as hub-managed fields.
    """
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
            # Preserve hub-managed fields across syncs
            new_report["category"] = existing.get("category", new_report["category"])
            new_report["access"] = existing.get("access", new_report["access"])

            existing_desc = existing.get("description", "")
            if existing_desc and not existing_desc.startswith("Tableau workbook:"):
                new_report["description"] = existing_desc

            # IMPORTANT: Preserve certification set in the Hub.
            # Tableau does not use its native certification API, so
            # isCertified is always false. The Hub is the source of truth.
            existing_cert = existing.get("certification", {})
            if existing_cert.get("status", "none") != "none":
                new_report["certification"] = existing_cert

        merged.append(new_report)

    existing_data["reports"] = merged

    # Auto-update business_units list from actual data
    bus = sorted(set(r["bu"] for r in merged))
    existing_data["business_units"] = bus

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

    # Step 2: Fetch workbooks (only from [PROD] projects)
    print("\n2. Fetching workbooks from [PROD] projects...")
    workbooks = get_workbooks(server, auth["site_id"], auth["token"], api_version)
    print(f"   Found {len(workbooks)} workbooks in [PROD] projects")

    # Step 3: Fetch view URLs and workbook details (certification) for each workbook
    print("\n3. Fetching view URLs and certification details...")
    wb_view_urls = {}
    certified_count = 0
    for i, wb in enumerate(workbooks):
        # Fetch views for URL
        views = get_views_for_workbook(server, auth["site_id"], auth["token"], wb["id"], api_version)
        if views:
            wb_view_urls[wb["id"]] = views[0]["contentUrl"]

        # Fetch individual workbook details for certification
        # (the list endpoint may not include isCertified)
        details = get_workbook_details(server, auth["site_id"], auth["token"], wb["id"], api_version)
        if details:
            wb["isCertified"] = details["isCertified"]
            wb["certificationNote"] = details["certificationNote"]
            if details.get("description"):
                wb["description"] = details["description"]

            # Recalculate certification status from detail endpoint
            if details["isCertified"]:
                certified_count += 1
                note_lower = details["certificationNote"].lower()
                if "bu" in note_lower and "enterprise" not in note_lower:
                    wb["certStatus"] = "bu_certified"
                else:
                    wb["certStatus"] = "enterprise_certified"

        if (i + 1) % 10 == 0:
            print(f"   Processed {i + 1}/{len(workbooks)} workbooks...")
    print(f"   Got view URLs for {len(wb_view_urls)} workbooks")
    print(f"   Found {certified_count} certified workbooks out of {len(workbooks)}")

    # Step 4: Convert to report format
    print("\n4. Converting to report format...")
    new_reports = []
    for wb in workbooks:
        view_url = wb_view_urls.get(wb["id"])
        report = workbook_to_report(wb, server, site, default_view_url=view_url)
        new_reports.append(report)

    # Step 5: Download thumbnails
    print("\n5. Downloading thumbnails...")
    downloaded = 0
    for wb, report in zip(workbooks, new_reports):
        thumb_path = thumbnails_dir / f"tab-{wb['id'][:8]}.png"
        if download_thumbnail(server, auth["site_id"], auth["token"], wb["id"], str(thumb_path), api_version):
            downloaded += 1
    print(f"   Downloaded {downloaded} thumbnails, skipped {len(workbooks) - downloaded}")

    # Step 6: Merge with existing
    print("\n6. Merging with existing registry...")
    existing = load_existing_reports(str(reports_path))
    merged = merge_reports(existing, new_reports)
    print(f"   Total reports after merge: {len(merged['reports'])}")

    # Print BU summary
    bu_counts = {}
    for r in merged["reports"]:
        bu = r.get("bu", "Other")
        bu_counts[bu] = bu_counts.get(bu, 0) + 1
    print(f"\n   Reports by Business Unit:")
    for bu, count in sorted(bu_counts.items()):
        print(f"     {bu}: {count}")

    # Step 7: Save
    print("\n7. Saving updated reports.json...")
    os.makedirs(os.path.dirname(reports_path), exist_ok=True)
    with open(reports_path, "w") as f:
        json.dump(merged, f, indent=2)
    print(f"   Saved to {reports_path}")

    print("\n" + "=" * 60)
    print("Sync complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
