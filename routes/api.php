<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Api\AllcodeController;
use App\Http\Controllers\Api\BookingController as ApiBookingController;
use App\Http\Controllers\Api\ClinicController;
use App\Http\Controllers\Api\DoctorProfileController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\SpecialtyController;
use App\Http\Controllers\StripeWebhookController;

// Authentication Routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/google', [AuthController::class, 'google']);
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Public catalog routes (supports both /api/* and /api/v1/*)
$publicCatalogRoutes = function (): void {
    // Clinics
    Route::get('/clinics', [ClinicController::class, 'index']);
    Route::get('/clinics/{id}', [ClinicController::class, 'show']);

    // Specialties
    Route::get('/specialties', [SpecialtyController::class, 'index']);
    Route::get('/specialties/{id}', [SpecialtyController::class, 'show']);

    // Doctors
    Route::get('/doctors', [DoctorProfileController::class, 'index']);
    Route::get('/doctors/{id}', [DoctorProfileController::class, 'showByDoctor']);
    Route::get('/doctors/{id}/availability', [DoctorProfileController::class, 'availability']);

    // Master data
    Route::get('/allcodes', [AllcodeController::class, 'index']);
};

$publicCatalogRoutes();

Route::prefix('v1')->group($publicCatalogRoutes);

Route::post('/stripe/webhook', StripeWebhookController::class);

// Compatibility endpoint from README: POST /api/bookings (patient booking)
Route::middleware(['auth:sanctum', 'role:R3'])->group(function () {
    Route::post('/bookings', [ApiBookingController::class, 'store']);
});

// Histories
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/histories', [HistoryController::class, 'store']);
    Route::get('/histories/{bookingId}', [HistoryController::class, 'show']);
});

// Load Role-Specific Routes
Route::prefix('patient')->group(base_path('routes/patient.php'));
Route::prefix('doctor')->group(base_path('routes/doctor.php'));
Route::prefix('admin')->group(base_path('routes/admin.php'));
