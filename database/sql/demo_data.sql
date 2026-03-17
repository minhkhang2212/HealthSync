-- HealthSync demo catalog and account data.
-- Run this after:
--   1. php artisan migrate
--   2. php artisan db:seed
--
-- Demo login password for every imported user:
--   password123
--
-- Image strategy:
--   Store relative public paths in the `image` columns, for example:
--   /demo-images/doctors/doctor-john-carter.svg
--   /demo-images/clinics/westminster-heart-family-clinic.svg

START TRANSACTION;

SET @seeded_at = NOW();
SET @today = CURDATE();
SET @password_hash = '$2y$10$qR9YeFrTQ4zj1rlBOphS.OpR2HcARsILgcuD5sNkLOhvXiqjrzt7S';

INSERT INTO users (
    id,
    name,
    email,
    email_verified_at,
    password,
    remember_token,
    roleId,
    positionId,
    gender,
    phoneNumber,
    image,
    isActive,
    created_at,
    updated_at
) VALUES
    (1001, 'System Admin', 'admin@healthsync.com', @seeded_at, @password_hash, NULL, 'R1', NULL, NULL, '0700000000', NULL, 1, @seeded_at, @seeded_at),
    (1101, 'Dr John Carter', 'doctor1@healthsync.com', @seeded_at, @password_hash, NULL, 'R2', 'P0', 'M', '0700000001', '/demo-images/doctors/doctor-john-carter.svg', 1, @seeded_at, @seeded_at),
    (1102, 'Dr Emily Stone', 'doctor2@healthsync.com', @seeded_at, @password_hash, NULL, 'R2', 'P1', 'F', '0700000002', '/demo-images/doctors/doctor-emily-stone.svg', 1, @seeded_at, @seeded_at),
    (1103, 'Dr Sophia Reed', 'doctor3@healthsync.com', @seeded_at, @password_hash, NULL, 'R2', 'P2', 'F', '0700000005', '/demo-images/doctors/doctor-sophia-reed.svg', 1, @seeded_at, @seeded_at),
    (1104, 'Dr Daniel Hughes', 'doctor4@healthsync.com', @seeded_at, @password_hash, NULL, 'R2', 'P0', 'M', '0700000006', '/demo-images/doctors/doctor-daniel-hughes.svg', 1, @seeded_at, @seeded_at),
    (1105, 'Dr Grace Bennett', 'doctor5@healthsync.com', @seeded_at, @password_hash, NULL, 'R2', 'P1', 'F', '0700000007', '/demo-images/doctors/doctor-grace-bennett.svg', 1, @seeded_at, @seeded_at),
    (1106, 'Dr Oliver Nash', 'doctor6@healthsync.com', @seeded_at, @password_hash, NULL, 'R2', 'P0', 'M', '0700000008', '/demo-images/doctors/doctor-oliver-nash.svg', 1, @seeded_at, @seeded_at),
    (1107, 'Dr Mia Patel', 'doctor7@healthsync.com', @seeded_at, @password_hash, NULL, 'R2', 'P2', 'F', '0700000009', '/demo-images/doctors/doctor-mia-patel.svg', 1, @seeded_at, @seeded_at),
    (1108, 'Dr Ethan Cole', 'doctor8@healthsync.com', @seeded_at, @password_hash, NULL, 'R2', 'P0', 'M', '0700000010', '/demo-images/doctors/doctor-ethan-cole.svg', 1, @seeded_at, @seeded_at),
    (1201, 'Patient Liam Brown', 'patient1@healthsync.com', @seeded_at, @password_hash, NULL, 'R3', NULL, 'M', '0700000003', NULL, 1, @seeded_at, @seeded_at),
    (1202, 'Patient Olivia Green', 'patient2@healthsync.com', @seeded_at, @password_hash, NULL, 'R3', NULL, 'F', '0700000004', NULL, 1, @seeded_at, @seeded_at)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    email_verified_at = VALUES(email_verified_at),
    password = VALUES(password),
    roleId = VALUES(roleId),
    positionId = VALUES(positionId),
    gender = VALUES(gender),
    phoneNumber = VALUES(phoneNumber),
    image = VALUES(image),
    isActive = VALUES(isActive),
    updated_at = VALUES(updated_at);

