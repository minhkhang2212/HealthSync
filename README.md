
# Doctor Appointment Booking Platform (HealthSync)

## 1. Project Overview

Doctor Appointment Booking Platform (HealthSync) là hệ thống web cho phép **bệnh nhân đặt lịch khám bác sĩ online**.

### Mục tiêu

- Giảm thời gian chờ tại phòng khám
- Giúp bác sĩ quản lý lịch khám
- Quản lý bệnh nhân
- Lưu trữ lịch sử khám bệnh

### Target Location

- Country: United Kingdom (UK)
- Timezone: Europe/London

---

# 2. User Roles

| Role | Description |
|-----|-------------|
| Admin | Quản lý toàn hệ thống |
| Doctor | Quản lý lịch khám và bệnh nhân |
| Patient | Đặt lịch khám |

---

# 3. MVP Scope

## Included (MVP)

- Authentication
- Doctor profile
- Clinic management
- Specialty management
- Doctor schedule
- Appointment booking
- Appointment cancellation
- Appointment history

## Excluded (Phase 2)

- Online payment
- Email/SMS reminder
- Video consultation
- Multi-clinic doctors
- AI medical assistant

---

# 4. Core Modules

| Module | Description |
|------|-------------|
| User Authentication | Quản lý đăng nhập & role |
| Doctor Profile | Thông tin bác sĩ |
| Clinic | Quản lý phòng khám |
| Specialty | Quản lý chuyên khoa |
| Schedule | Slot lịch khám |
| Booking | Đặt lịch khám |
| History | Lịch sử khám |
| Allcodes | Master data |

---

# 5. Booking Flow

## Patient Booking Flow

```

Login
↓
Choose specialty
↓
Choose doctor
↓
Choose date
↓
Choose time slot
↓
Confirm booking
↓
Booking created

```

---

## Doctor Create Schedule Flow

```

Doctor login
↓
Select date
↓
Select time slots
↓
Set max patients
↓
Save schedule

```

---

# 6. Booking Rules

## Booking Window

Patient chỉ được đặt lịch trong khoảng:

```

Today → Today + 2 days

```

Timezone hệ thống:

```

Europe/London

```

Không cho phép:

- Đặt lịch trong quá khứ
- Đặt lịch khi slot đã đầy

---

## Doctor Cancellation Rule

Doctor chỉ được hủy lịch nếu:

```

Appointment time − current time ≥ 24 hours

```

---

# 7. Booking Status

| Code | Meaning |
|-----|--------|
| S1 | New |
| S2 | Cancelled |
| S3 | Done |
| S4 | No-show |

---

# 8. Time Slot Definition

Time slot cố định toàn hệ thống.

| Code | Time |
|----|------|
| T1 | 08:00 |
| T2 | 09:00 |
| T3 | 10:00 |
| T4 | 11:00 |
| T5 | 13:00 |
| T6 | 14:00 |
| T7 | 15:00 |
| T8 | 16:00 |

---

# 9. Technology Stack

## Frontend

- React
- Redux
- TailwindCSS

Redux structure

```

store
├── authSlice
├── doctorSlice
├── bookingSlice
├── scheduleSlice

```

---

## Backend

- PHP Laravel
- REST API
- Service Layer
- Transaction handling

---

## Database

- MySQL
- XAMPP

Main tables

```

users
allcodes
clinics
specialties
doctor_infor
doctor_markdowns
schedules
bookings
histories
ai_requests

```

---

# 10. Database Schema

## users

Core identity table

```

id
email
password_hash
role_key
position_key
gender_key
first_name
last_name
phone
avatar_url
created_at
updated_at

```

---

## clinics

```

id
name
address
image_url
description
created_at
updated_at

```

---

## specialties

```

id
name
description
image_url
created_at
updated_at

```

Example specialties

- Cardiology
- Dermatology
- Neurology

---

## doctor_infor

Thông tin chi tiết bác sĩ

```

doctor_id
clinic_id
specialty_id
price_key
payment_key
province_key
address_clinic
name_clinic
note
count
created_at
updated_at

```

MVP rule

```

1 doctor → 1 clinic
1 doctor → 1 specialty

```

---

## doctor_markdowns

```

doctor_id
description
content_markdown
content_html
created_at
updated_at

```

