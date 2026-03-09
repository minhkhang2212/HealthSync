<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AllcodeController as AdminAllcodeController;
use App\Http\Controllers\Admin\DoctorController;
use App\Http\Controllers\Admin\ClinicController;
use App\Http\Controllers\Admin\SpecialtyController;
use App\Http\Controllers\Admin\BookingController;
use App\Http\Controllers\Api\UserController; // Reusing original for users list

Route::middleware(['auth:sanctum', 'role:R1'])->group(function () {
    // Doctors
    Route::get('/doctors', [DoctorController::class, 'index']);
    Route::post('/doctors', [DoctorController::class, 'store']);
    Route::patch('/doctors/{id}', [DoctorController::class, 'update']);

    // Users
    Route::get('/users', [UserController::class, 'index']);

    // Bookings
    Route::get('/bookings', [BookingController::class, 'index']);

    // Clinics
    Route::post('/clinics', [ClinicController::class, 'store']);
    Route::patch('/clinics/{id}', [ClinicController::class, 'update']);
    Route::delete('/clinics/{id}', [ClinicController::class, 'destroy']);

    // Specialties
    Route::post('/specialties', [SpecialtyController::class, 'store']);
    Route::patch('/specialties/{id}', [SpecialtyController::class, 'update']);
    Route::delete('/specialties/{id}', [SpecialtyController::class, 'destroy']);

    // Allcodes
    Route::post('/allcodes', [AdminAllcodeController::class, 'store']);
    Route::patch('/allcodes/{id}', [AdminAllcodeController::class, 'update']);
});