DELETE FROM model_has_roles
WHERE model_type = 'App\\Models\\User'
  AND (
      model_id IN (1001, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108, 1201, 1202)
      OR model_id IN (
          SELECT id
          FROM users
          WHERE email IN (
              'admin@healthsync.com',
              'doctor1@healthsync.com',
              'doctor2@healthsync.com',
              'doctor3@healthsync.com',
              'doctor4@healthsync.com',
              'doctor5@healthsync.com',
              'doctor6@healthsync.com',
              'doctor7@healthsync.com',
              'doctor8@healthsync.com',
              'patient1@healthsync.com',
              'patient2@healthsync.com'
          )
      )
  );

INSERT INTO model_has_roles (role_id, model_type, model_id)
SELECT roles.id, 'App\\Models\\User', demo_users.id
FROM (
    SELECT 'R1' AS role_name, 'admin@healthsync.com' AS email
    UNION ALL SELECT 'R2', 'doctor1@healthsync.com'
    UNION ALL SELECT 'R2', 'doctor2@healthsync.com'
    UNION ALL SELECT 'R2', 'doctor3@healthsync.com'
    UNION ALL SELECT 'R2', 'doctor4@healthsync.com'
    UNION ALL SELECT 'R2', 'doctor5@healthsync.com'
    UNION ALL SELECT 'R2', 'doctor6@healthsync.com'
    UNION ALL SELECT 'R2', 'doctor7@healthsync.com'
    UNION ALL SELECT 'R2', 'doctor8@healthsync.com'
    UNION ALL SELECT 'R3', 'patient1@healthsync.com'
    UNION ALL SELECT 'R3', 'patient2@healthsync.com'
) AS seed_users
INNER JOIN roles
    ON roles.name = seed_users.role_name
   AND roles.guard_name = 'web'
INNER JOIN users AS demo_users
    ON demo_users.email = seed_users.email
WHERE 1 = 1
ON DUPLICATE KEY UPDATE role_id = VALUES(role_id);

INSERT INTO clinic (
    id,
    name,
    address,
    image,
    description,
    created_at,
    updated_at
) VALUES
    (2001, 'Westminster Heart and Family Clinic', '12 Victoria Street, London', '/demo-images/clinics/westminster-heart-family-clinic.svg', 'Multi-specialty clinic focused on same-day family care and structured cardiac follow-up.', @seeded_at, @seeded_at),
    (2002, 'Manchester Skin and Wellness Clinic', '45 Deansgate, Manchester', '/demo-images/clinics/manchester-skin-wellness-clinic.svg', 'Outpatient clinic providing dermatology consultations, skin screening, and preventive wellness support.', @seeded_at, @seeded_at),
    (2003, 'Birmingham Neuro and Child Health Centre', '88 Colmore Row, Birmingham', '/demo-images/clinics/birmingham-neuro-child-health-centre.svg', 'Regional clinic supporting neurology reviews, child development checks, and coordinated follow-up care.', @seeded_at, @seeded_at),
    (2004, 'Leeds Bone and Joint Studio', '16 Park Square East, Leeds', '/demo-images/clinics/leeds-bone-joint-studio.svg', 'Clinic focused on orthopedics, recovery planning, and practical follow-up for mobility concerns.', @seeded_at, @seeded_at),
    (2005, 'Bristol Vision and Day Surgery Centre', '21 Queen Square, Bristol', '/demo-images/clinics/bristol-vision-day-surgery-centre.svg', 'Modern clinic for eye care, minor procedures, and planned sight monitoring.', @seeded_at, @seeded_at),
    (2006, 'Liverpool Ear Nose and Dental Hub', '63 Bold Street, Liverpool', '/demo-images/clinics/liverpool-ear-nose-dental-hub.svg', 'High-throughput clinic supporting ENT reviews, dental care, and upper-airway follow-up.', @seeded_at, @seeded_at)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    address = VALUES(address),
    image = VALUES(image),
    description = VALUES(description),
    updated_at = VALUES(updated_at);

