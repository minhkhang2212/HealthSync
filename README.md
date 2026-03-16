# Doctor Appointment Booking Platform (HealthSync)

## 1. Project Overview

HealthSync là hệ thống web cho phép **bệnh nhân đặt lịch khám bác sĩ online**, bác sĩ quản lý lịch làm việc theo ngày, và admin quản lý dữ liệu vận hành của toàn hệ thống.

### Product Goals

- Giảm thời gian chờ tại phòng khám
- Cho phép bệnh nhân tự đặt lịch online
- Cho phép bác sĩ đóng/mở slot khám theo ngày
- Quản lý clinic, specialty, doctor profile và booking history

### Target Location

- Country: United Kingdom (UK)
- Timezone: Europe/London

---

## 2. User Roles

| Role | Description |
|------|-------------|
| Admin | Quản lý toàn hệ thống |
| Doctor | Quản lý availability và xử lý lịch khám |
| Patient | Tìm bác sĩ và đặt lịch khám |

---

## 3. MVP Scope

### Included

- Authentication
- Doctor profile
- Clinic management
- Specialty management
- Doctor availability management
- Appointment booking
- Appointment cancellation
- Appointment history
- Master data via allcodes

### Excluded

- Online payment
- Email/SMS reminder
- Video consultation
- AI medical assistant

---

## 4. Core Modules

| Module | Description |
|--------|-------------|
| User Authentication | Đăng ký, đăng nhập, phân quyền |
| Doctor Profile | Hồ sơ bác sĩ và thông tin chuyên môn |
| Clinic | Quản lý phòng khám |
| Specialty | Quản lý chuyên khoa |
| Schedule | Quản lý slot khả dụng theo ngày |
| Booking | Đặt lịch khám |
| History | Lưu kết quả khám |
| Allcodes | Master data cho role, status, time, price, payment, province |

---

## 5. Booking Flow

### Patient Booking Flow

```text
Login
↓
Choose specialty / clinic / doctor
↓
Choose date
↓
Choose time slot
↓
Confirm booking
↓
Booking created
```

### Doctor Daily Availability Flow

```text
Doctor login
↓
Select date
↓
Review all 16 slots (all selected by default)
↓
Deselect slots that should be closed
↓
Save availability
```

---

## 6. Booking Rules

### Booking Window

Patient chỉ được đặt lịch trong khoảng:

```text
Today → Today + 30 days
```

Timezone hệ thống:

```text
Europe/London
```

Không cho phép:

- Đặt lịch trong quá khứ
- Đặt lịch ngoài booking window
- Đặt lịch vào slot đã bị doctor đóng
- Đặt lịch vào slot đã có bệnh nhân khác book

### Doctor Availability Rule

- Mỗi ngày mặc định có sẵn 16 slot
- Tất cả slot mặc định ở trạng thái open
- Doctor chỉ cần **deselect** các slot muốn disable
- Slot đã có booking thì không được disable

### Doctor Cancellation Rule

Doctor chỉ được hủy lịch nếu:

```text
Appointment time − current time ≥ 24 hours
```

### Slot Capacity Rule

```text
1 slot = 1 patient
```

Không có `maxNumber` cho mỗi slot nữa. `currentNumber` chỉ dùng để biểu diễn:

- `0` = slot đang trống
- `1` = slot đã có người đặt

---

## 7. Booking Status

| Code | Meaning |
|------|---------|
| S1 | New |
| S2 | Cancelled |
| S3 | Done |
| S4 | No-show |

`Confirmed` is an operational step, not a separate status code. A booking is treated as confirmed when `confirmedAt` is set while `statusId` remains `S1`. It only becomes `S3` after the doctor sends the prescription.

---

## 8. Time Slot Definition

Mỗi ngày có **16 slots**, mỗi slot dài **30 phút**.

| Code | Time |
|------|------|
| T1 | 08:00 - 08:30 |
| T2 | 08:30 - 09:00 |
| T3 | 09:00 - 09:30 |
| T4 | 09:30 - 10:00 |
| T5 | 10:00 - 10:30 |
| T6 | 10:30 - 11:00 |
| T7 | 11:00 - 11:30 |
| T8 | 11:30 - 12:00 |
| T9 | 12:00 - 12:30 |
| T10 | 12:30 - 13:00 |
| T11 | 13:00 - 13:30 |
| T12 | 13:30 - 14:00 |
| T13 | 14:00 - 14:30 |
| T14 | 14:30 - 15:00 |
| T15 | 15:00 - 15:30 |
| T16 | 15:30 - 16:00 |

---

## 9. Technology Stack

### Frontend

- React
- Redux Toolkit
- React Router
- SASS / SCSS

Styling convention:

- Ưu tiên semantic class names
- Tên class phải thể hiện đúng ý nghĩa UI hoặc block/component
- Tránh utility-heavy naming trong target architecture

Redux structure

```text
store
├── authSlice
├── doctorSlice
├── bookingSlice
├── scheduleSlice
```

### Backend

- PHP 8.2+
- Laravel 12
- REST API
- Service Layer
- Database transaction handling
- Laravel Sanctum

### Database

- MySQL
- XAMPP

---

## 10. Main Tables

```text
users
allcodes
clinic
specialty
doctor_infor
doctor_clinic_specialty
schedule
booking
history
markdown
```

