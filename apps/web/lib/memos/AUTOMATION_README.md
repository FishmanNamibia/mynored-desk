# Memo Workflow Automation System

This document describes the comprehensive automation features implemented for the NSA Memo Management System.

## Overview

The memo system now includes advanced automation to streamline workflow processing, reduce manual intervention, and ensure timely approvals. The system runs hourly automated tasks via cron jobs.

## Automation Features

### 1. Auto-Assignment (`auto-assignment.ts`)

**Purpose**: Automatically assigns memos to appropriate approvers based on role, department, and workload.

**Features**:
- **Department-based matching**: Prioritizes assigning memos to approvers in the same department as the initiator
- **Role hierarchy**: Uses primary roles first, falls back to alternative roles if needed
- **Workload balancing**: Distributes memos evenly among available approvers
- **Intelligent fallback**: Escalates to higher roles when primary approvers are unavailable

**Stage-to-Role Mapping**:
```
SENIOR_REVIEW      → SENIOR_OFFICER, SENIOR (fallback: MANAGER)
MANAGER_REVIEW     → MANAGER, DEPARTMENT_MANAGER (fallback: EXECUTIVE)
EXECUTIVE_REVIEW   → EXECUTIVE, EXECUTIVE_DIRECTOR, ED (fallback: SG)
FINANCIAL_IMPLICATION → FINANCE, FINANCE_OFFICER, CFO (fallback: EXECUTIVE)
SG_APPROVAL        → SG, SECRETARY_GENERAL (no fallback - mandatory)
PMU_PROCESSING     → PMU, PMU_OFFICER, PROCUREMENT (fallback: MANAGER)
```

**Usage**:
```typescript
// Auto-assign a single memo
await autoAssignMemo(memoId, "SENIOR_REVIEW", "Finance Department");

// Batch assign all unassigned memos
const result = await autoAssignAllPendingMemos();
```

### 2. Auto-Escalation (`auto-escalation.ts`)

**Purpose**: Automatically escalates overdue memos to ensure timely processing.

**Escalation Levels**:
- **Warning (75% of SLA)**: Sends warning notification to supervisor
- **Critical (100% of SLA)**: Sends urgent alerts to both supervisor and assignee
- **Severe (150% of SLA)**: Reassigns to backup approver and notifies supervisor

**SLA Thresholds by Stage**:
```
SENIOR_REVIEW:         24 hours
MANAGER_REVIEW:        48 hours
EXECUTIVE_REVIEW:      72 hours
FINANCIAL_IMPLICATION: 48 hours
SG_APPROVAL:           72 hours
PMU_PROCESSING:        120 hours
```

**Escalation Actions**:
1. **Warning**: Supervisor receives notification about approaching deadline
2. **Critical**: Both supervisor and assignee receive urgent alerts
3. **Severe**: 
   - Attempts to find backup approver with same role
   - Reassigns memo to backup if available
   - Notifies both backup approver and supervisor
   - If no backup available, sends severe alert to supervisor

**Usage**:
```typescript
// Process all escalations
const result = await processAllEscalations();
```

### 3. Hourly Reminders (`reminders/route.ts`)

**Purpose**: Sends hourly reminder notifications to users with pending memos.

**Features**:
- Batches reminders by stage
- Includes urgency indicators (overdue count, urgent/high priority count)
- Prevents spam (max 1 reminder per user per hour)
- Configurable minimum age threshold (default: 4 hours)

**Usage**:
```bash
# Manual trigger
POST /api/memos/reminders

# Dry run (preview without sending)
POST /api/memos/reminders?dryRun=true

# Specific stage only
POST /api/memos/reminders?stage=SENIOR_REVIEW

# Custom age threshold
POST /api/memos/reminders?minAgeHours=8
```

### 4. Workflow Integration

**Automatic Assignment on Approval**:
When a memo is approved and moves to the next stage, it is automatically assigned to an appropriate approver using the auto-assignment system.

**Location**: `app/api/memos/[id]/workflow/route.ts`

```typescript
// After memo approval
const updatedMemo = await prisma.memo.update({ where: { id }, data: updateData });

// Auto-assign to next stage approver
await autoAssignMemo(id, transition.next, initiatorDept);
```

## API Endpoints

### Automation Control

**POST /api/memos/automation**
```bash
# Auto-assign all pending memos
POST /api/memos/automation?action=assign&batch=true

# Auto-assign single memo
POST /api/memos/automation?action=assign
Body: { "memoId": "uuid", "stage": "SENIOR_REVIEW", "department": "Finance" }

# Process escalations
POST /api/memos/automation?action=escalate

# Run all automation tasks
POST /api/memos/automation?action=all
```