INSERT INTO specialty (
    id,
    name,
    description,
    image,
    created_at,
    updated_at
) VALUES
    (3001, 'Cardiology', 'Assessment and follow-up for heart rhythm issues, blood pressure, chest discomfort, and long-term cardiovascular risk.', NULL, @seeded_at, @seeded_at),
    (3002, 'Dermatology', 'Care for skin, hair, and nail conditions including eczema, acne, rashes, and lesion reviews.', NULL, @seeded_at, @seeded_at),
    (3003, 'Neurology', 'Consultations for headache, dizziness, numbness, seizure history, and chronic neurologic symptoms.', NULL, @seeded_at, @seeded_at),
    (3004, 'Pediatrics', 'Primary and follow-up care for infants, children, and adolescents with common acute and long-term needs.', NULL, @seeded_at, @seeded_at),
    (3005, 'Dentistry', 'Routine oral health visits, dental pain assessment, and preventive mouth care guidance.', NULL, @seeded_at, @seeded_at),
    (3006, 'Ophthalmology', 'Eye health reviews, vision concerns, and monitoring for red-eye or chronic sight conditions.', NULL, @seeded_at, @seeded_at),
    (3007, 'Orthopedics', 'Evaluation of bone, joint, muscle, and sports injury concerns with recovery planning.', NULL, @seeded_at, @seeded_at),
    (3008, 'Ear Nose and Throat', 'Assessment for sinus, throat, hearing, and upper-airway complaints.', NULL, @seeded_at, @seeded_at)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    image = VALUES(image),
    updated_at = VALUES(updated_at);

INSERT INTO doctor_infor (
    id,
    doctorId,
    priceId,
    provinceId,
    paymentId,
    addressClinic,
    nameClinic,
    note,
    count,
    created_at,
    updated_at
)
SELECT
    seed_rows.id,
    doctors.id,
    seed_rows.priceId,
    seed_rows.provinceId,
    seed_rows.paymentId,
    seed_rows.addressClinic,
    seed_rows.nameClinic,
    seed_rows.note,
    seed_rows.count,
    seed_rows.created_at,
    seed_rows.updated_at
