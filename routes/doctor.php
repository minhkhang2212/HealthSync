<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Doctor\ScheduleController;
use App\Http\Controllers\Doctor\DoctorBookingController;

Route::middleware(['auth:sanctum', 'role:R2'])->group(function () {
    // Schedules
    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::post('/schedules', [ScheduleController::class, 'store']);

    // Bookings
    Route::get('/bookings', [DoctorBookingController::class, 'index']);
    Route::post('/bookings/{id}/cancel', [DoctorBookingController::class, 'cancel']);
    Route::post('/bookings/{id}/mark-done', [DoctorBookingController::class, 'markDone']);
    Route::post('/bookings/{id}/mark-no-show', [DoctorBookingController::class, 'markNoShow']);
});