---

## schedules

Slot lịch khám

```

id
doctor_id
date
time_key
max_number
current_number
created_at
updated_at

```

Constraint

```

UNIQUE (doctor_id, date, time_key)

```

---

## bookings

```

id
patient_id
doctor_id
date
time_key
status_key
cancel_reason
cancelled_by_role_key
cancelled_at
created_at
updated_at

```

Indexes

```

(doctor_id, date, time_key)
(patient_id, date)

```

---

## histories

Lưu kết quả khám bệnh

```

id
booking_id
patient_id
doctor_id
description
files_json
created_at
updated_at

```

---

## allcodes

Dynamic dictionary table

```

id
type
key
value
meta_json
is_active
sort_order
created_at
updated_at

```

Types

```

ROLE
STATUS
TIME
POSITION
GENDER
PRICE
PAYMENT
PROVINCE

````

---

# 11. Prevent Overbooking

Booking phải chạy trong **database transaction**

Logic

```sql
UPDATE schedules
SET current_number = current_number + 1
WHERE doctor_id = ?
AND date = ?
AND time_key = ?
AND current_number < max_number
````

Nếu

```
affectedRows = 1
```

→ Insert booking

Nếu

```
affectedRows = 0
```

→ Slot full

---

# 12. API Design

## Auth

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

---

## Master Data

```
GET /api/allcodes?type=TIME
GET /api/allcodes?type=PRICE
GET /api/allcodes?type=PAYMENT
GET /api/allcodes?type=PROVINCE
```

---

## Clinics

```
GET /api/clinics
GET /api/clinics/{id}
```

---

## Specialties

```
GET /api/specialties
GET /api/specialties/{id}
```

---

## Doctors

```
GET /api/doctors
GET /api/doctors/{id}
GET /api/doctors/{id}/availability
```

Filters

```
specialtyId
clinicId
search
page
```

---

## Booking (Patient)

```
POST /api/bookings
GET /api/patient/bookings
GET /api/patient/bookings/{id}
POST /api/patient/bookings/{id}/cancel
```

---

## Doctor Schedule

```
POST /api/doctor/schedules
GET /api/doctor/schedules
DELETE /api/doctor/schedules/{id}
```

---

## Doctor Bookings

```
GET /api/doctor/bookings
POST /api/doctor/bookings/{id}/cancel
POST /api/doctor/bookings/{id}/mark-done
POST /api/doctor/bookings/{id}/mark-no-show
```

---

## History

```
POST /api/histories
GET /api/histories/{bookingId}
```

---

## Admin APIs

```
POST /api/admin/doctors
PATCH /api/admin/doctors/{id}

GET /api/admin/users

POST /api/admin/clinics
PATCH /api/admin/clinics/{id}
DELETE /api/admin/clinics/{id}

POST /api/admin/specialties
PATCH /api/admin/specialties/{id}
DELETE /api/admin/specialties/{id}

POST /api/admin/allcodes
PATCH /api/admin/allcodes/{id}
```

---

# 13. UI Pages

## Patient

* Home
* Specialty List
* Doctor List
* Doctor Detail
* Booking Page
* My Appointments

---

## Doctor

* Doctor Dashboard
* Create Schedule
* Appointment List

---

## Admin

* Admin Dashboard
* Doctor Management
* Clinic Management
* Specialty Management
* Booking Management

---

# 14. AI Feature (Planned)

## Symptom Checker

User nhập triệu chứng

```
"I have chest pain"
```

AI gợi ý

```
Specialty: Cardiology
Urgency: Medium
Advice: Please see a doctor soon
```

Sau đó redirect tới danh sách bác sĩ phù hợp.

---

# 15. Future Improvements

* Online payment
* SMS/email reminder
* Video consultation
* Multi-clinic doctors
* AI medical assistant

---

# 16. Payment Strategy

MVP

```
Pay at clinic
```

Future integration

```
Stripe
Apple Pay
Bank transfer
```

---

# 17. Engineering Notes

Timezone

```
Europe/London
```

Phải xử lý

* DST
* Booking window
* Cancellation rule

Data constraints

```
UNIQUE (doctor_id, date, time_key)
```

Prevent duplicate booking

```
patientId + doctorId + date + timeType
```

