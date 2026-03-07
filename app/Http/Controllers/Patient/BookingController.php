<?php

namespace App\Http\Controllers\Patient;

use App\DTO\BookingDTO;
use App\Http\Controllers\Controller;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class BookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService
    ) {}

    public function index(Request $request): JsonResponse
    {
        // Get bookings for the authenticated patient
        $patientId = $request->user()->id;
        $bookings = $this->bookingService->getByPatientId($patientId);
        
        return response()->json($bookings);
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $booking = $this->bookingService->find($id);
        
        if (!$booking || $booking->patientId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        return response()->json($booking);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'doctorId' => 'required|integer|exists:users,id',
            'date' => 'required|date',
            'timeType' => 'required|string',
        ]);

        $dto = new BookingDTO(
            $request->user()->id,
            $validated['doctorId'],
            $validated['date'],
            $validated['timeType'],
            'S1' // New
        );

        try {
            $booking = $this->bookingService->createBooking($dto);
            return response()->json($booking, 201);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function cancel(int $id, Request $request): JsonResponse
    {
        $booking = $this->bookingService->find($id);
        
        if (!$booking || $booking->patientId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        try {
            $booking = $this->bookingService->cancelBooking($id, $request->user()->id, 'R3');
            return response()->json($booking);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
