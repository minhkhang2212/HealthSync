
# 1. Overall Project Structure

```
healthsync/
│
├── backend/
│   └── laravel-api/
│
├── frontend/
│   └── web-app/
│
├── database/
│   ├── migrations
│   └── seeds
│
├── docs/
│   ├── architecture
│   ├── api
│   └── diagrams
│
├── docker/
│
├── scripts/
│
└── README.md
```

---

# 2. Backend Structure (Laravel)

```
backend/laravel-api
│
├── app
│   │
│   ├── Http
│   │   ├── Controllers
│   │   │
│   │   ├── Auth
│   │   │   └── AuthController.php
│   │   │
│   │   ├── Patient
│   │   │   └── BookingController.php
│   │   │
│   │   ├── Doctor
│   │   │   ├── ScheduleController.php
│   │   │   └── DoctorBookingController.php
│   │   │
│   │   ├── Admin
│   │   │   ├── DoctorController.php
│   │   │   ├── ClinicController.php
│   │   │   ├── SpecialtyController.php
│   │   │   └── AllcodeController.php
│   │   │
│   │   ├── ClinicController.php
│   │   ├── SpecialtyController.php
│   │   ├── DoctorController.php
│   │   └── HistoryController.php
│   │
│   ├── Services
│   │   │
│   │   ├── AuthService.php
│   │   ├── BookingService.php
│   │   ├── ScheduleService.php
│   │   ├── DoctorService.php
│   │   ├── ClinicService.php
│   │   ├── SpecialtyService.php
│   │   └── HistoryService.php
│   │
│   ├── Repositories
│   │   │
│   │   ├── UserRepository.php
│   │   ├── BookingRepository.php
│   │   ├── ScheduleRepository.php
│   │   ├── DoctorRepository.php
│   │   ├── ClinicRepository.php
│   │   └── SpecialtyRepository.php
│   │
│   ├── Models
│   │   │
│   │   ├── User.php
│   │   ├── Clinic.php
│   │   ├── Specialty.php
│   │   ├── DoctorInfor.php
│   │   ├── DoctorMarkdown.php
│   │   ├── Schedule.php
│   │   ├── Booking.php
│   │   ├── History.php
│   │   └── Allcode.php
│   │
│   ├── DTO
│   │   │
│   │   ├── BookingDTO.php
│   │   ├── ScheduleDTO.php
│   │   └── DoctorDTO.php
│   │
│   ├── Policies
│   │
│   ├── Exceptions
│   │
│   └── Helpers
│       └── TimeHelper.php
│
├── routes
│   ├── api.php
│   ├── patient.php
│   ├── doctor.php
│   └── admin.php
│
├── config
│
├── database
│   ├── migrations
│   ├── factories
│   └── seeders
│
├── storage
│
├── tests
│
└── composer.json
```

---

# 3. Backend Layered Architecture

Flow chuẩn:

```
Controller
   ↓
Service
   ↓
Repository
   ↓
Model (Eloquent)
   ↓
Database
```

---

## Example Flow (Booking)

```
BookingController
   ↓
BookingService
   ↓
ScheduleRepository
BookingRepository
   ↓
MySQL
```

---

# 4. API Routes Structure

```
routes/
│
├── api.php
│
├── patient.php
│
├── doctor.php
│
└── admin.php
```

---

## api.php

```
Route::prefix('auth')->group(function () {

POST /register
POST /login
POST /logout
GET  /me

});
```

---

## patient.php

```
Route::prefix('patient')->group(function () {

GET  /bookings
GET  /bookings/{id}
POST /bookings
POST /bookings/{id}/cancel

});
```

---

## doctor.php

```
Route::prefix('doctor')->group(function () {

POST   /schedules
GET    /schedules
DELETE /schedules/{id}

GET  /bookings
POST /bookings/{id}/cancel
POST /bookings/{id}/mark-done
POST /bookings/{id}/mark-no-show

});
```

---

## admin.php