FROM (
    SELECT 4001 AS id, 'doctor1@healthsync.com' AS doctorEmail, 'PRI4' AS priceId, 'PRO1' AS provinceId, 'PAY3' AS paymentId, '12 Victoria Street, London' AS addressClinic, 'Westminster Heart and Family Clinic' AS nameClinic, 'Focus on preventive cardiology and heart rhythm follow-up.' AS note, 126 AS count, @seeded_at AS created_at, @seeded_at AS updated_at
    UNION ALL SELECT 4002, 'doctor2@healthsync.com', 'PRI3', 'PRO2', 'PAY2', '45 Deansgate, Manchester', 'Manchester Skin and Wellness Clinic', 'Supports everyday dermatology issues with practical treatment plans.', 98, @seeded_at, @seeded_at
    UNION ALL SELECT 4003, 'doctor3@healthsync.com', 'PRI5', 'PRO3', 'PAY1', '88 Colmore Row, Birmingham', 'Birmingham Neuro and Child Health Centre', 'Combines neurology triage with long-term symptom monitoring.', 73, @seeded_at, @seeded_at
    UNION ALL SELECT 4004, 'doctor4@healthsync.com', 'PRI2', 'PRO1', 'PAY3', '12 Victoria Street, London', 'Westminster Heart and Family Clinic', 'General pediatric reviews, growth follow-up, and family guidance.', 91, @seeded_at, @seeded_at
    UNION ALL SELECT 4005, 'doctor5@healthsync.com', 'PRI4', 'PRO4', 'PAY2', '16 Park Square East, Leeds', 'Leeds Bone and Joint Studio', 'Sports injury triage, musculoskeletal pain review, and recovery planning.', 84, @seeded_at, @seeded_at
    UNION ALL SELECT 4006, 'doctor6@healthsync.com', 'PRI5', 'PRO5', 'PAY3', '21 Queen Square, Bristol', 'Bristol Vision and Day Surgery Centre', 'Eye health monitoring, red-eye assessment, and follow-up for vision complaints.', 112, @seeded_at, @seeded_at
    UNION ALL SELECT 4007, 'doctor7@healthsync.com', 'PRI3', 'PRO6', 'PAY1', '63 Bold Street, Liverpool', 'Liverpool Ear Nose and Dental Hub', 'Practical dental reviews with oral pain assessment and preventive guidance.', 77, @seeded_at, @seeded_at
    UNION ALL SELECT 4008, 'doctor8@healthsync.com', 'PRI4', 'PRO6', 'PAY2', '63 Bold Street, Liverpool', 'Liverpool Ear Nose and Dental Hub', 'Handles sinus, throat, and upper-airway complaints with straightforward follow-up plans.', 89, @seeded_at, @seeded_at
) AS seed_rows
INNER JOIN users AS doctors
    ON doctors.email = seed_rows.doctorEmail
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
    doctorId = VALUES(doctorId),
    priceId = VALUES(priceId),
    provinceId = VALUES(provinceId),
    paymentId = VALUES(paymentId),
    addressClinic = VALUES(addressClinic),
    nameClinic = VALUES(nameClinic),
    note = VALUES(note),
    count = VALUES(count),
    updated_at = VALUES(updated_at);

INSERT INTO doctor_clinic_specialty (
    id,
    doctorId,
    clinicId,
    specialtyId,
    created_at,
    updated_at
)
SELECT
    seed_rows.id,
    doctors.id,
    seed_rows.clinicId,
    seed_rows.specialtyId,
    seed_rows.created_at,
    seed_rows.updated_at
FROM (
    SELECT 6001 AS id, 'doctor1@healthsync.com' AS doctorEmail, 2001 AS clinicId, 3001 AS specialtyId, @seeded_at AS created_at, @seeded_at AS updated_at
    UNION ALL SELECT 6002, 'doctor2@healthsync.com', 2002, 3002, @seeded_at, @seeded_at
    UNION ALL SELECT 6003, 'doctor3@healthsync.com', 2003, 3003, @seeded_at, @seeded_at
    UNION ALL SELECT 6004, 'doctor4@healthsync.com', 2001, 3004, @seeded_at, @seeded_at
    UNION ALL SELECT 6005, 'doctor5@healthsync.com', 2004, 3007, @seeded_at, @seeded_at
    UNION ALL SELECT 6006, 'doctor6@healthsync.com', 2005, 3006, @seeded_at, @seeded_at
    UNION ALL SELECT 6007, 'doctor7@healthsync.com', 2006, 3005, @seeded_at, @seeded_at
    UNION ALL SELECT 6008, 'doctor8@healthsync.com', 2006, 3008, @seeded_at, @seeded_at
) AS seed_rows
INNER JOIN users AS doctors
    ON doctors.email = seed_rows.doctorEmail
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
    doctorId = VALUES(doctorId),
    clinicId = VALUES(clinicId),
    specialtyId = VALUES(specialtyId),
    updated_at = VALUES(updated_at);