**GET /api/memos/automation**
```bash
# Get automation status and statistics
GET /api/memos/automation

Response:
{
  "unassigned": { "count": 5, "needsAction": true },
  "overdue": {
    "total": 12,
    "byStage": {
      "SENIOR_REVIEW": 3,
      "MANAGER_REVIEW": 5,
      "EXECUTIVE_REVIEW": 4
    },
    "needsAction": true
  },
  "recommendations": {
    "runAssignment": true,
    "runEscalation": true
  }
}
```

### Cron Jobs

**POST /api/cron/memo-automation**
- Runs hourly via Vercel Cron
- Executes all automation tasks: assignment, escalation, and reminders
- Secured with `CRON_SECRET` environment variable

**Schedule**: `0 * * * *` (every hour on the hour)

## Configuration

### Environment Variables

```env
# Required for cron job security
CRON_SECRET=your-secret-token-here

# Database connection (already configured)
DATABASE_URL=postgresql://...
```

### Vercel Cron Configuration

File: `apps/web/vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/memo-automation",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Monitoring & Logs

### Check Automation Status
```bash
GET /api/memos/automation
```

### View Reminder Statistics
```bash
GET /api/memos/reminders
```

### Manual Triggers (for testing)
```bash
# Test assignment
POST /api/memos/automation?action=assign&batch=true

# Test escalation
POST /api/memos/automation?action=escalate

# Test reminders (dry run)
POST /api/memos/reminders?dryRun=true
```

## Benefits

### For Users
- **Automatic assignment**: No manual assignment needed - memos automatically go to the right person
- **Workload balancing**: Memos distributed evenly among approvers
- **Timely reminders**: Never miss a pending approval
- **Escalation alerts**: Supervisors notified of delays

### For Administrators
- **Reduced bottlenecks**: Automatic reassignment when approvers are overloaded
- **SLA compliance**: Automatic escalation ensures deadlines are met
- **Visibility**: Clear metrics on unassigned and overdue memos
- **Minimal intervention**: System runs automatically via cron jobs

### For the Organization
- **Faster processing**: Automated routing reduces delays
- **Better accountability**: Clear assignment and escalation trails
- **Improved compliance**: SLA monitoring and enforcement
- **Reduced manual work**: Less time spent on memo routing

## Troubleshooting

### Memos not being assigned
1. Check that users have the correct roles assigned
2. Verify users have `status: "ACTIVE"`
3. Check automation status: `GET /api/memos/automation`
4. Manually trigger assignment: `POST /api/memos/automation?action=assign&batch=true`

### Escalations not working
1. Verify SLA thresholds are configured correctly
2. Check that users have managers assigned (for supervisor escalation)
3. Review escalation logs in the API response
4. Manually trigger: `POST /api/memos/automation?action=escalate`

### Reminders not being sent
1. Check that notification types are in the database (run `apply-enum-changes.sql`)
2. Verify cron job is running (check Vercel dashboard)
3. Test with dry run: `POST /api/memos/reminders?dryRun=true`
4. Check for recent reminders (system prevents spam)

### Cron job not running
1. Verify `vercel.json` is deployed
2. Check Vercel cron logs in dashboard
3. Ensure `CRON_SECRET` is set in environment variables
4. Test endpoint manually: `POST /api/cron/memo-automation` (with auth header)

## Future Enhancements

Potential improvements for consideration:

1. **Smart routing**: ML-based assignment based on historical approval patterns
2. **Predictive escalation**: Predict delays before they happen
3. **Custom SLA per department**: Different deadlines for different departments
4. **Auto-approval**: Automatically approve low-risk memos based on criteria
5. **Delegation support**: Temporary reassignment when approvers are on leave
6. **Analytics dashboard**: Visual insights into workflow efficiency
7. **Mobile notifications**: Push notifications for urgent memos
8. **Email integration**: Send email reminders in addition to in-app notifications

## Technical Details

### Database Schema Requirements

The automation system requires:
- `Memo.currentAssigneeId` field for assignment tracking
- `User.managerId` field for supervisor escalation
- `UserRole` relationship for role-based assignment
- `PmsNotification` table for reminder delivery
- Enum values: `MEMO_REMINDER`, `MEMO_PENDING_APPROVAL` in `NotificationType`

### Performance Considerations

- **Batch processing**: All automation tasks process memos in batches
- **Workload queries**: Optimized with database groupBy operations
- **Notification throttling**: Prevents duplicate reminders within 1 hour
- **Async notifications**: Fire-and-forget pattern to avoid blocking workflow

### Security

- **Cron authentication**: Secured with `CRON_SECRET` token
- **Role validation**: Only assigns to users with appropriate roles
- **Status checks**: Only processes active users and non-completed memos
- **Error handling**: Graceful degradation if automation fails

## Support

For issues or questions about the automation system:
1. Check this README first
2. Review API endpoint documentation above
3. Check application logs for error messages
4. Test with manual API calls to isolate issues
5. Contact system administrator if problems persist