```
Route::prefix('admin')->group(function () {

POST /doctors
PATCH /doctors/{id}

GET /users

POST /clinics
PATCH /clinics/{id}
DELETE /clinics/{id}

POST /specialties
PATCH /specialties/{id}
DELETE /specialties/{id}

});
```

---

# 5. Frontend Structure (React)

```
frontend/web-app
│
├── public
│
├── src
│   │
│   ├── app
│   │   └── store.js
│   │
│   ├── features
│   │
│   │   ├── auth
│   │   │   ├── authSlice.js
│   │   │   ├── authAPI.js
│   │   │   └── authSelectors.js
│   │   │
│   │   ├── doctor
│   │   │   ├── doctorSlice.js
│   │   │   └── doctorAPI.js
│   │   │
│   │   ├── booking
│   │   │   ├── bookingSlice.js
│   │   │   └── bookingAPI.js
│   │   │
│   │   └── schedule
│   │       ├── scheduleSlice.js
│   │       └── scheduleAPI.js
│   │
│   ├── pages
│   │
│   │   ├── patient
│   │   │   ├── HomePage.jsx
│   │   │   ├── DoctorListPage.jsx
│   │   │   ├── DoctorDetailPage.jsx
│   │   │   ├── BookingPage.jsx
│   │   │   └── MyAppointmentsPage.jsx
│   │   │
│   │   ├── doctor
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── SchedulePage.jsx
│   │   │   └── AppointmentListPage.jsx
│   │   │
│   │   └── admin
│   │       ├── DashboardPage.jsx
│   │       ├── DoctorManagementPage.jsx
│   │       ├── ClinicManagementPage.jsx
│   │       └── SpecialtyManagementPage.jsx
│   │
│   ├── components
│   │
│   │   ├── ui
│   │   ├── booking
│   │   ├── doctor
│   │   └── layout
│   │
│   ├── services
│   │   └── apiClient.js
│   │
│   ├── hooks
│   │
│   ├── utils
│   │   ├── dateUtils.js
│   │   └── constants.js
│   │
│   ├── routes
│   │   └── AppRouter.jsx
│   │
│   └── styles
│
└── package.json
```

---

# 6. Redux Store Structure

```
store
│
├── authSlice
├── doctorSlice
├── bookingSlice
└── scheduleSlice
```

---

# 7. Environment Structure

Backend `.env`

```
APP_NAME=HealthSync
APP_ENV=local
APP_TIMEZONE=Europe/London

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=healthsync
DB_USERNAME=root
DB_PASSWORD=
```

---

# 8. Folder for Business Logic (IMPORTANT)

Business logic phải nằm ở:

```
app/Services
```

Ví dụ:

```
BookingService

- createBooking()
- cancelBooking()
- checkBookingWindow()
- preventOverbooking()
```

---

# 9. Transaction Handling

Booking phải chạy transaction.

Example

```
DB::transaction(function () {

update schedule

insert booking

});
```

---

# 10. Recommended Packages

Laravel packages:

```
laravel/sanctum
spatie/laravel-permission
spatie/laravel-query-builder
```

---

# 11. Folder for Time Logic (Timezone + DST)

```
app/Helpers/TimeHelper.php
```

Functions

```
nowLondon()
isBookingWindowValid()
isDoctorCancellationAllowed()
```

---

# 12. Docs Folder

```
docs
│
├── architecture
│   ├── system-design.md
│   └── sequence-diagrams.md
│
├── api
│   └── openapi.yaml
│
└── database
    └── schema.md
```

---

# 13. Production Ready Improvements

Sau MVP có thể thêm:

```
Events
Jobs
Notifications
Queue
Caching
Rate limiting
```

---

# 14. Best Practice Naming

Controllers

```
DoctorController
BookingController
ScheduleController
```

Services

```
DoctorService
BookingService
ScheduleService
```

---

# 15. Clean Module Mapping

| Module   | Backend         | Frontend      |
| -------- | --------------- | ------------- |
| Auth     | AuthService     | authSlice     |
| Doctor   | DoctorService   | doctorSlice   |
| Schedule | ScheduleService | scheduleSlice |
| Booking  | BookingService  | bookingSlice  |

---