INSERT INTO markdown (
    id,
    doctorId,
    specialtyId,
    clinicId,
    description,
    contentHTML,
    contentMarkdown,
    created_at,
    updated_at
)
SELECT
    seed_rows.id,
    doctors.id,
    seed_rows.specialtyId,
    seed_rows.clinicId,
    seed_rows.description,
    seed_rows.contentHTML,
    seed_rows.contentMarkdown,
    seed_rows.created_at,
    seed_rows.updated_at
FROM (
    SELECT 5001 AS id, 'doctor1@healthsync.com' AS doctorEmail, 3001 AS specialtyId, 2001 AS clinicId, 'Cardiology consultant' AS description, '<p>Dr John Carter manages hypertension follow-up, chest pain screening, and ongoing preventive heart care.</p>' AS contentHTML, 'Dr John Carter manages hypertension follow-up, chest pain screening, and ongoing preventive heart care.' AS contentMarkdown, @seeded_at AS created_at, @seeded_at AS updated_at
    UNION ALL SELECT 5002, 'doctor2@healthsync.com', 3002, 2002, 'Dermatology specialist', '<p>Dr Emily Stone reviews acne, eczema, persistent rashes, and skin lesion changes with clear treatment steps.</p>', 'Dr Emily Stone reviews acne, eczema, persistent rashes, and skin lesion changes with clear treatment steps.', @seeded_at, @seeded_at
    UNION ALL SELECT 5003, 'doctor3@healthsync.com', 3003, 2003, 'Neurology specialist', '<p>Dr Sophia Reed supports headache evaluation, dizziness workups, and longer-term neurologic symptom review.</p>', 'Dr Sophia Reed supports headache evaluation, dizziness workups, and longer-term neurologic symptom review.', @seeded_at, @seeded_at
    UNION ALL SELECT 5004, 'doctor4@healthsync.com', 3004, 2001, 'Pediatrics specialist', '<p>Dr Daniel Hughes sees children for same-day assessments, development reviews, and practical family follow-up plans.</p>', 'Dr Daniel Hughes sees children for same-day assessments, development reviews, and practical family follow-up plans.', @seeded_at, @seeded_at
    UNION ALL SELECT 5005, 'doctor5@healthsync.com', 3007, 2004, 'Orthopedics specialist', '<p>Dr Grace Bennett reviews joint pain, sports injuries, and musculoskeletal recovery with structured return-to-activity plans.</p>', 'Dr Grace Bennett reviews joint pain, sports injuries, and musculoskeletal recovery with structured return-to-activity plans.', @seeded_at, @seeded_at
    UNION ALL SELECT 5006, 'doctor6@healthsync.com', 3006, 2005, 'Ophthalmology specialist', '<p>Dr Oliver Nash supports eye health reviews, sight monitoring, and common front-of-eye complaints with clear next steps.</p>', 'Dr Oliver Nash supports eye health reviews, sight monitoring, and common front-of-eye complaints with clear next steps.', @seeded_at, @seeded_at
    UNION ALL SELECT 5007, 'doctor7@healthsync.com', 3005, 2006, 'Dentistry specialist', '<p>Dr Mia Patel provides dental pain assessment, oral health reviews, and preventive care plans suited to routine clinic visits.</p>', 'Dr Mia Patel provides dental pain assessment, oral health reviews, and preventive care plans suited to routine clinic visits.', @seeded_at, @seeded_at
    UNION ALL SELECT 5008, 'doctor8@healthsync.com', 3008, 2006, 'ENT specialist', '<p>Dr Ethan Cole manages sinus symptoms, sore throat reviews, and everyday ear, nose, and airway follow-up.</p>', 'Dr Ethan Cole manages sinus symptoms, sore throat reviews, and everyday ear, nose, and airway follow-up.', @seeded_at, @seeded_at
) AS seed_rows
INNER JOIN users AS doctors
    ON doctors.email = seed_rows.doctorEmail
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
    doctorId = VALUES(doctorId),
    specialtyId = VALUES(specialtyId),
    clinicId = VALUES(clinicId),
    description = VALUES(description),
    contentHTML = VALUES(contentHTML),
    contentMarkdown = VALUES(contentMarkdown),
    updated_at = VALUES(updated_at);

