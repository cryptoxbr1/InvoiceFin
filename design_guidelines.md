# Design Guidelines: AI-Powered Invoice Financing Platform

## Design Approach
**System Selected:** Carbon Design System (IBM)  
**Rationale:** Enterprise-grade fintech application requiring data-heavy interfaces, complex workflows, and professional trust signals. Carbon excels at financial dashboards, transaction management, and business tools.

## Design Principles
1. **Trust & Transparency:** Financial data must be clear, accurate, and immediately verifiable
2. **Efficiency First:** Minimize clicks for core workflows (upload invoice → get funded)
3. **Data Clarity:** Dense information presented with strong hierarchy and scannable layouts
4. **Professional Authority:** Enterprise-grade aesthetics that signal security and reliability

---

## Core Design Elements

### A. Typography
- **Primary Font:** IBM Plex Sans (system font)
- **Headings:** 
  - H1: text-4xl font-semibold (Dashboard titles)
  - H2: text-2xl font-semibold (Section headers)
  - H3: text-xl font-medium (Card titles)
- **Body:** text-base font-normal (Default content)
- **Data/Numbers:** text-lg font-mono (Financial figures, amounts)
- **Labels:** text-sm font-medium uppercase tracking-wide (Form labels, table headers)
- **Captions:** text-xs (Timestamps, helper text)

### B. Layout System
- **Spacing Scale:** Tailwind units of 2, 4, 6, 8, 12, 16 (p-4, m-6, gap-8, etc.)
- **Container Strategy:**
  - Full app wrapper: `max-w-screen-2xl mx-auto`
  - Content sections: `px-6 lg:px-8`
  - Card padding: `p-6`
  - Form spacing: `space-y-4`
- **Grid Systems:**
  - Dashboard: `grid-cols-1 lg:grid-cols-3` (sidebar + main content)
  - Metrics cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
  - Tables: Full-width responsive with horizontal scroll

### C. Component Library

**Navigation:**
- **Sidebar:** Fixed left, w-64, dark treatment with nav items using subtle hover states
- **Top Bar:** Sticky header with breadcrumbs, user profile, notification bell
- **Breadcrumbs:** Current page context with clickable hierarchy

**Data Display:**
- **Metric Cards:** Elevated cards (shadow-sm) with large number (text-3xl font-bold), label, and trend indicator (↑/↓ with percentage)
- **Tables:** Striped rows, sticky header, sortable columns, row hover states, action buttons aligned right
- **Status Badges:** Rounded-full px-3 py-1 with semantic meanings (pending/yellow, financed/blue, repaid/green, rejected/red)
- **Transaction List:** Timeline-style with timestamps, amounts in monospace, Polygon explorer links

**Forms:**
- **Input Fields:** Border-based with clear labels above, helper text below, error states in semantic red
- **File Upload:** Drag-drop zone with dashed border, preview thumbnails, Gemini AI processing indicator
- **Multi-Step Forms:** Progress stepper at top (Business Info → Invoice Details → Review → Submit)
- **Validation:** Inline real-time with success checkmarks and error messages

**Interactive Elements:**
- **Primary CTA:** Solid button, prominent size (px-6 py-3), used for "Finance Invoice," "Submit"
- **Secondary Actions:** Ghost/outline buttons for "Cancel," "View Details"
- **Data Actions:** Icon buttons (eye, download, external link) in table rows
- **Modals:** Centered overlay with backdrop blur, slide-in animation for confirmations

**Dashboard Widgets:**
- **Cash Flow Chart:** Line/area chart showing 30-day trend with Recharts library
- **Invoice Status Distribution:** Donut chart with percentages
- **Recent Activity Feed:** Scrollable list with avatar icons, timestamps, action descriptions
- **Risk Score Display:** Circular progress indicator (0-100) with AI badge

**Blockchain Integration:**
- **Wallet Connection:** Prominent button in top-right with address truncation (0x1234...5678)
- **Transaction Status:** Live indicator showing Polygon confirmations with network icon
- **Gas Fee Display:** Small badge showing current network fees
- **Explorer Links:** External link icons to PolygonScan for transparency

### D. Layout Specifications

**Dashboard Homepage:**
- Top bar with wallet connection (right), notifications (right)
- Sidebar navigation (left, fixed)
- Main content area with 4-column metrics grid, 2-column chart + activity feed, full-width invoice table

**Invoice Upload Flow:**
- Centered container (max-w-3xl)
- Multi-step progress indicator
- Large file drop zone with instant Gemini AI analysis feedback
- Preview panel showing extracted data with editable fields
- Summary confirmation before blockchain submission

**Business Registration:**
- 2-column layout (form left, requirements/help right)
- Progressive disclosure (expand sections as needed)
- KYC verification status indicator
- Auto-save draft functionality with timestamp

**Transaction Detail View:**
- Full-width header with invoice metadata
- 2-column split: Invoice details (left 2/3) + Blockchain proof (right 1/3)
- Embedded PDF viewer or image preview
- Timeline of all status changes with blockchain confirmations

---

## Images
**No hero images needed** - this is a dashboard application, not marketing site. Use:
- Placeholder avatars for user profiles (via DiceBear API)
- Invoice document thumbnails (actual uploaded files)
- Company logos in business profiles
- Gemini AI "processing" animation/icon during analysis
- Empty state illustrations for "No invoices yet" (Undraw.co or similar)

---

## Key UX Patterns
- **First-Time Setup:** Guided onboarding flow (Connect Wallet → Register Business → Upload First Invoice)
- **Quick Actions:** Floating "Upload Invoice" button always accessible
- **Live Updates:** WebSocket connection showing real-time Polygon transactions
- **Skeleton Loading:** Placeholder states for async data (tables, charts)
- **Error Handling:** Toast notifications for failures, retry mechanisms
- **Confirmation Dialogs:** Before critical actions (submit for financing, withdraw funds)