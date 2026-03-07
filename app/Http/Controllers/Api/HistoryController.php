<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\HistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistoryController extends Controller
{
    public function __construct(
        private readonly HistoryService $historyService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'bookingId' => 'required|integer|exists:booking,id',
            'description' => 'nullable|string',
            'files' => 'nullable|array',
        ]);

        $booking = Booking::find($validated['bookingId']);
        if (!$booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        if ($request->user()->roleId === 'R2' && $booking->doctorId !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($request->user()->roleId === 'R3' && $booking->patientId !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $history = $this->historyService->create([
            'bookingId' => $booking->id,
            'patientId' => $booking->patientId,
            'doctorId' => $booking->doctorId,
            'description' => $validated['description'] ?? null,
            'files' => isset($validated['files']) ? json_encode($validated['files']) : null,
        ]);

        return response()->json($history, 201);
    }

    public function show(int $bookingId, Request $request): JsonResponse
    {
        $history = $this->historyService->findByBookingId($bookingId);

        if (!$history) {
            return response()->json(['message' => 'History not found'], 404);
        }

        if ($request->user()->roleId === 'R2' && $history->doctorId !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($request->user()->roleId === 'R3' && $history->patientId !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($history);
    }
}