INSERT INTO schedule (
    id,
    doctorId,
    date,
    timeType,
    currentNumber,
    isActive,
    created_at,
    updated_at
)
SELECT
    doctor_seeds.scheduleBaseId + (days.dayKey * 100) + slots.slotOrder AS id,
    doctors.id,
    DATE_ADD(@today, INTERVAL days.dayOffset DAY) AS date,
    slots.timeType,
    CASE
        WHEN doctor_seeds.doctorEmail = 'doctor2@healthsync.com' AND days.dayOffset = 0 AND slots.timeType = 'T6' THEN 1
        WHEN doctor_seeds.doctorEmail = 'doctor2@healthsync.com' AND days.dayOffset = 1 AND slots.timeType = 'T5' THEN 1
        WHEN doctor_seeds.doctorEmail = 'doctor1@healthsync.com' AND days.dayOffset = 2 AND slots.timeType = 'T3' THEN 1
        WHEN doctor_seeds.doctorEmail = 'doctor4@healthsync.com' AND days.dayOffset = -1 AND slots.timeType = 'T6' THEN 1
        WHEN doctor_seeds.doctorEmail = 'doctor5@healthsync.com' AND days.dayOffset = 0 AND slots.timeType = 'T14' THEN 1
        WHEN doctor_seeds.doctorEmail = 'doctor6@healthsync.com' AND days.dayOffset = 4 AND slots.timeType = 'T9' THEN 1
        WHEN doctor_seeds.doctorEmail = 'doctor7@healthsync.com' AND days.dayOffset = 1 AND slots.timeType = 'T13' THEN 1
        WHEN doctor_seeds.doctorEmail = 'doctor8@healthsync.com' AND days.dayOffset = 5 AND slots.timeType = 'T2' THEN 1
        ELSE 0
    END AS currentNumber,
    CASE
        WHEN doctor_seeds.doctorEmail = 'doctor1@healthsync.com' AND days.dayOffset = 0 AND slots.timeType = 'T16' THEN 0
        WHEN doctor_seeds.doctorEmail = 'doctor2@healthsync.com' AND days.dayOffset = 1 AND slots.timeType IN ('T1', 'T2') THEN 0
        WHEN doctor_seeds.doctorEmail = 'doctor3@healthsync.com' AND days.dayOffset = 2 AND slots.timeType = 'T4' THEN 0
        WHEN doctor_seeds.doctorEmail = 'doctor4@healthsync.com' AND days.dayOffset = 5 AND slots.timeType IN ('T15', 'T16') THEN 0
        WHEN doctor_seeds.doctorEmail = 'doctor5@healthsync.com' AND days.dayOffset = 3 AND slots.timeType IN ('T1', 'T2', 'T3') THEN 0
        WHEN doctor_seeds.doctorEmail = 'doctor6@healthsync.com' AND days.dayOffset = 1 AND slots.timeType = 'T8' THEN 0
        WHEN doctor_seeds.doctorEmail = 'doctor7@healthsync.com' AND days.dayOffset = 0 AND slots.timeType IN ('T15', 'T16') THEN 0
        WHEN doctor_seeds.doctorEmail = 'doctor8@healthsync.com' AND days.dayOffset = 2 AND slots.timeType = 'T6' THEN 0
        ELSE 1
    END AS isActive,
    @seeded_at,
    @seeded_at
FROM (
    SELECT 'doctor1@healthsync.com' AS doctorEmail, 710000 AS scheduleBaseId
    UNION ALL SELECT 'doctor2@healthsync.com', 720000
    UNION ALL SELECT 'doctor3@healthsync.com', 730000
    UNION ALL SELECT 'doctor4@healthsync.com', 740000
    UNION ALL SELECT 'doctor5@healthsync.com', 750000
    UNION ALL SELECT 'doctor6@healthsync.com', 760000
    UNION ALL SELECT 'doctor7@healthsync.com', 770000
    UNION ALL SELECT 'doctor8@healthsync.com', 780000
) AS doctor_seeds
INNER JOIN users AS doctors
    ON doctors.email = doctor_seeds.doctorEmail
