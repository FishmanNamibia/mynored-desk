-- =====================================================
-- CLEANUP SCRIPT: Delete All Performance/PMS Data + Users
-- Purpose: Complete reset due to AD department changes
-- Date: 2026-02-19
-- WARNING: This deletes ALL user accounts and ALL PMS data
-- =====================================================

-- Disable foreign key checks temporarily (if supported by your DB)
-- SET FOREIGN_KEY_CHECKS = 0; -- MySQL
-- SET session_replication_role = 'replica'; -- PostgreSQL

BEGIN;

-- Delete 360 Rating data (in order of dependencies)
DELETE FROM "Rating360Answer";
DELETE FROM "SubordinateRating360";
DELETE FROM "PeerRating360";
DELETE FROM "Rating360";
DELETE FROM "Rating360Cycle";
DELETE FROM "Rating360Question";
DELETE FROM "Rating360Category";

-- Delete Adhoc Tasks
DELETE FROM "AdhocTask";

-- Delete Performance Agreements
DELETE FROM "PerformanceAgreement";

-- Delete Performance Reviews
DELETE FROM "PerformanceReview";

-- Delete User-related data (in order of dependencies)
DELETE FROM "UserRole";
DELETE FROM "Session";
DELETE FROM "Account";
DELETE FROM "VerificationToken";
DELETE FROM "Notification";
DELETE FROM "AuditLog";

-- Delete ALL Users
DELETE FROM "User";

-- Note: We are NOT deleting PerformancePeriod as those are organizational settings
-- Note: We are NOT deleting strategic workplan data (Goals, Objectives, Initiatives)
-- Note: We are NOT deleting Departments/Divisions

COMMIT;

-- Re-enable foreign key checks
-- SET FOREIGN_KEY_CHECKS = 1; -- MySQL
-- SET session_replication_role = 'origin'; -- PostgreSQL

-- Verify deletion
SELECT 'Users' as table_name, COUNT(*) as remaining_records FROM "User"
UNION ALL
SELECT 'Performance Agreements', COUNT(*) FROM "PerformanceAgreement"
UNION ALL
SELECT 'Adhoc Tasks', COUNT(*) FROM "AdhocTask"
UNION ALL
SELECT 'Performance Reviews', COUNT(*) FROM "PerformanceReview"
UNION ALL
SELECT '360 Ratings', COUNT(*) FROM "Rating360"
UNION ALL
SELECT '360 Cycles', COUNT(*) FROM "Rating360Cycle"
UNION ALL
SELECT '360 Peer Ratings', COUNT(*) FROM "PeerRating360"
UNION ALL
SELECT '360 Subordinate Ratings', COUNT(*) FROM "SubordinateRating360"
UNION ALL
SELECT '360 Answers', COUNT(*) FROM "Rating360Answer"
UNION ALL
SELECT 'User Roles', COUNT(*) FROM "UserRole"
UNION ALL
SELECT 'Sessions', COUNT(*) FROM "Session"
UNION ALL
SELECT 'Accounts', COUNT(*) FROM "Account"
UNION ALL
SELECT 'Notifications', COUNT(*) FROM "Notification"
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM "AuditLog";
