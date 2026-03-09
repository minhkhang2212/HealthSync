<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;

class BookingController extends Controller
{
    public function index(): JsonResponse
    {
        $bookings = Booking::query()
            ->with([
                'patient:id,name,email',
                'doctor:id,name,email',
            ])
            ->orderByDesc('date')
            ->orderByDesc('timeType')
            ->get();

        return response()->json($bookings);
    }
}

