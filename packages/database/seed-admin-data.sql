-- Sample RefreshmentStock data (to be added to seed.sql or run manually)

INSERT INTO "RefreshmentStock" (
  "id", "name", "category", "unitType", "currentStock", "minimumLevel", 
  "maximumLevel", "unitCost", "supplier", "totalReceived", "totalDispensed", 
  "lastRestocked", "isActive", "createdAt", "updatedAt"
) VALUES 
  (
    gen_random_uuid(),
    'Bottled Water (500ml)',
    'Water',
    'bottles',
    45,
    50,
    200,
    2.50,
    'Fresh Water Co.',
    1250,
    1205,
    '2026-01-28 14:30:00',
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Coffee Beans (1kg)',
    'Coffee', 
    'packets',
    8,
    10,
    50,
    65.00,
    'Bean Masters',
    125,
    117,
    '2026-01-15 09:00:00',
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Assorted Tea Bags',
    'Tea',
    'boxes',
    15,
    20,
    100,
    45.00,
    'Tea Specialists',
    200,
    185,
    '2026-01-20 11:30:00',
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Mixed Nuts (250g)',
    'Snacks',
    'packets',
    25,
    15,
    75,
    12.50,
    'Snack Suppliers',
    200,
    175,
    '2026-01-20 11:30:00',
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Assorted Cookies',
    'Sweets',
    'packets',
    30,
    20,
    80,
    8.75,
    'Sweet Treats Ltd',
    150,
    120,
    '2026-01-25 10:15:00',
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Fresh Juice (1L)',
    'Juice',
    'bottles',
    12,
    15,
    60,
    18.00,
    'Fruit Fresh Co.',
    180,
    168,
    '2026-01-22 08:45:00',
    true,
    NOW(),
    NOW()
  );

-- Sample requests that exclude VEHICLE for Admin Assistants
INSERT INTO "Request" (
  "id", "requestNumber", "type", "title", "description", "requesterId", 
  "status", "priority", "requestDate", "requiredDate", "createdAt", "updatedAt"
) VALUES 
  (
    gen_random_uuid(),
    'REF-2026-001',
    'REFRESHMENT',
    'Coffee and pastries for board meeting',
    'Need refreshments for 15 people for quarterly board meeting',
    (SELECT id FROM "User" LIMIT 1), -- Replace with actual user ID
    'PENDING',
    'HIGH',
    '2026-02-04 10:00:00',
    '2026-02-05 14:00:00',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'BR-2026-002',
    'BOARDROOM',
    'Conference room for client presentation', 
    'Need main conference room with projector setup',
    (SELECT id FROM "User" LIMIT 1), -- Replace with actual user ID
    'PENDING',
    'NORMAL',
    '2026-02-04 11:15:00',
    '2026-02-05 10:00:00',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'IT-2026-003',
    'IT_EQUIPMENT',
    'Laptop for new employee',
    'Need laptop setup for new hire starting Monday',
    (SELECT id FROM "User" LIMIT 1), -- Replace with actual user ID
    'PENDING',
    'NORMAL',
    '2026-02-04 09:30:00',
    '2026-02-07 08:00:00',
    NOW(),
    NOW()
  );