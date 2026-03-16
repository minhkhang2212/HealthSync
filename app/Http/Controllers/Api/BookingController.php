<?php

namespace App\Http\Controllers\Api;

use App\DTO\BookingDTO;
use App\Helpers\TimeHelper;
use App\Http\Controllers\Controller;
use App\Services\BookingService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'doctorId' => 'required|integer|exists:users,id',
            'date' => 'required|date',
            'timeType' => ['required', 'string', Rule::in(TimeHelper::timeTypeKeys())],
        ]);

        $dto = new BookingDTO(
            $request->user()->id,
            $validated['doctorId'],
            $validated['date'],
            $validated['timeType'],
            'S1'
        );

        try {
            $booking = $this->bookingService->createBooking($dto);
            return response()->json($booking, 201);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
