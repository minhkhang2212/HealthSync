<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class DoctorBookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $doctorId = $request->user()->id;
        $bookings = $this->bookingService->getByDoctorId($doctorId);
        
        return response()->json($bookings);
    }

    public function cancel(int $id, Request $request): JsonResponse
    {
        $booking = $this->bookingService->find($id);
        
        if (!$booking || $booking->doctorId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        try {
            $booking = $this->bookingService->cancelBooking($id, $request->user()->id, 'R2');
            return response()->json($booking);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function markDone(int $id, Request $request): JsonResponse
    {
        $booking = $this->bookingService->find($id);
        
        if (!$booking || $booking->doctorId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        $booking = $this->bookingService->update($id, ['statusId' => 'S3']); // S3 = Done

        return response()->json($booking);
    }

    public function markNoShow(int $id, Request $request): JsonResponse
    {
        $booking = $this->bookingService->find($id);
        
        if (!$booking || $booking->doctorId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        $booking = $this->bookingService->update($id, ['statusId' => 'S4']);

        return response()->json($booking);
    }
}
