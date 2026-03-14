

# Project Setu — Cross-Border Remittance Engine

## Overview
A full-stack remittance management system for the India-Nepal corridor, built on Supabase (Lovable Cloud) with the dark fintech aesthetic from the design brief, plus a light mode toggle.

---

## Phase 1: Foundation

### 1. Database Schema (Supabase)
- **user_roles** — RBAC with `admin`, `operator`, `viewer` roles (enum + separate table per security requirements)
- **senders** — Name, phone, address, worker ID, bank account, notes
- **receivers** — Name, phone, district, address, payment mode (eSewa/Bank/Cash/Khalti/IME), relationship, linked sender
- **transactions** — Date, sender, receiver, amount_inr, exchange_rate, amount_npr, commission, payment_method, status (pending/paid/cancelled)
- **daily_rates** — Date + INR→NPR rate
- **ledger_entries** — Double-entry: transaction_id, account (INDIAN_BANK, CASH_NPR, BANK_NPR, ESEWA_POOL, KHALTI_POOL), debit, credit
- **audit_logs** — user_id, action, entity, entity_id, payload, timestamp
- **RLS policies** on all tables using `has_role()` security definer function

### 2. Authentication
- Supabase Auth (email/password)
- Auto-create profile + default `operator` role on signup
- Admin can promote/demote users
- Login activity tracked in audit_logs

---

## Phase 2: Core UI

### 3. Design System
- Dark mode default (obsidian surfaces, minted green primary, settlement amber accent) with light mode toggle
- IBM Plex Mono for all numeric/financial data (`tabular-nums`)
- Geist Sans for UI text
- Dense, ledger-first layout — no decorative elements
- Sharp corners (`rounded-sm`), matte surfaces, explicit pagination

### 4. Dashboard (Home)
- **Liquidity Overview**: Total INR received, Total NPR paid, Net profit, Outstanding payments
- **Metrics row**: Today's transfers, pending payments, total commission
- **Charts** (Recharts): Monthly remittance volume, currency flow, profit trends, top senders, payment method distribution
- Daily/weekly/monthly volume toggles

### 5. Sender Management
- Table view with search, filters, pagination (explicit "Items 1-50 of N")
- Add/edit sender form with validation
- Click sender → view their transaction history

### 6. Receiver Management
- Table with search by name, district, payment mode
- Multiple receivers per sender (linked via sender_id)
- Add/edit with all fields

### 7. Transaction Management
- Create transaction: select sender → select receiver → enter INR amount → auto-calculate NPR using today's rate
- NPR field pulses with `scale(1.02)` spring on calculation
- Status workflow: Pending → Paid / Cancelled
- Each transaction auto-generates double-entry ledger entries
- Click transaction ID → side panel (Sheet) showing audit trail
- Filters: date range, status, sender, payment method

### 8. Exchange Rate Management
- Admin-only: set daily rate
- Rate history table
- Transactions store rate snapshot at creation time

---

## Phase 3: Advanced Features

### 9. Ledger System
- Full double-entry ledger view
- Filter by account (Indian Bank, Cash NPR, eSewa Pool, etc.)
- Running balance per account
- Reconciliation view

### 10. Reports
- Daily, monthly, sender, receiver, profit reports
- Export to CSV and PDF
- Chart visualizations for each report type

### 11. Bulk Import
- CSV/Excel upload for senders and transactions
- Preview + validation before import
- Error reporting for failed rows

### 12. Notification System
- Edge function to send SMS (optional integration) when payment marked as Paid

### 13. Admin Panel
- User management: invite, assign roles, deactivate
- Audit log viewer with filters
- System settings

---

## Navigation Structure
- **Sidebar**: Dashboard, Transactions, Senders, Receivers, Ledger, Rates, Reports, Admin (role-gated)
- **Top bar**: Search, dark/light toggle, user menu