---

## 11. Database Schema Notes

### users

Core identity table

```text
id
name
email
password
roleId
positionId
gender
phoneNumber
image
isActive
created_at
updated_at
```

### clinic

```text
id
name
address
description
image
created_at
updated_at
```

### specialty

```text
id
name
description
image
created_at
updated_at
```

### doctor_infor

Thông tin chi tiết bác sĩ

```text
id
doctorId
priceId
provinceId
paymentId
addressClinic
nameClinic
note
created_at
updated_at
```

### doctor_clinic_specialty

```text
id
doctorId
clinicId
specialtyId
created_at
updated_at
```

MVP rule:

```text
1 doctor → 1 clinic
1 doctor → 1 specialty
```

### markdown

```text
id
doctorId
specialtyId
clinicId
description
contentMarkdown
contentHTML
created_at
updated_at
```

### schedule

Slot availability theo ngày

```text
id
doctorId
date
timeType
currentNumber
isActive
created_at
updated_at
```

Constraint:

```text
UNIQUE (doctorId, date, timeType)
```

Meaning:

- `isActive = true` và `currentNumber = 0` → slot mở và còn trống
- `isActive = false` → slot đã bị doctor disable
- `currentNumber = 1` → slot đã có bệnh nhân đặt

### booking

```text
id
statusId
doctorId
patientId
date
timeType
created_at
updated_at
```

Indexes / constraints:

```text
(doctorId, date, timeType)
(patientId, date)
UNIQUE (patientId, doctorId, date, timeType)
```

### history

Lưu kết quả khám bệnh

```text
id
bookingId
patientId
doctorId
description
files
created_at
updated_at
```

### allcodes

Dynamic dictionary table

```text
id
type
key
valueEn
created_at
updated_at
```

Types:

```text
ROLE
STATUS
TIME
POSITION
GENDER
PRICE
PAYMENT
PROVINCE
```

---

## 12. Prevent Overbooking

Rule:

```text
Không cho 2 người đặt cùng một doctor slot trong cùng ngày.
```

Implementation strategy:

1. Lock row `schedule` theo `(doctorId, date, timeType)`
2. Kiểm tra `isActive`
3. Kiểm tra `currentNumber`
4. Nếu `currentNumber = 0` thì set thành `1`
5. Tạo booking

Pseudo flow:

```text
IF schedule.isActive = false
  -> reject

IF schedule.currentNumber >= 1
  -> reject

UPDATE schedule
SET currentNumber = 1
WHERE doctorId = ?
AND date = ?
AND timeType = ?

INSERT booking
```

Nếu booking bị hủy:

```text
schedule.currentNumber = 0
```

---

## 13. API Design

### Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

### Public Catalog

```text
GET /api/clinics
GET /api/clinics/{id}

GET /api/specialties
GET /api/specialties/{id}

GET /api/doctors
GET /api/doctors/{id}
GET /api/doctors/{id}/availability

GET /api/allcodes?type=TIME
GET /api/allcodes?type=PRICE
GET /api/allcodes?type=PAYMENT
GET /api/allcodes?type=PROVINCE
```

Compatibility routes also exist under:

```text
/api/v1/*
```

### Booking (Patient)

```text
POST /api/bookings

GET /api/patient/bookings
GET /api/patient/bookings/{id}
POST /api/patient/bookings
POST /api/patient/bookings/{id}/cancel
```

### Doctor Availability

```text
GET /api/doctor/schedules
POST /api/doctor/schedules
```

Payload concept:

```json
{
  "date": "2026-03-16",
  "disabledTimeTypes": ["T4", "T5", "T6"]
}
```

### Doctor Bookings

```text
GET /api/doctor/bookings
POST /api/doctor/bookings/{id}/confirm
POST /api/doctor/bookings/{id}/cancel
POST /api/doctor/bookings/{id}/send-prescription
POST /api/doctor/bookings/{id}/mark-no-show
```

### History

```text
POST /api/histories
GET /api/histories/{bookingId}
```

### Admin APIs

```text
GET /api/admin/doctors
POST /api/admin/doctors
PATCH /api/admin/doctors/{id}

GET /api/admin/users
GET /api/admin/bookings

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

## 14. UI Pages

### Patient

- Home
- Specialty List
- Doctor List
- Doctor Detail
- Booking Page
- My Appointments

### Doctor

- Doctor Dashboard
- Daily Availability Management
- Appointment List

### Admin

- Admin Dashboard
- Doctor Management
- Clinic Management
- Specialty Management
- Booking Management

---

## 15. Future Improvements

- Online payment
- SMS/email reminder
- Video consultation
- AI medical assistant

---

## 16. Payment Strategy

MVP:

```text
Pay at clinic
```

Future integration:

```text
Stripe
Apple Pay
Bank transfer
```

---

## 17. Engineering Notes

### Timezone

```text
Europe/London
```

Phải xử lý đúng:

- DST
- Booking window
- Doctor cancellation rule

### Schedule Constraints

```text
UNIQUE (doctorId, date, timeType)
```

### Prevent Duplicate Booking

```text
patientId + doctorId + date + timeType
```

### Capacity Model

```text
1 day = 16 slots
1 slot = 1 patient
1 doctor/day = tối đa 16 bệnh nhân
```
