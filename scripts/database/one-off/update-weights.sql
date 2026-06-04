UPDATE "PerformancePeriod" 
SET "adhocWeight" = 0, "projectsWeight" = 0, "riskManagementWeight" = 0 
WHERE "isActive" = true;

SELECT id, name, "adhocWeight", "projectsWeight", "riskManagementWeight", "rating360Weight" 
FROM "PerformancePeriod" 
WHERE "isActive" = true;
