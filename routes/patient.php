<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Patient\AiTriageController;
use App\Http\Controllers\Patient\BookingController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::post('/bookings/{id}/cancel', [BookingController::class, 'cancel']);

    Route::middleware('role:R3')->prefix('ai/triage')->group(function () {
        Route::post('/sessions', [AiTriageController::class, 'storeSession']);
        Route::post('/sessions/{sessionId}/messages', [AiTriageController::class, 'storeMessage']);
    });
});