CROSS JOIN (
    SELECT 0 AS dayKey, -1 AS dayOffset
    UNION ALL SELECT 1, 0
    UNION ALL SELECT 2, 1
    UNION ALL SELECT 3, 2
    UNION ALL SELECT 4, 3
    UNION ALL SELECT 5, 4
    UNION ALL SELECT 6, 5
) AS days
CROSS JOIN (
    SELECT 1 AS slotOrder, 'T1' AS timeType
    UNION ALL SELECT 2, 'T2'
    UNION ALL SELECT 3, 'T3'
    UNION ALL SELECT 4, 'T4'
    UNION ALL SELECT 5, 'T5'
    UNION ALL SELECT 6, 'T6'
    UNION ALL SELECT 7, 'T7'
    UNION ALL SELECT 8, 'T8'
    UNION ALL SELECT 9, 'T9'
    UNION ALL SELECT 10, 'T10'
    UNION ALL SELECT 11, 'T11'
    UNION ALL SELECT 12, 'T12'
    UNION ALL SELECT 13, 'T13'
    UNION ALL SELECT 14, 'T14'
    UNION ALL SELECT 15, 'T15'
    UNION ALL SELECT 16, 'T16'
) AS slots
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
    currentNumber = VALUES(currentNumber),
    isActive = VALUES(isActive),
    updated_at = VALUES(updated_at);

INSERT INTO booking (
    id,
    patientId,
    doctorId,
    patientContactEmail,
    date,
    timeType,
    statusId,
    confirmedAt,
    confirmationAttachment,
    prescriptionSentAt,
    prescriptionAttachment,
    created_at,
    updated_at
)
SELECT
    seed_rows.id,
    patients.id,
    doctors.id,
    seed_rows.patientContactEmail,
    DATE_ADD(@today, INTERVAL seed_rows.dayOffset DAY) AS date,
    seed_rows.timeType,
    seed_rows.statusId,
    seed_rows.confirmedAt,
    seed_rows.confirmationAttachment,
    seed_rows.prescriptionSentAt,
    seed_rows.prescriptionAttachment,
    seed_rows.created_at,
    seed_rows.updated_at
