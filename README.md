# SessionNotesLWC

**SBDC New Session — Lightning Web Component**
Michigan SBDC at Grand Valley State University

---

## Overview

This LWC replaces the Salesforce Screen Flows used to create `Session__c` records from both Case and Impact (Opportunity) records. It was built to address a key user workflow need: the ability to **paste Gemini-formatted notes and review/edit them in full before saving**, without the constraint of a small rich text editor box.

---

## Project Paths

| | Path |
|---|---|
| **Local project** | `C:\Users\MauriceJDavis\SessionNotesLWC\sbdc-new-session` |
| **GitHub** | https://github.com/mauricedavis/SessionNotesLWC |
| **Salesforce org** | Michigan SBDC at Grand Valley State University (`fullsb` sandbox) |
| **LWC bundle path** | `force-app\main\default\lwc\sbdcNewSession\` |

---

## LWC Bundle Files

```
force-app/
└── main/
    └── default/
        └── lwc/
            └── sbdcNewSession/
                ├── sbdcNewSession.html          # Template (2-step wizard)
                ├── sbdcNewSession.js            # Controller
                ├── sbdcNewSession.css           # Styles
                └── sbdcNewSession.js-meta.xml   # Metadata / target config
```

---

## Wizard Flow

### Step 1 — New Session
All session entry fields on a single screen, mirroring the original flow layout:

- Session Date & Time *(required, defaults to now)*
- Session Site
- Area of Counseling *(picklist)*
- Session Type *(picklist — drives validation rules)*
- Delivery Type *(picklist)*
- Business Status *(picklist — auto-defaults to "In Business" when Account qualifies)*
- Contact Hours / Prep Hours / Travel Hours / Travel Distance *(4-up row)*
- Verified / Exporting *(checkboxes)*
- Program Funding / Sub-Program *(auto-assigned from `$User.Center_Region__c`)*
- Language / Language - Other
- **Notes Guidelines toggle** *(off by default — user can enable if needed)*
- **Session Notes** *(full-width rich text editor)*

### Step 2 — Review & Save
- Compact summary grid of all session details with an **Edit** button to go back
- **Full-width editable rich text editor** for final notes review and editing
- Save Session button creates the `Session__c` record

---

## Context Awareness (Case vs Impact)

The component is context-aware and works from both Case and Impact (Opportunity) records. Context is set via a `context` property in the Quick Action / page target config.

| Context | `context` value | Record loaded | Session fields set |
|---|---|---|---|
| Case | `Case` | `Case` | `Case__c`, `Account__c`, `Contact__c` |
| Impact | `Impact` | `Opportunity` → `Account`, `Case` | `Impact__c`, `Case__c`, `Account__c`, `Contact__c` |

Sub-Program is auto-assigned based on `$User.Center_Region__c`:

| Center Region | Sub-Program |
|---|---|
| Tech Center | Tech Consultant |
| Growth Center | G2 |
| SBSH Consulting Team Region | SSBCI |

---

## Validation Rules (mirrored from original flows)

- Session Date & Time, Area of Counseling, Session Type, Delivery Type, Business Status, Language — all required
- `Counseling: Initial` — Contact Hours must be ≥ 0.5
- `Counseling: Follow On` — Contact Hours cannot exceed 8
- Prep Hours cannot be 0; cannot exceed 8 for `Counseling: Initial`
- Notes cannot be empty

> **Note:** The eRFC completeness check and duplicate Initial/Follow On session guards (previously in the flow's decision logic) are not yet implemented in the LWC. These are candidates for a future Apex-backed enhancement.

---

## Deployment

### Prerequisites
- Salesforce CLI (`sf`) installed
- VS Code with Salesforce Extension Pack
- Authorized sandbox org

### Authorize sandbox
```powershell
sf org login web --alias sbdc-fullsb --instance-url https://test.salesforce.com
```

### Deploy
```powershell
cd C:\Users\MauriceJDavis\SessionNotesLWC\sbdc-new-session
sf project deploy start --source-dir force-app --target-org sbdc-fullsb
```

### Post-deployment setup
1. Create a **Quick Action** on the `Case` object:
   - Type: LWC
   - LWC: `c:sbdcNewSession`
   - Set property `context` = `Case`
2. Create a **Quick Action** on the `Opportunity` object:
   - Type: LWC
   - LWC: `c:sbdcNewSession`
   - Set property `context` = `Impact`
3. Add both Quick Actions to their respective page layouts / Lightning pages

---

## GitHub Workflow

```powershell
cd C:\Users\MauriceJDavis\SessionNotesLWC\sbdc-new-session
git add .
git commit -m "your commit message here"
git push origin main
```

---

## Changelog

### 2026-02-24
- **Initial build** — 2-step wizard LWC created
- Single entry screen (Step 1) mirrors original flow layout exactly
- Notes Guidelines toggle (off by default) replaces always-visible guidelines block
- Review & Save screen (Step 2) with full-width editable rich text editor for notes review before save
- Context-aware: works from Case and Impact records
- Sub-Program auto-assignment from user Center Region preserved
- Picklists sourced dynamically from `Session__c` field metadata

---

## Background

The original session creation process used two Salesforce Screen Flows:
- `New Session: Create New Session from Case`
- `New Session: Create New Session from Impact`

Users reported that the Notes Guidelines block consumed excessive screen space, leaving a very small rich text editor for session notes. The primary user need was to paste formatted notes from the **Session Notes Summarizer Gem** (Google Gemini) and **review and edit the full notes in one place** before submitting. This LWC addresses that directly.