FROM (
    SELECT 8001 AS id, 'patient2@healthsync.com' AS patientEmail, 'doctor2@healthsync.com' AS doctorEmail, 'patient2@healthsync.com' AS patientContactEmail, 0 AS dayOffset, 'T6' AS timeType, 'S3' AS statusId, DATE_SUB(@seeded_at, INTERVAL 1 DAY) AS confirmedAt, NULL AS confirmationAttachment, DATE_SUB(@seeded_at, INTERVAL 2 HOUR) AS prescriptionSentAt, NULL AS prescriptionAttachment, DATE_SUB(@seeded_at, INTERVAL 2 DAY) AS created_at, @seeded_at AS updated_at
    UNION ALL SELECT 8002, 'patient1@healthsync.com', 'doctor2@healthsync.com', 'patient1@healthsync.com', 1, 'T5', 'S1', NULL, NULL, NULL, NULL, @seeded_at, @seeded_at
    UNION ALL SELECT 8003, 'patient2@healthsync.com', 'doctor1@healthsync.com', 'patient2@healthsync.com', 2, 'T3', 'S1', DATE_SUB(@seeded_at, INTERVAL 3 HOUR), NULL, NULL, NULL, @seeded_at, @seeded_at
    UNION ALL SELECT 8004, 'patient1@healthsync.com', 'doctor4@healthsync.com', 'patient1@healthsync.com', -1, 'T6', 'S4', DATE_SUB(@seeded_at, INTERVAL 2 DAY), NULL, NULL, NULL, DATE_SUB(@seeded_at, INTERVAL 3 DAY), @seeded_at
    UNION ALL SELECT 8005, 'patient1@healthsync.com', 'doctor1@healthsync.com', 'patient1@healthsync.com', 3, 'T12', 'S2', NULL, NULL, NULL, NULL, @seeded_at, @seeded_at
    UNION ALL SELECT 8006, 'patient2@healthsync.com', 'doctor6@healthsync.com', 'patient2@healthsync.com', 4, 'T9', 'S1', NULL, NULL, NULL, NULL, @seeded_at, @seeded_at
    UNION ALL SELECT 8007, 'patient1@healthsync.com', 'doctor7@healthsync.com', 'patient1@healthsync.com', 1, 'T13', 'S1', DATE_SUB(@seeded_at, INTERVAL 4 HOUR), NULL, NULL, NULL, @seeded_at, @seeded_at
    UNION ALL SELECT 8008, 'patient2@healthsync.com', 'doctor8@healthsync.com', 'patient2@healthsync.com', 5, 'T2', 'S1', NULL, NULL, NULL, NULL, @seeded_at, @seeded_at
    UNION ALL SELECT 8009, 'patient1@healthsync.com', 'doctor5@healthsync.com', 'patient1@healthsync.com', 0, 'T14', 'S3', DATE_SUB(@seeded_at, INTERVAL 1 DAY), NULL, DATE_SUB(@seeded_at, INTERVAL 1 HOUR), NULL, DATE_SUB(@seeded_at, INTERVAL 2 DAY), @seeded_at
) AS seed_rows
INNER JOIN users AS patients
    ON patients.email = seed_rows.patientEmail
INNER JOIN users AS doctors
    ON doctors.email = seed_rows.doctorEmail
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
    patientId = VALUES(patientId),
    doctorId = VALUES(doctorId),
    patientContactEmail = VALUES(patientContactEmail),
    date = VALUES(date),
    timeType = VALUES(timeType),
    statusId = VALUES(statusId),
    confirmedAt = VALUES(confirmedAt),
    confirmationAttachment = VALUES(confirmationAttachment),
    prescriptionSentAt = VALUES(prescriptionSentAt),
    prescriptionAttachment = VALUES(prescriptionAttachment),
    updated_at = VALUES(updated_at);

INSERT INTO history (
    id,
    patientId,
    doctorId,
    bookingId,
    description,
    files,
    created_at,
    updated_at
)
SELECT
    seed_rows.id,
    patients.id,
    doctors.id,
    seed_rows.bookingId,
    seed_rows.description,
    seed_rows.files,
    seed_rows.created_at,
    seed_rows.updated_at
FROM (
    SELECT 9001 AS id, 'patient2@healthsync.com' AS patientEmail, 'doctor2@healthsync.com' AS doctorEmail, 8001 AS bookingId, 'Follow-up completed. Skin symptoms improved and the patient was advised to continue the current care plan for one more week.' AS description, NULL AS files, @seeded_at AS created_at, @seeded_at AS updated_at
    UNION ALL SELECT 9002, 'patient1@healthsync.com', 'doctor5@healthsync.com', 8009, 'Pain and mobility review completed. The patient was advised to continue the exercise plan and gradual load progression.', NULL, @seeded_at, @seeded_at
) AS seed_rows
INNER JOIN users AS patients
    ON patients.email = seed_rows.patientEmail
INNER JOIN users AS doctors
    ON doctors.email = seed_rows.doctorEmail
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
    patientId = VALUES(patientId),
    doctorId = VALUES(doctorId),
    bookingId = VALUES(bookingId),
    description = VALUES(description),
    files = VALUES(files),
    updated_at = VALUES(updated_at);

COMMIT;
